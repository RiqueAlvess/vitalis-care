const { pool } = require('../db');

/**
 * Obtém todos os jobs do usuário
 */
exports.getJobs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 100, offset = 0 } = req.query;
    
    const result = await pool.query(
      `SELECT * FROM sync_jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar jobs de sincronização',
      error: error.message
    });
  }
};

/**
 * Obtém um job específico
 */
exports.getJob = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;
    
    const result = await pool.query(
      `SELECT * FROM sync_jobs
       WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job não encontrado'
      });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar job:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar detalhes do job',
      error: error.message
    });
  }
};

/**
 * Repete um job que falhou
 */
exports.retryJob = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;
    
    const job = await pool.query(
      `SELECT * FROM sync_jobs
       WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );
    
    if (job.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job não encontrado'
      });
    }
    
    if (job.rows[0].status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Apenas jobs com falha podem ser repetidos'
      });
    }
    
    // Reseta o status do job para pendente
    await pool.query(
      `UPDATE sync_jobs
       SET status = 'pending',
           error_message = NULL,
           progress = 0,
           processed_records = 0
       WHERE id = $1`,
      [jobId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Job adicionado novamente à fila',
      job: {
        id: jobId,
        job_type: job.rows[0].job_type,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Erro ao repetir job:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao repetir job',
      error: error.message
    });
  }
};

/**
 * Cancela um job pendente
 */
exports.cancelJob = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;
    
    const job = await pool.query(
      `SELECT * FROM sync_jobs
       WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );
    
    if (job.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job não encontrado'
      });
    }
    
    if (job.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Apenas jobs pendentes podem ser cancelados'
      });
    }
    
    // Atualiza o status do job para cancelado
    await pool.query(
      `UPDATE sync_jobs
       SET status = 'canceled'
       WHERE id = $1`,
      [jobId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Job cancelado',
      job: {
        id: jobId,
        job_type: job.rows[0].job_type,
        status: 'canceled'
      }
    });
  } catch (error) {
    console.error('Erro ao cancelar job:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao cancelar job',
      error: error.message
    });
  }
};
