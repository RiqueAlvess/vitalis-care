const { pool } = require('./db');

async function fixTables() {
  const client = await pool.connect();
  
  try {
    console.log('Fixing database tables...');
    
    // Check and create users table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(200) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE
      );
    `);
    
    // Check and create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Check and fix api_configurations table
    const apiConfigExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'api_configurations'
      );
    `);
    
    if (!apiConfigExists.rows[0].exists) {
      console.log('Creating api_configurations table...');
      await client.query(`
        CREATE TABLE api_configurations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          api_type VARCHAR(50) NOT NULL, 
          empresa_padrao VARCHAR(50),
          codigo VARCHAR(50),
          chave VARCHAR(255),
          ativo VARCHAR(50),
          inativo VARCHAR(50),
          afastado VARCHAR(50),
          pendente VARCHAR(50),
          ferias VARCHAR(50),
          data_inicio DATE,
          data_fim DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, api_type)
        );
      `);
    } else {
      // Make sure all columns exist
      const columns = ['empresa_padrao', 'codigo', 'chave', 'ativo', 'inativo', 
                       'afastado', 'pendente', 'ferias', 'data_inicio', 'data_fim'];
      
      for (const column of columns) {
        const columnExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'api_configurations' 
            AND column_name = $1
          );
        `, [column]);
        
        if (!columnExists.rows[0].exists) {
          const dataType = column === 'data_inicio' || column === 'data_fim' ? 'DATE' : 'VARCHAR(50)';
          await client.query(`ALTER TABLE api_configurations ADD COLUMN ${column} ${dataType};`);
          console.log(`Added column ${column} to api_configurations`);
        }
      }
    }
    
    // Check and fix sync_jobs table
    const syncJobsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sync_jobs'
      );
    `);
    
    if (!syncJobsExists.rows[0].exists) {
      console.log('Creating sync_jobs table...');
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
        
        CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_id ON sync_jobs(user_id);
        CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
      `);
      
      // Add migration record
      await client.query(`
        INSERT INTO migrations (name) 
        VALUES ('006_add_sync_jobs')
        ON CONFLICT (name) DO NOTHING;
      `);
    }
    
    // Check and fix funcionarios table
    const funcionariosExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'funcionarios'
      );
    `);
    
    if (!funcionariosExists.rows[0].exists) {
      console.log('Creating funcionarios table...');
      await client.query(`
        CREATE TABLE funcionarios (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          codigo_empresa VARCHAR(20) NOT NULL,
          nome_empresa VARCHAR(200),
          codigo VARCHAR(20) NOT NULL,
          nome VARCHAR(120),
          codigo_unidade VARCHAR(20),
          nome_unidade VARCHAR(130),
          codigo_setor VARCHAR(12),
          nome_setor VARCHAR(130),
          codigo_cargo VARCHAR(10),
          nome_cargo VARCHAR(130),
          cbo_cargo VARCHAR(10),
          ccusto VARCHAR(50),
          nome_centro_custo VARCHAR(130),
          matricula_funcionario VARCHAR(30) NOT NULL,
          cpf VARCHAR(19),
          situacao VARCHAR(12),
          sexo INTEGER,
          data_nascimento DATE,
          data_admissao DATE,
          data_demissao DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_funcionarios_matricula ON funcionarios(matricula_funcionario);
      `);
    }
    
    // Check and fix absenteismo table
    const absenteismoExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'absenteismo'
      );
    `);
    
    if (!absenteismoExists.rows[0].exists) {
      console.log('Creating absenteismo table...');
      await client.query(`
        CREATE TABLE absenteismo (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          unidade VARCHAR(130),
          setor VARCHAR(130),
          matricula_func VARCHAR(30) NOT NULL,
          dt_nascimento DATE,
          sexo INTEGER,
          tipo_atestado INTEGER,
          dt_inicio_atestado DATE,
          dt_fim_atestado DATE,
          hora_inicio_atestado VARCHAR(5),
          hora_fim_atestado VARCHAR(5),
          dias_afastados INTEGER,
          horas_afastado VARCHAR(5),
          cid_principal VARCHAR(10),
          descricao_cid VARCHAR(264),
          grupo_patologico VARCHAR(80),
          tipo_licenca VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_absenteismo_matricula ON absenteismo(matricula_func);
        CREATE INDEX IF NOT EXISTS idx_absenteismo_data ON absenteismo(dt_inicio_atestado, dt_fim_atestado);
      `);
    }
    
    console.log('Database tables fixed successfully');
  } catch (error) {
    console.error('Error fixing database tables:', error);
  } finally {
    client.release();
  }
}

// Run the fix function
fixTables()
  .then(() => {
    console.log('Database fix complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
