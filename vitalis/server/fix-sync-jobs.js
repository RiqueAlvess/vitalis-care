const { pool } = require('./db');

async function fixSyncJobsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Verificando tabela sync_jobs...');
    
    // Criar tabela sync_jobs
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_jobs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_type VARCHAR(50) NOT NULL, 
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        params JSONB,
        result JSONB,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        progress INTEGER DEFAULT 0,
        total_records INTEGER,
        processed_records INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_id ON sync_jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
    `);
    
    // Registrar migração na tabela de migrações
    const migrationExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM migrations 
        WHERE name = '006_add_sync_jobs'
      );
    `);
    
    if (!migrationExists.rows[0].exists) {
      await client.query(`
        INSERT INTO migrations (name) 
        VALUES ('006_add_sync_jobs');
      `);
    }
    
    console.log('Tabela sync_jobs criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabela sync_jobs:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar a função
fixSyncJobsTable()
  .then(() => {
    console.log('Correção concluída com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro na correção:', error);
    process.exit(1);
  });
