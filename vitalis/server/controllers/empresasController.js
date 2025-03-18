const { pool } = require('../db');
const apiConfigController = require('./apiConfigController');
const jobQueueService = require('../services/jobQueueService');

/**
 * Obtém a lista de empresas do usuário
 */
exports.getEmpresas = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT * FROM empresas 
       WHERE user_id = $1
       ORDER BY razao_social`,
      [userId]
    );
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Queues a job to synchronize companies data
 */
exports.syncEmpresas = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Create new job in the queue
    const jobId = await jobQueueService.createJob(userId, 'empresa', {
      userId
    });
    
    res.status(202).json({
      success: true,
      message: 'Company synchronization job added to queue',
      jobId
    });
  } catch (error) {
    console.error('Error queuing empresa sync job:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating synchronization job',
      error: error.message
    });
  }
};

/**
 * Original synchronization method (kept for reference)
 * This will be replaced by the job worker
 */
exports.syncEmpresasOriginal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Obter configurações da API
    const configResult = await pool.query(
      `SELECT empresa_principal, codigo, chave
       FROM api_configurations
       WHERE user_id = $1 AND api_type = 'empresa'`,
      [userId]
    );
    
    if (configResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Configurações da API de empresas não encontradas'
      });
    }
    
    const config = configResult.rows[0];
    
    // Verificar se as configurações estão completas
    if (!config.empresa_principal || !config.codigo || !config.chave) {
      return res.status(400).json({
        success: false,
        message: 'Configurações da API de empresas incompletas'
      });
    }
    
    // Preparar parâmetros para requisição à API SOC
    const parametros = {
      empresa: config.empresa_principal,
      codigo: config.codigo,
      chave: config.chave,
      tipoSaida: 'json'
    };
    
    // Fazer requisição à API SOC
    const empresasData = await apiConfigController.requestSocApi(parametros);
    
    // Iniciar transação
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let countInserted = 0;
      let countUpdated = 0;
      
      for (const empresa of empresasData) {
        // Verificar se a empresa já existe
        const checkResult = await client.query(
          `SELECT id FROM empresas
           WHERE user_id = $1 AND codigo = $2`,
          [userId, empresa.CODIGO]
        );
        
        // CORREÇÃO: Tratar campo ATIVO como valor numérico (1 = ativo, 0 = inativo)
        const ativoValor = empresa.ATIVO === 1 || empresa.ATIVO === '1';
        
        if (checkResult.rows.length === 0) {
          // Inserir nova empresa
          await client.query(
            `INSERT INTO empresas (
               user_id, codigo, nome_abreviado, razao_social, endereco,
               numero_endereco, complemento_endereco, bairro, cidade, cep, uf,
               cnpj, inscricao_estadual, inscricao_municipal, ativo,
               codigo_cliente_integracao
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
              userId,
              empresa.CODIGO,
              empresa.NOMEABREVIADO,
              empresa.RAZAOSOCIAL,
              empresa.ENDERECO,
              empresa.NUMEROENDERECO,
              empresa.COMPLEMENTOENDERECO,
              empresa.BAIRRO,
              empresa.CIDADE,
              empresa.CEP,
              empresa.UF,
              empresa.CNPJ,
              empresa.INSCRICAOESTADUAL,
              empresa.INSCRICAOMUNICIPAL,
              ativoValor,
              empresa.CODIGOCLIENTEINTEGRACAO
            ]
          );
          
          countInserted++;
        } else {
          // Atualizar empresa existente
          await client.query(
            `UPDATE empresas SET
               nome_abreviado = $3,
               razao_social = $4,
               endereco = $5,
               numero_endereco = $6,
               complemento_endereco = $7,
               bairro = $8,
               cidade = $9,
               cep = $10,
               uf = $11,
               cnpj = $12,
               inscricao_estadual = $13,
               inscricao_municipal = $14,
               ativo = $15,
               codigo_cliente_integracao = $16,
               updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND codigo = $2`,
            [
              userId,
              empresa.CODIGO,
              empresa.NOMEABREVIADO,
              empresa.RAZAOSOCIAL,
              empresa.ENDERECO,
              empresa.NUMEROENDERECO,
              empresa.COMPLEMENTOENDERECO,
              empresa.BAIRRO,
              empresa.CIDADE,
              empresa.CEP,
              empresa.UF,
              empresa.CNPJ,
              empresa.INSCRICAOESTADUAL,
              empresa.INSCRICAOMUNICIPAL,
              ativoValor,
              empresa.CODIGOCLIENTEINTEGRACAO
            ]
          );
          
          countUpdated++;
        }
      }
      
      await client.query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: 'Sincronização de empresas concluída com sucesso',
        count: empresasData.length,
        inserted: countInserted,
        updated: countUpdated
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao sincronizar empresas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar empresas',
      error: error.message
    });
  }
};

/**
 * Busca uma empresa específica
 */
exports.getEmpresa = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const empresaId = req.params.id;
    
    const result = await pool.query(
      `SELECT * FROM empresas
       WHERE user_id = $1 AND id = $2`,
      [userId, empresaId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Empresa não encontrada'
      });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
