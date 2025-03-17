const { pool } = require('../db');
const apiConfigController = require('./apiConfigController');
const { format, subMonths } = require('date-fns');

/**
 * Obtém dados de absenteísmo
 */
exports.getAbsenteismo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { dataInicio, dataFim, empresaId } = req.query;
    
    // Validar datas
    if (!dataInicio || !dataFim) {
      return res.status(400).json({
        message: 'Os parâmetros dataInicio e dataFim são obrigatórios'
      });
    }
    
    // Construir consulta
    let query = `
      SELECT a.*, f.nome, f.codigo_setor, f.nome_setor, f.codigo_cargo, f.nome_cargo
      FROM absenteismo a
      JOIN funcionarios f ON a.user_id = f.user_id AND a.matricula_func = f.matricula_funcionario
      WHERE a.user_id = $1
        AND a.dt_inicio_atestado >= $2
        AND a.dt_inicio_atestado <= $3
    `;
    
    const params = [userId, dataInicio, dataFim];
    
    // Adicionar filtro de empresa se especificado
    if (empresaId) {
      query += ` AND f.codigo_empresa = $4`;
      params.push(empresaId);
    }
    
    query += ` ORDER BY a.dt_inicio_atestado DESC`;
    
    const result = await pool.query(query, params);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Sincroniza dados de absenteísmo com a API SOC
 */
