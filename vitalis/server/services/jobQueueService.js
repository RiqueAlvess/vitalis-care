const { pool } = require('../db');

/**
 * Creates a new synchronization job
 */
exports.createJob = async (userId, jobType, params) => {
  try {
    const result = await pool.query(
      `INSERT INTO sync_jobs (user_id, job_type, status, params)
       VALUES ($1, $2, 'pending', $3)
       RETURNING id`,
      [userId, jobType, JSON.stringify(params)]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }
};

/**
 * Updates job status
 */
exports.updateJobStatus = async (jobId, status, data = {}) => {
  try {
    let query = `UPDATE sync_jobs SET status = $2`;
    const params = [jobId, status];
    
    // Add optional fields
    if (data.result) {
      query += `, result = $${params.length + 1}`;
      params.push(JSON.stringify(data.result));
    }
    
    if (data.error_message) {
      query += `, error_message = $${params.length + 1}`;
      params.push(data.error_message);
    }
    
    if (status === 'processing' && !data.started_at) {
      query += `, started_at = CURRENT_TIMESTAMP`;
    }
    
    if (status === 'completed' || status === 'failed') {
      query += `, completed_at = CURRENT_TIMESTAMP`;
    }
    
    if (data.progress !== undefined) {
      query += `, progress = $${params.length + 1}`;
      params.push(data.progress);
    }
    
    if (data.total_records !== undefined) {
      query += `, total_records = $${params.length + 1}`;
      params.push(data.total_records);
    }
    
    if (data.processed_records !== undefined) {
      query += `, processed_records = $${params.length + 1}`;
      params.push(data.processed_records);
    }
    
    query += ` WHERE id = $1`;
    
    await pool.query(query, params);
  } catch (error) {
    console.error('Error updating job status:', error);
    throw error;
  }
};

/**
 * Gets all jobs for a user
 */
exports.getJobs = async (userId, limit = 100, offset = 0) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sync_jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting jobs:', error);
    throw error;
  }
};

/**
 * Gets a specific job
 */
exports.getJob = async (jobId, userId) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sync_jobs
       WHERE id = $1 AND user_id = $2`,
      [jobId, userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting job:', error);
    throw error;
  }
};

/**
 * Gets pending jobs
 */
exports.getPendingJobs = async (limit = 10) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sync_jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting pending jobs:', error);
    throw error;
  }
};
