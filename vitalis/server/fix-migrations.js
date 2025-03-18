const { Pool } = require('pg');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Configurar pool de conexão
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixSyncJobsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Verificando tabela sync_jobs...');
    
    // Verificar se a tabela sync_jobs existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sync_jobs'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (tableExists) {
      console.log('A tabela sync_jobs já existe no banco de dados.');
      return;
    }
    
    console.log('A tabela sync_jobs não existe. Criando tabela...');
    
    // Verificar se a migração já foi registrada
    const migrationCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM migrations 
        WHERE name = '006_add_sync_jobs'
      );
    `);
    
    const migrationExists = migrationCheck.rows[0].exists;
    
    // Iniciar transação
    await client.query('BEGIN');
    
    // Criar tabela sync_jobs
    await client.query(`
      CREATE TABLE sync_jobs (
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

      CREATE INDEX idx_sync_jobs_user_id ON sync_jobs(user_id);
      CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
    `);
    
    // Registrar migração se ainda não estiver registrada
    if (!migrationExists) {
      await client.query(`
        INSERT INTO migrations (name) 
        VALUES ('006_add_sync_jobs');
      `);
    }
    
    // Commit da transação
    await client.query('COMMIT');
    
    console.log('Tabela sync_jobs criada com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar tabela sync_jobs:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar a função
fixSyncJobsTable()
  .then(() => {
    console.log('Processo de correção concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro no processo de correção:', error);
    process.exit(1);
  });
