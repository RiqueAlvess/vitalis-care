const { pool } = require('../db');
const jobQueueService = require('./jobQueueService');
const apiConfigController = require('../controllers/apiConfigController');

// Flag to prevent multiple worker instances
let isWorkerRunning = false;

// Delay function for throttling
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Process a specific job
 */
async function processJob(job) {
  try {
    console.log(`Starting job ${job.id} of type ${job.job_type}`);
    
    // Update job status to processing
    await jobQueueService.updateJobStatus(job.id, 'processing');
    
    // Parse job parameters
    const params = job.params ? 
      (typeof job.params === 'string' ? JSON.parse(job.params) : job.params) : 
      {};
    
    // Process the job based on its type
    let result;
    switch (job.job_type) {
      case 'empresa':
        result = await processEmpresaJob(job.id, params);
        break;
      case 'funcionario':
        result = await processFuncionarioJob(job.id, params);
        break;
      case 'absenteismo':
        result = await processAbsenteismoJob(job.id, params);
        break;
      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }
    
    // Update job status to completed
    await jobQueueService.updateJobStatus(job.id, 'completed', {
      result,
      progress: 100
    });
    
    console.log(`Completed job ${job.id} successfully`);
    return result;
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    
    // Update job status to failed
    await jobQueueService.updateJobStatus(job.id, 'failed', {
      error_message: error.message || 'Unknown error'
    });
    
    throw error;
  }
}

/**
 * Process empresa synchronization job
 */
