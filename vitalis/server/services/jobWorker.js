const { pool } = require('../db');
const jobQueueService = require('./jobQueueService');
const apiConfigController = require('../controllers/apiConfigController');

// Flag para evitar múltiplas instâncias do worker
let isWorkerRunning = false;

// Função de delay para controle de tráfego
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Processa um job específico
 */
async function processJob(job) {
  try {
    console.log(`Iniciando job ${job.id} do tipo ${job.job_type}`);
    
    // Atualizar status do job para processing
    await jobQueueService.updateJobStatus(job.id, 'processing');
    
    // Analisar parâmetros do job
    const params = job.params ? 
      (typeof job.params === 'string' ? JSON.parse(job.params) : job.params) : 
      {};
    
    // Processar o job com base no tipo
    let result;
    switch (job.job_type) {
      case 'funcionario':
        result = await processFuncionarioJob(job.id, params);
        break;
      case 'absenteismo':
        result = await processAbsenteismoJob(job.id, params);
        break;
      default:
        throw new Error(`Tipo de job desconhecido: ${job.job_type}`);
    }
    
    // Atualizar status do job para concluído
    await jobQueueService.updateJobStatus(job.id, 'completed', {
      result,
      progress: 100
    });
    
    console.log(`Job ${job.id} concluído com sucesso`);
    return result;
  } catch (error) {
    console.error(`Erro no processamento do job ${job.id}:`, error);
    
    // Atualizar status do job para falha
    await jobQueueService.updateJobStatus(job.id, 'failed', {
      error_message: error.message || 'Erro desconhecido'
    });
    
    throw error;
  }
}

/**
 * Processa job de sincronização de funcionários
 */
async function processFuncionarioJob(jobId, params) {
  const userId = params.userId;
  const empresaId = params.empresaId;
  
  // Obter configuração da API
  const configResult = await pool.query(
    `SELECT codigo, chave, empresa_padrao,
            ativo, inativo, afastado, pendente, ferias
     FROM api_configurations
     WHERE user_id = $1 AND api_type = 'funcionario'`,
    [userId]
  );
  
  if (configResult.rows.length === 0) {
    throw new Error('Configuração da API não encontrada');
  }
  
  const config = configResult.rows[0];
  
  // Validar configuração
  if (!config.codigo || !config.chave || !config.empresa_padrao) {
    throw new Error('Configuração da API incompleta');
  }
  
  // Atualizar progresso do job
  await jobQueueService.updateJobStatus(jobId, 'processing', {
    progress: 10
  });
  
  // Usar a empresa padrão
  const empresa = { codigo: config.empresa_padrao };
  
  try {
    // Preparar parâmetros da requisição à API
    const apiParams = {
      empresa: empresa.codigo,
      codigo: config.codigo,
      chave: config.chave,
      tipoSaida: 'json',
      ativo: config.ativo === 'Sim' ? 'Sim' : '',
      inativo: config.inativo === 'Sim' ? 'Sim' : '',
      afastado: config.afastado === 'Sim' ? 'Sim' : '',
      pendente: config.pendente === 'Sim' ? 'Sim' : '',
      ferias: config.ferias === 'Sim' ? 'Sim' : ''
    };
    
    // Solicitar dados da API SOC
    const funcionariosData = await apiConfigController.requestSocApi(apiParams);
    
    // Atualizar progresso do job
    await jobQueueService.updateJobStatus(jobId, 'processing', {
      progress: 50,
      total_records: funcionariosData.length
    });
    
    // Processar funcionários em lotes
    const { inserted, updated } = await processEmployeeBatch(userId, funcionariosData);
    
    return {
      success: true,
      message: 'Sincronização de funcionários concluída',
      count: funcionariosData.length,
      inserted: inserted,
      updated: updated
    };
  } catch (error) {
    console.error(`Erro ao processar empresa ${empresa.codigo}:`, error);
    throw error;
  }
}

/**
 * Processa funcionários em lotes
 */
