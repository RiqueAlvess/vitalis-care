const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function diagnoseAndFix() {
  const client = await pool.connect();
  try {
    console.log('Checking database tables...');
    
    // Check users table
    const usersExists = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users');
    `);
    console.log('Users table exists:', usersExists.rows[0].exists);
    
    // Create basic tables if needed
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(200) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS api_configurations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
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
    
    // Check if there are users
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log('User count:', userCount.rows[0].count);
    
    // Check configuration table
    const configsExist = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_configurations');
    `);
    console.log('API configurations table exists:', configsExist.rows[0].exists);
    
    // Repair foreign key constraint if needed
    if (configsExist.rows[0].exists) {
      // Try removing the constraint if it's causing problems
      try {
        await client.query('ALTER TABLE api_configurations DROP CONSTRAINT IF EXISTS api_configurations_user_id_fkey');
        console.log('Removed foreign key constraint');
      } catch (e) {
        console.log('No constraint to drop or error:', e.message);
      }
    }
    
    console.log('Database check and fixes completed');
  } catch (error) {
    console.error('Database diagnosis failed:', error);
  } finally {
    client.release();
  }
}

diagnoseAndFix()
  .then(() => {
    console.log('Finished diagnosis');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