exports.syncAbsenteismo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { dataInicio, dataFim, empresaId } = req.body;
    
    // Validar datas
    const hoje = new Date();
    const defaultDataInicio = format(subMonths(hoje, 2), 'yyyy-MM-dd');
    const defaultDataFim = format(hoje, 'yyyy-MM-dd');
    
    const dataInicioSinc = dataInicio || defaultDataInicio;
    const dataFimSinc = dataFim || defaultDataFim;
    
    // Obter configurações da API
    const configResult = await pool.query(
      `SELECT empresa_principal, codigo, chave
       FROM api_configurations
       WHERE user_id = $1 AND api_type = 'absenteismo'`,
      [userId]
    );
    
    if (configResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Configurações da API de absenteísmo não encontradas'
      });
    }
    
    const config = configResult.rows[0];
    
    // Verificar se as configurações estão completas
    if (!config.empresa_principal || !config.codigo || !config.chave) {
      return res.status(400).json({
        success: false,
        message: 'Configurações da API de absenteísmo incompletas'
      });
    }
    
    // Preparar parâmetros para requisição à API SOC
    const parametros = {
      empresa: config.empresa_principal,
      codigo: config.codigo,
      chave: config.chave,
      tipoSaida: 'json',
      dataInicio: dataInicioSinc,
      dataFim: dataFimSinc
    };
    
    // Adicionar filtro de empresa se especificado
    if (empresaId) {
      parametros.empresaTrabalho = empresaId;
    }
    
    // Fazer requisição à API SOC
    const absenteismoData = await apiConfigController.requestSocApi(parametros);
    
    // Iniciar transação
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Limpar dados existentes no período
      await client.query(
        `DELETE FROM absenteismo
         WHERE user_id = $1
           AND dt_inicio_atestado >= $2
           AND dt_inicio_atestado <= $3`,
        [userId, dataInicioSinc, dataFimSinc]
      );
      
      let countInserted = 0;
      
      for (const absenteismo of absenteismoData) {
        // Converter datas
        const dtNascimento = absenteismo.DT_NASCIMENTO ? new Date(absenteismo.DT_NASCIMENTO) : null;
        const dtInicioAtestado = absenteismo.DT_INICIO_ATESTADO ? new Date(absenteismo.DT_INICIO_ATESTADO) : null;
        const dtFimAtestado = absenteismo.DT_FIM_ATESTADO ? new Date(absenteismo.DT_FIM_ATESTADO) : null;
        
        // Inserir dados de absenteísmo
        await client.query(
          `INSERT INTO absenteismo (
             user_id, unidade, setor, matricula_func, dt_nascimento, sexo,
             tipo_atestado, dt_inicio_atestado, dt_fim_atestado,
             hora_inicio_atestado, hora_fim_atestado, dias_afastados,
             horas_afastado, cid_principal, descricao_cid, grupo_patologico,
             tipo_licenca
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            userId,
            absenteismo.UNIDADE,
            absenteismo.SETOR,
            absenteismo.MATRICULA_FUNC,
            dtNascimento,
            absenteismo.SEXO,
            absenteismo.TIPO_ATESTADO,
            dtInicioAtestado,
            dtFimAtestado,
            absenteismo.HORA_INICIO_ATESTADO,
            absenteismo.HORA_FIM_ATESTADO,
            absenteismo.DIAS_AFASTADOS,
            absenteismo.HORAS_AFASTADO,
            absenteismo.CID_PRINCIPAL,
            absenteismo.DESCRICAO_CID,
            absenteismo.GRUPO_PATOLOGICO,
            absenteismo.TIPO_LICENCA
          ]
        );
        
        countInserted++;
      }
      
      await client.query('COMMIT');
      
      res.status(200).json({
        success: true,
        message: 'Sincronização de absenteísmo concluída com sucesso',
        count: countInserted,
        periodo: {
          dataInicio: dataInicioSinc,
          dataFim: dataFimSinc
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao sincronizar absenteísmo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar absenteísmo',
      error: error.message
    });
  }
};

/**
 * Obtém dados para o dashboard de absenteísmo
 */
exports.getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { dataInicio, dataFim, empresaId } = req.query;
    
    // Validar datas
    if (!dataInicio || !dataFim) {
      return res.status(400).json({
        message: 'Os parâmetros dataInicio e dataFim são obrigatórios'
      });
    }
    
    // Parâmetros para as consultas
    const params = [userId, dataInicio, dataFim];
    let empresaFilter = '';
    
    if (empresaId) {
      empresaFilter = 'AND f.codigo_empresa = $4';
      params.push(empresaId);
    }
    
    // Constantes para cálculos
    const MEDIA_HORAS_TRABALHADAS_MES = 176; // 8h x 22 dias
    const MEDIA_SALARIO_BR = 2800; // Valor médio do salário no Brasil
    const VALOR_HORA = MEDIA_SALARIO_BR / MEDIA_HORAS_TRABALHADAS_MES;
    
    // 1. Dados gerais de absenteísmo
    const queryGeral = `
      SELECT 
        COUNT(DISTINCT a.id) AS total_atestados,
        SUM(a.dias_afastados) AS total_dias_afastados,
        COUNT(DISTINCT a.matricula_func) AS total_funcionarios_afastados
      FROM absenteismo a
      JOIN funcionarios f ON a.user_id = f.user_id AND a.matricula_func = f.matricula_funcionario
      WHERE a.user_id = $1
        AND a.dt_inicio_atestado >= $2
        AND a.dt_inicio_atestado <= $3
        ${empresaFilter}
    `;
    
    // 2. Dados de afastamento por setor
    const querySetores = `
      SELECT 
        f.nome_setor,
        COUNT(a.id) AS quantidade_atestados,
        SUM(a.dias_afastados) AS total_dias_afastados
      FROM absenteismo a
      JOIN funcionarios f ON a.user_id = f.user_id AND a.matricula_func = f.matricula_funcionario
      WHERE a.user_id = $1
        AND a.dt_inicio_atestado >= $2
        AND a.dt_inicio_atestado <= $3
        ${empresaFilter}
      GROUP BY f.nome_setor
      ORDER BY total_dias_afastados DESC
      LIMIT 10
    `;
    
    // 3. Dados de afastamento por CID
    const queryCids = `
      SELECT 
        a.cid_principal,
        a.descricao_cid,
        COUNT(a.id) AS quantidade_atestados,
        SUM(a.dias_afastados) AS total_dias_afastados
      FROM absenteismo a
      JOIN funcionarios f ON a.user_id = f.user_id AND a.matricula_func = f.matricula_funcionario
      WHERE a.user_id = $1
        AND a.dt_inicio_atestado >= $2
        AND a.dt_inicio_atestado <= $3
        ${empresaFilter}
        AND a.cid_principal IS NOT NULL
      GROUP BY a.cid_principal, a.descricao_cid
      ORDER BY quantidade_atestados DESC
      LIMIT 10
    `;
    
    // 4. Evolução mensal de absenteísmo
    const queryEvolucao = `
      SELECT 
        TO_CHAR(a.dt_inicio_atestado, 'YYYY-MM') AS mes,
        COUNT(a.id) AS quantidade_atestados,
        SUM(a.dias_afastados) AS total_dias_afastados
      FROM absenteismo a
      JOIN funcionarios f ON a.user_id = f.user_id AND a.matricula_func = f.matricula_funcionario
      WHERE a.user_id = $1
        AND a.dt_inicio_atestado >= $2
        AND a.dt_inicio_atestado <= $3
        ${empresaFilter}
      GROUP BY TO_CHAR(a.dt_inicio_atestado, 'YYYY-MM')
      ORDER BY mes
    `;
    
    // 5. Dados por gênero (premium)
    const queryGenero = `
      SELECT 
        CASE 
          WHEN a.sexo = 1 THEN 'Masculino'
          WHEN a.sexo = 2 THEN 'Feminino'
          ELSE 'Não informado'
        END AS genero,
        COUNT(a.id) AS quantidade_atestados,
        SUM(a.dias_afastados) AS total_dias_afastados
      FROM absenteismo a
      JOIN funcionarios f ON a.user_id = f.user_id AND a.matricula_func = f.matricula_funcionario
      WHERE a.user_id = $1
        AND a.dt_inicio_atestado >= $2
        AND a.dt_inicio_atestado <= $3
        ${empresaFilter}
      GROUP BY genero
      ORDER BY quantidade_atestados DESC
    `;
    
    // 6. Afastamentos por dia da semana (premium)
    const queryDiaSemana = `
      SELECT 
        TO_CHAR(a.dt_inicio_atestado, 'D') AS dia_semana_num,
        TO_CHAR(a.dt_inicio_atestado, 'Day') AS dia_semana,
        COUNT(a.id) AS quantidade_atestados
      FROM absenteismo a
      JOIN funcionarios f ON a.user_id = f.user_id AND a.matricula_func = f.matricula_funcionario
      WHERE a.user_id = $1
        AND a.dt_inicio_atestado >= $2
        AND a.dt_inicio_atestado <= $3
        ${empresaFilter}
      GROUP BY dia_semana_num, dia_semana
      ORDER BY dia_semana_num
    `;
    
    // 7. Total de funcionários ativos
    const queryTotalFuncionarios = `
      SELECT COUNT(DISTINCT id) AS total_funcionarios
      FROM funcionarios
      WHERE user_id = $1
        AND situacao = 'Ativo'
        ${empresaFilter}
    `;
    
    // Executar consultas em paralelo
    const [
      geralResult,
      setoresResult,
      cidsResult,
      evolucaoResult,
      generoResult,
      diaSemanaResult,
      totalFuncionariosResult
    ] = await Promise.all([
      pool.query(queryGeral, params),
      pool.query(querySetores, params),
      pool.query(queryCids, params),
      pool.query(queryEvolucao, params),
      pool.query(queryGenero, params),
      pool.query(queryDiaSemana, params),
      pool.query(queryTotalFuncionarios, params.slice(0, empresaId ? 4 : 1))
    ]);
    
    // Processar dados para cálculos
    const dadosGerais = geralResult.rows[0];
    const totalFuncionarios = totalFuncionariosResult.rows[0].total_funcionarios;
    const totalHorasAfastamento = dadosGerais.total_dias_afastados * 8; // 8 horas por dia
    const taxaAbsenteismo = (totalHorasAfastamento / (totalFuncionarios * MEDIA_HORAS_TRABALHADAS_MES)) * 100;
    const prejuizoTotal = totalHorasAfastamento * VALOR_HORA;
    
    // Formatar evolução mensal com nomes dos meses
    const evolucaoMensal = evolucaoResult.rows.map(item => {
      const [ano, mes] = item.mes.split('-');
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const nomeMes = meses[parseInt(mes) - 1];
      
      return {
        month: `${nomeMes}/${ano}`,
        value: parseInt(item.total_dias_afastados)
      };
    });
    
    // Formatar dados para retorno
    const dashboardData = {
      indicadores: {
        taxaAbsenteismo: taxaAbsenteismo.toFixed(2),
        prejuizoTotal: prejuizoTotal.toFixed(2),
        totalDiasAfastamento: dadosGerais.total_dias_afastados,
        totalHorasAfastamento,
        totalAtestados: dadosGerais.total_atestados,
        totalFuncionariosAfastados: dadosGerais.total_funcionarios_afastados,
        totalFuncionarios
      },
      setoresMaisAfetados: setoresResult.rows.map(setor => ({
        name: setor.nome_setor || 'Não informado',
        value: parseInt(setor.total_dias_afastados) * 8 // Convertendo para horas
      })),
      topCids: cidsResult.rows.map(cid => {
        const cidLabel = cid.cid_principal ? 
          `${cid.cid_principal} - ${cid.descricao_cid?.substring(0, 30) || 'Não informado'}` : 
          'Não informado';
          
        return {
          name: cidLabel,
          value: parseInt(cid.quantidade_atestados)
        };
      }),
      evolucaoMensal,
      distribuicaoPorSexo: generoResult.rows.map(item => ({
        name: item.genero,
        value: parseInt(item.quantidade_atestados)
      })),
      distribuicaoPorDiaSemana: diaSemanaResult.rows.map(item => {
        const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const diaSemana = dias[parseInt(item.dia_semana_num) - 1];
        
        return {
          name: diaSemana,
          value: parseInt(item.quantidade_atestados)
        };
      }),
      prejuizoPorCid: cidsResult.rows.map(cid => {
        const cidLabel = cid.cid_principal ? 
          `${cid.cid_principal} - ${cid.descricao_cid?.substring(0, 30) || 'Não informado'}` : 
          'Não informado';
          
        return {
          name: cidLabel,
          value: parseInt(cid.total_dias_afastados) * 8 * VALOR_HORA
        };
      })
    };
    
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Erro ao obter dados do dashboard:', error);
    next(error);
  }
};
