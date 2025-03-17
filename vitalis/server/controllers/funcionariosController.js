const { pool } = require('../db');
const apiConfigController = require('./apiConfigController');

/**
 * Obtém a lista de funcionários do usuário
 */
exports.getFuncionarios = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { empresaId } = req.query;
    
    let query = `
      SELECT * FROM funcionarios 
      WHERE user_id = $1
    `;
    
    const params = [userId];
    
    if (empresaId) {
      query += ` AND codigo_empresa = $2`;
      params.push(empresaId);
    }
    
    query += ` ORDER BY nome`;
    
    const result = await pool.query(query, params);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Sincroniza dados de funcionários com a API SOC
 */
exports.syncFuncionarios = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { empresaId } = req.query;
    
    // Obter configurações da API
    const configResult = await pool.query(
      `SELECT codigo, chave
       FROM api_configurations
       WHERE user_id = $1 AND api_type = 'funcionario'`,
      [userId]
    );
    
    if (configResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Configurações da API de funcionários não encontradas'
      });
    }
    
    const config = configResult.rows[0];
    
    // Verificar se as configurações estão completas
    if (!config.codigo || !config.chave) {
      return res.status(400).json({
        success: false,
        message: 'Configurações da API de funcionários incompletas'
      });
    }
    
    let empresas = [];
    
    // Se não foi especificada uma empresa, buscar todas as empresas do usuário
    if (!empresaId) {
      const empresasResult = await pool.query(
        `SELECT codigo FROM empresas WHERE user_id = $1 AND ativo = true`,
        [userId]
      );
      
      if (empresasResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma empresa encontrada. Por favor, sincronize as empresas primeiro.'
        });
      }
      
      empresas = empresasResult.rows;
    } else {
      // Se uma empresa foi especificada, usar apenas ela
      empresas = [{ codigo: empresaId }];
    }
    
    // Iniciar transação
    const client = await pool.connect();
    let totalInserted = 0;
    let totalUpdated = 0;
    
    try {
      await client.query('BEGIN');
      
      // Para cada empresa, fazer uma requisição à API SOC
      for (const empresa of empresas) {
        // Preparar parâmetros para requisição à API SOC
        const parametros = {
          empresa: empresa.codigo, // Usar o código da empresa em vez da empresa principal
          codigo: config.codigo,
          chave: config.chave,
          tipoSaida: 'json',
          ativo: 'Sim'
        };
        
        // Fazer requisição à API SOC
        const funcionariosData = await apiConfigController.requestSocApi(parametros);
        
        // Processar os dados dos funcionários
        for (const funcionario of funcionariosData) {
          // Verificar se o funcionário já existe
          const checkResult = await client.query(
            `SELECT id FROM funcionarios
             WHERE user_id = $1 AND matricula_funcionario = $2`,
            [userId, funcionario.MATRICULAFUNCIONARIO]
          );
          
          // Converter datas
          const dataNascimento = funcionario.DATA_NASCIMENTO ? new Date(funcionario.DATA_NASCIMENTO) : null;
          const dataAdmissao = funcionario.DATA_ADMISSAO ? new Date(funcionario.DATA_ADMISSAO) : null;
          const dataDemissao = funcionario.DATA_DEMISSAO ? new Date(funcionario.DATA_DEMISSAO) : null;
          
          if (checkResult.rows.length === 0) {
            // Inserir novo funcionário
            await client.query(
              `INSERT INTO funcionarios (
                 user_id, codigo_empresa, nome_empresa, codigo, nome,
                 codigo_unidade, nome_unidade, codigo_setor, nome_setor,
                 codigo_cargo, nome_cargo, cbo_cargo, ccusto, nome_centro_custo,
                 matricula_funcionario, cpf, situacao, sexo,
                 data_nascimento, data_admissao, data_demissao
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
              [
                userId,
                funcionario.CODIGOEMPRESA,
                funcionario.NOMEEMPRESA,
                funcionario.CODIGO,
                funcionario.NOME,
                funcionario.CODIGOUNIDADE,
                funcionario.NOMEUNIDADE,
                funcionario.CODIGOSETOR,
                funcionario.NOMESETOR,
                funcionario.CODIGOCARGO,
                funcionario.NOMECARGO,
                funcionario.CBOCARGO,
                funcionario.CCUSTO,
                funcionario.NOMECENTROCUSTO,
                funcionario.MATRICULAFUNCIONARIO,
                funcionario.CPF,
                funcionario.SITUACAO,
                funcionario.SEXO,
                dataNascimento,
                dataAdmissao,
                dataDemissao
              ]
            );
            
            totalInserted++;
          } else {
            // Atualizar funcionário existente
            await client.query(
              `UPDATE funcionarios SET
                 codigo_empresa = $2,
                 nome_empresa = $3,
                 codigo = $4,
                 nome = $5,
                 codigo_unidade = $6,
                 nome_unidade = $7,
                 codigo_setor = $8,
                 nome_setor = $9,
                 codigo_cargo = $10,
                 nome_cargo = $11,
                 cbo_cargo = $12,
                 ccusto = $13,
                 nome_centro_custo = $14,
                 cpf = $16,
                 situacao = $17,
                 sexo = $18,
                 data_nascimento = $19,
                 data_admissao = $20,
                 data_demissao = $21,
                 updated_at = CURRENT_TIMESTAMP
               WHERE user_id = $1 AND matricula_funcionario = $15`,
              [
                userId,
                funcionario.CODIGOEMPRESA,
                funcionario.NOMEEMPRESA,
                funcionario.CODIGO,
                funcionario.NOME,
                funcionario.CODIGOUNIDADE,
                funcionario.NOMEUNIDADE,
                funcionario.CODIGOSETOR,
                funcionario.NOMESETOR,
                funcionario.CODIGOCARGO,
                funcionario.NOMECARGO,
                funcionario.CBOCARGO,
                funcionario.CCUSTO,
                funcionario.NOMECENTROCUSTO,
                funcionario.MATRICULAFUNCIONARIO,
                funcionario.CPF,
                funcionario.SITUACAO,
                funcionario.SEXO,
                dataNascimento,
                dataAdmissao,
                dataDemissao
              ]
            );
            
            totalUpdated++;
          }
        }
      }
      
      await client.query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: 'Sincronização de funcionários concluída com sucesso',
        count: totalInserted + totalUpdated,
        inserted: totalInserted,
        updated: totalUpdated
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao sincronizar funcionários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar funcionários',
      error: error.message
    });
  }
};

/**
 * Busca um funcionário específico
 */
exports.getFuncionario = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const funcionarioId = req.params.id;
    
    const result = await pool.query(
      `SELECT * FROM funcionarios
       WHERE user_id = $1 AND id = $2`,
      [userId, funcionarioId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Funcionário não encontrado'
      });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