async function processEmpresaJob(jobId, params) {
  const userId = params.userId;
  
  // Get API configuration
  const configResult = await pool.query(
    `SELECT empresa_principal, codigo, chave
     FROM api_configurations
     WHERE user_id = $1 AND api_type = 'empresa'`,
    [userId]
  );
  
  if (configResult.rows.length === 0) {
    throw new Error('API configuration not found');
  }
  
  const config = configResult.rows[0];
  
  // Validate configuration
  if (!config.empresa_principal || !config.codigo || !config.chave) {
    throw new Error('Incomplete API configuration');
  }
  
  // Update job with progress
  await jobQueueService.updateJobStatus(jobId, 'processing', {
    progress: 10,
    total_records: -1
  });
  
  // Prepare API request parameters
  const apiParams = {
    empresa: config.empresa_principal,
    codigo: config.codigo,
    chave: config.chave,
    tipoSaida: 'json'
  };
  
  // Request data from SOC API
  const empresasData = await apiConfigController.requestSocApi(apiParams);
  
  // Update job progress
  await jobQueueService.updateJobStatus(jobId, 'processing', {
    progress: 40,
    total_records: empresasData.length,
    processed_records: 0
  });
  
  // Process companies
  const client = await pool.connect();
  let countInserted = 0;
  let countUpdated = 0;
  
  try {
    await client.query('BEGIN');
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < empresasData.length; i += batchSize) {
      const batch = empresasData.slice(i, i + batchSize);
      
      for (const empresa of batch) {
        // Check if the company already exists
        const checkResult = await client.query(
          `SELECT id FROM empresas
           WHERE user_id = $1 AND codigo = $2`,
          [userId, empresa.CODIGO]
        );
        
        // Convert active status (1 = active, 0 = inactive)
        const ativoValor = empresa.ATIVO === 1 || empresa.ATIVO === '1';
        
        if (checkResult.rows.length === 0) {
          // Insert new company
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
          // Update existing company
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
      
      // Update job progress
      const progress = Math.min(40 + Math.floor((i + batch.length) / empresasData.length * 60), 99);
      await jobQueueService.updateJobStatus(jobId, 'processing', {
        progress,
        processed_records: i + batch.length
      });
      
      // Short delay to reduce database pressure
      await delay(100);
    }
    
    await client.query('COMMIT');
    
    return {
      success: true,
      message: 'Company synchronization completed successfully',
      count: empresasData.length,
      inserted: countInserted,
      updated: countUpdated
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Process funcionario synchronization job
 */
async function processFuncionarioJob(jobId, params) {
  const userId = params.userId;
  const empresaId = params.empresaId;
  
  // Get API configuration
  const configResult = await pool.query(
    `SELECT codigo, chave, 
            ativo, inativo, afastado, pendente, ferias
     FROM api_configurations
     WHERE user_id = $1 AND api_type = 'funcionario'`,
    [userId]
  );
  
  if (configResult.rows.length === 0) {
    throw new Error('API configuration not found');
  }
  
  const config = configResult.rows[0];
  
  // Validate configuration
  if (!config.codigo || !config.chave) {
    throw new Error('Incomplete API configuration');
  }
  
  // Determine which companies to process
  let empresas = [];
  
  // Update job progress
  await jobQueueService.updateJobStatus(jobId, 'processing', {
    progress: 10
  });
  
  // If no company specified, get all active companies
  if (!empresaId) {
    const empresasResult = await pool.query(
      `SELECT codigo FROM empresas 
       WHERE user_id = $1 AND ativo = true`,
      [userId]
    );
    
    if (empresasResult.rows.length === 0) {
      throw new Error('No companies found. Please synchronize companies first.');
    }
    
    empresas = empresasResult.rows;
  } else {
    // Use specified company
    empresas = [{ codigo: empresaId }];
  }
  
  // Update job with total companies
  await jobQueueService.updateJobStatus(jobId, 'processing', {
    total_records: empresas.length
  });
  
  let totalCount = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  
  // Process each company
  for (let i = 0; i < empresas.length; i++) {
    const empresa = empresas[i];
    
    try {
      // Update job progress for this company
      await jobQueueService.updateJobStatus(jobId, 'processing', {
        progress: 10 + Math.floor((i / empresas.length) * 90),
        processed_records: i
      });
      
      // Prepare API request parameters
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
      
      // Request data from SOC API
      const funcionariosData = await apiConfigController.requestSocApi(apiParams);
      
      // Process employees in batches
      const { inserted, updated } = await processEmployeeBatch(userId, funcionariosData);
      
      totalCount += funcionariosData.length;
      totalInserted += inserted;
      totalUpdated += updated;
      
      // Allow some time between companies to avoid overwhelming the API
      await delay(500);
    } catch (error) {
      console.error(`Error processing company ${empresa.codigo}:`, error);
      // Continue with next company instead of failing the whole job
    }
  }
  
  return {
    success: true,
    message: 'Employee synchronization completed',
    count: totalCount,
    inserted: totalInserted,
    updated: totalUpdated
  };
}

/**
 * Process funcionarios in batches
 */
async function processEmployeeBatch(userId, funcionariosData) {
  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;
  
  try {
    await client.query('BEGIN');
    
    // Process in smaller batches
    const batchSize = 50;
    for (let i = 0; i < funcionariosData.length; i += batchSize) {
      const batch = funcionariosData.slice(i, i + batchSize);
      
      for (const funcionario of batch) {
        // Check if employee exists
        const checkResult = await client.query(
          `SELECT id FROM funcionarios
           WHERE user_id = $1 AND matricula_funcionario = $2`,
          [userId, funcionario.MATRICULAFUNCIONARIO]
        );
        
        // Convert dates
        const converterData = (dataStr) => {
          if (!dataStr) return null;
          const data = new Date(dataStr);
          return isNaN(data.getTime()) ? null : data;
        };
        
        const dataNascimento = converterData(funcionario.DATA_NASCIMENTO);
        const dataAdmissao = converterData(funcionario.DATA_ADMISSAO);
        const dataDemissao = converterData(funcionario.DATA_DEMISSAO);
        
        if (checkResult.rows.length === 0) {
          // Insert new employee
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
          // Update existing employee
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
      
      // Short delay to reduce database pressure
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
 * Process absenteismo synchronization job
 */
async function processAbsenteismoJob(jobId, params) {
  const userId = params.userId;
  const dataInicio = params.dataInicio;
  const dataFim = params.dataFim;
  const empresaId = params.empresaId;
  
  // Update job progress
  await jobQueueService.updateJobStatus(jobId, 'processing', {
    progress: 10
  });
  
  // Get API configuration
  const configResult = await pool.query(
    `SELECT codigo, chave
     FROM api_configurations
     WHERE user_id = $1 AND api_type = 'absenteismo'`,
    [userId]
  );
  
  if (configResult.rows.length === 0) {
    throw new Error('API configuration not found');
  }
  
  const config = configResult.rows[0];
  
  // Validate configuration
  if (!config.codigo || !config.chave) {
    throw new Error('Incomplete API configuration');
  }
  
  // Determine which companies to process
  let empresas = [];
  
  // If no company specified, get all active companies
  if (!empresaId) {
    const empresasResult = await pool.query(
      `SELECT codigo FROM empresas 
       WHERE user_id = $1 AND ativo = true`,
      [userId]
    );
    
    if (empresasResult.rows.length === 0) {
      throw new Error('No companies found. Please synchronize companies first.');
    }
    
    empresas = empresasResult.rows;
  } else {
    // Use specified company
    empresas = [{ codigo: empresaId }];
  }
  
  // Update job with total companies
  await jobQueueService.updateJobStatus(jobId, 'processing', {
    total_records: empresas.length
  });
  
  // Start transaction
  const client = await pool.connect();
  let totalInserted = 0;
  
  try {
    await client.query('BEGIN');
    
    // Clear existing data in the specified period
    const empresaCodigos = empresas.map(emp => emp.codigo);
    
    await client.query(
      `DELETE FROM absenteismo
       WHERE user_id = $1
         AND dt_inicio_atestado >= $2
         AND dt_inicio_atestado <= $3
         AND matricula_func IN (
           SELECT matricula_funcionario FROM funcionarios 
           WHERE user_id = $1 AND codigo_empresa = ANY($4)
         )`,
      [userId, dataInicio, dataFim, empresaCodigos]
    );
    
    // Process each company
    for (let i = 0; i < empresas.length; i++) {
      const empresa = empresas[i];
      
      try {
        // Update job progress for this company
        await jobQueueService.updateJobStatus(jobId, 'processing', {
          progress: 10 + Math.floor((i / empresas.length) * 90),
          processed_records: i
        });
        
        // Prepare API request parameters
        const apiParams = {
          empresa: empresa.codigo,
          codigo: config.codigo,
          chave: config.chave,
          tipoSaida: 'json',
          dataInicio: dataInicio,
          dataFim: dataFim
        };
        
        // Request data from SOC API
        const absenteismoData = await apiConfigController.requestSocApi(apiParams);
        
        // Process absenteeism data
        for (const absenteismo of absenteismoData) {
          // Convert dates
          const dtNascimento = absenteismo.DT_NASCIMENTO ? new Date(absenteismo.DT_NASCIMENTO) : null;
          const dtInicioAtestado = absenteismo.DT_INICIO_ATESTADO ? new Date(absenteismo.DT_INICIO_ATESTADO) : null;
          const dtFimAtestado = absenteismo.DT_FIM_ATESTADO ? new Date(absenteismo.DT_FIM_ATESTADO) : null;
          
          // Insert absenteismo record
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
        }
        
        // Allow some time between companies to avoid overwhelming the API
        await delay(300);
      } catch (error) {
        console.error(`Error processing company ${empresa.codigo}:`, error);
        // Continue with next company instead of failing the whole job
      }
    }
    
    await client.query('COMMIT');
    
    return {
      success: true,
      message: 'Absenteeism synchronization completed',
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
 * Main worker loop
 */
async function runWorker() {
  if (isWorkerRunning) {
    return;
  }
  
  isWorkerRunning = true;
  
  try {
    // Get pending jobs
    const pendingJobs = await jobQueueService.getPendingJobs(5);
    
    if (pendingJobs.length > 0) {
      console.log(`Found ${pendingJobs.length} pending jobs to process`);
    }
    
    // Process jobs sequentially
    for (const job of pendingJobs) {
      try {
        await processJob(job);
      } catch (error) {
        console.error(`Error in job ${job.id}:`, error);
        // Continue with the next job
      }
    }
  } catch (error) {
    console.error('Error in worker:', error);
  } finally {
    isWorkerRunning = false;
    
    // Schedule the next run
    setTimeout(runWorker, 5000); // Run every 5 seconds
  }
}

// Start the worker
exports.startWorker = function() {
  console.log('Starting synchronization job worker...');
  runWorker();
};

// Export for testing
exports.processJob = processJob;
