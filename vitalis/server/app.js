const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { pool } = require('./db');
const dotenv = require('dotenv');
const path = require('path');
const { runMigration } = require('./db/migrate');
const jobWorker = require('./services/jobWorker');

// Load environment variables
dotenv.config();

// Database initialization
async function initializeDatabase() {
  try {
    console.log('Checking database connection...');
    const client = await pool.connect();
    console.log('Database connection successful');
    client.release();
    
    // Create basic tables if they don't exist
    try {
      console.log('Creating users table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          company_name VARCHAR(200) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (error) {
      console.error('Error creating users table:', error.message);
    }

    try {
      console.log('Creating api_configurations table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS api_configurations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
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
    } catch (error) {
      console.error('Error creating api_configurations table:', error.message);
    }
    
    try {
      console.log('Creating sync_jobs table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sync_jobs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
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
    } catch (error) {
      console.error('Error creating sync_jobs table:', error.message);
    }
    
    try {
      console.log('Creating funcionarios table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS funcionarios (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
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
      `);
    } catch (error) {
      console.error('Error creating funcionarios table:', error.message);
    }
    
    try {
      console.log('Creating absenteismo table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS absenteismo (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
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
      `);
    } catch (error) {
      console.error('Error creating absenteismo table:', error.message);
    }
    
    try {
      console.log('Creating migrations table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Insert basic migrations record
      await pool.query(`
        INSERT INTO migrations (name) 
        VALUES ('001_initial_schema'), ('006_add_sync_jobs')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (error) {
      console.error('Error creating migrations table:', error.message);
    }
    
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('Starting server without database connection...');
  }
}

// Import routes
const authRoutes = require('./routes/auth');
const apiConfigRoutes = require('./routes/apiConfig');
const empresasRoutes = require('./routes/empresas');
const funcionariosRoutes = require('./routes/funcionarios');
const absenteismoRoutes = require('./routes/absenteismo');
const planosRoutes = require('./routes/planos');
const jobQueueRoutes = require('./routes/jobQueue');

const app = express();
const PORT = process.env.PORT || 5000;

// Increase payload size limits
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Configure HTTP request timeouts
app.use((req, res, next) => {
  req.setTimeout(900000); // 15 minutes
  res.setTimeout(900000); // 15 minutes
  next();
});

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));

// Modified database check middleware - don't block requests if DB is down
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      await pool.query('SELECT 1');
      next();
    } catch (error) {
      console.error('Database connection error in middleware:', error.message);
      // For auth endpoints, return error
      if (req.path.startsWith('/api/auth')) {
        return res.status(503).json({ 
          message: 'Database service unavailable', 
          error: 'Cannot process authentication request'
        });
      }
      // For other endpoints, continue but warn in logs
      console.warn(`Proceeding with request to ${req.path} despite database error`);
      next();
    }
  } else {
    next();
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/api-config', apiConfigRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/absenteismo', absenteismoRoutes);
app.use('/api/planos', planosRoutes);
app.use('/api/sync-jobs', jobQueueRoutes);

// Serve static React files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/build');
  
  app.use(express.static(clientBuildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error in request:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    message,
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

// Initialize app in sequence, but continue even if parts fail
(async function() {
  // Try to initialize database but continue if it fails
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
  
  // Try to run migrations but continue if they fail
  try {
    console.log('Running migrations...');
    await runMigration();
    console.log('Migrations completed');
  } catch (error) {
    console.error('Migration error:', error.message);
  }
  
  // Start job worker
  try {
    console.log('Starting job worker...');
    jobWorker.startWorker();
    console.log('Job worker started successfully');
  } catch (error) {
    console.error('Error starting job worker:', error.message);
  }
})();

// Start server with increased timeout
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  server.timeout = 900000; // 15 minutes (900,000 ms)
});

module.exports = app;