async function processEmployeeBatch(userId, funcionariosData) {
  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;
  
  try {
    await client.query('BEGIN');
    
    // Processar em lotes menores
    const batchSize = 50;
    for (let i = 0; i < funcionariosData.length; i += batchSize) {
      const batch = funcionariosData.slice(i, i + batchSize);
      
      for (const funcionario of batch) {
        // Verificar se o funcionário já existe
        const checkResult = await client.query(
          `SELECT id FROM funcionarios
           WHERE user_id = $1 AND matricula_funcionario = $2`,
          [userId, funcionario.MATRICULAFUNCIONARIO]
        );
        
        // Converter datas
        const converterData = (dataStr) => {
          if (!dataStr) return null;
          const data = new Date(dataStr);
          return isNaN(data.getTime()) ? null : data;
        };
        
        const dataNascimento = converterData(funcionario.DATA_NASCIMENTO);
        const dataAdmissao = converterData(funcionario.DATA_ADMISSAO);
        const dataDemissao = converterData(funcionario.DATA_DEMISSAO);
        
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
          
          inserted++;
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
          
          updated++;
        }
      }
      
      // Pequeno delay para reduzir a pressão no banco de dados
      await delay(50);
    }
    
    await client.query('COMMIT');
    
    return { inserted, updated };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Processa job de sincronização de absenteísmo
 */
async function processAbsenteismoJob(jobId, params) {
  const userId = params.userId;
  const dataInicio = params.dataInicio;
  const dataFim = params.dataFim;
  const empresaId = params.empresaId;
  
  // Atualizar progresso do job
  await jobQueueService.updateJobStatus(jobId, 'processing', {
    progress: 10
  });
  
  // Obter configuração da API
  const configResult = await pool.query(
    `SELECT codigo, chave, empresa_padrao
     FROM api_configurations
     WHERE user_id = $1 AND api_type = 'absenteismo'`,
    [userId]
  );
  
  if (configResult.rows.length === 0) {
    throw new Error('Configuração da API não encontrada');
  }
  
  const config = configResult.rows[0];
  
  // Validar configuração
  if (!config.codigo || !config.chave || !config.empresa_padrao) {
    throw new Error('Configuração da API incompleta');
  }
  
  // Usar empresa padrão se não especificada
  const empresaCodigo = empresaId || config.empresa_padrao;
  
  // Iniciar transação
  const client = await pool.connect();
  let totalInserted = 0;
  
  try {
    await client.query('BEGIN');
    
    // Limpar dados existentes no período especificado
    await client.query(
      `DELETE FROM absenteismo
       WHERE user_id = $1
         AND dt_inicio_atestado >= $2
         AND dt_inicio_atestado <= $3`,
      [userId, dataInicio, dataFim]
    );
    
    // Preparar parâmetros para requisição à API
    const apiParams = {
      empresa: empresaCodigo,
      codigo: config.codigo,
      chave: config.chave,
      tipoSaida: 'json',
      dataInicio: dataInicio,
      dataFim: dataFim
    };
    
    // Solicitar dados da API SOC
    const absenteismoData = await apiConfigController.requestSocApi(apiParams);
    
    // Atualizar progresso do job
    await jobQueueService.updateJobStatus(jobId, 'processing', {
      progress: 50,
      total_records: absenteismoData.length,
      processed_records: 0
    });
    
    // Processar dados de absenteísmo
    for (let i = 0; i < absenteismoData.length; i++) {
      const absenteismo = absenteismoData[i];
      
      // Converter datas
      const dtNascimento = absenteismo.DT_NASCIMENTO ? new Date(absenteismo.DT_NASCIMENTO) : null;
      const dtInicioAtestado = absenteismo.DT_INICIO_ATESTADO ? new Date(absenteismo.DT_INICIO_ATESTADO) : null;
      const dtFimAtestado = absenteismo.DT_FIM_ATESTADO ? new Date(absenteismo.DT_FIM_ATESTADO) : null;
      
      // Inserir registro de absenteísmo
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
      
      totalInserted++;
      
      // Atualizar progresso a cada 10 registros
      if (i % 10 === 0) {
        await jobQueueService.updateJobStatus(jobId, 'processing', {
          progress: 50 + Math.floor((i / absenteismoData.length) * 50),
          processed_records: i
        });
      }
    }
    
    await client.query('COMMIT');
    
    return {
      success: true,
      message: 'Sincronização de absenteísmo concluída',
      count: totalInserted,
      periodo: {
        dataInicio,
        dataFim
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Loop principal do worker
 */
async function runWorker() {
  if (isWorkerRunning) {
    return;
  }
  
  isWorkerRunning = true;
  
  try {
    // Obter jobs pendentes
    const pendingJobs = await jobQueueService.getPendingJobs(5);
    
    if (pendingJobs.length > 0) {
      console.log(`Encontrados ${pendingJobs.length} jobs pendentes para processar`);
    }
    
    // Processar jobs sequencialmente
    for (const job of pendingJobs) {
      try {
        // Pular jobs do tipo 'empresa'
        if (job.job_type === 'empresa') {
          await jobQueueService.updateJobStatus(job.id, 'failed', {
            error_message: 'Sincronização de empresas não é mais suportada'
          });
          console.log(`Job de empresa ${job.id} ignorado (não suportado)`);
          continue;
        }
        
        await processJob(job);
      } catch (error) {
        console.error(`Erro no job ${job.id}:`, error);
        // Continuar com o próximo job
      }
    }
  } catch (error) {
    console.error('Erro no worker:', error);
  } finally {
    isWorkerRunning = false;
    
    // Agendar a próxima execução
    setTimeout(runWorker, 5000); // Executar a cada 5 segundos
  }
}

// Iniciar o worker
exports.startWorker = function() {
  console.log('Iniciando worker de processamento de jobs de sincronização...');
  runWorker();
};

// Exportar para testes
exports.processJob = processJob;
