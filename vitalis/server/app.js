const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { pool } = require('./db');
const dotenv = require('dotenv');
const path = require('path');
const { runMigration } = require('./db/migrate');
const jobWorker = require('./services/jobWorker');

// Importação das rotas
const authRoutes = require('./routes/auth');
const apiConfigRoutes = require('./routes/apiConfig');
const empresasRoutes = require('./routes/empresas');
const funcionariosRoutes = require('./routes/funcionarios');
const absenteismoRoutes = require('./routes/absenteismo');
const planosRoutes = require('./routes/planos');
const jobQueueRoutes = require('./routes/jobQueue');

// Configuração do ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Aumentar limites de tamanho de payload
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Configurar timeout para requisições HTTP
app.use((req, res, next) => {
  req.setTimeout(900000); // 15 minutos
  res.setTimeout(900000); // 15 minutos
  next();
});

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));

// Verificação da conexão com o banco de dados
app.use(async (req, res, next) => {
  try {
    // Verifica a conexão com o banco
    await pool.query('SELECT 1');
    next();
  } catch (error) {
    console.error('Erro de conexão com o banco de dados:', error);
    res.status(500).json({ 
      message: 'Erro de conexão com o banco de dados', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/api-config', apiConfigRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/absenteismo', absenteismoRoutes);
app.use('/api/planos', planosRoutes);
app.use('/api/sync-jobs', jobQueueRoutes);

// Servir arquivos estáticos do React em produção
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/build');
  
  app.use(express.static(clientBuildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';
  
  res.status(statusCode).json({
    message,
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

// Verificar e criar tabela sync_jobs se necessário
async function checkSyncJobsTable() {
  const client = await pool.connect();
  try {
    // Verificar se a tabela sync_jobs existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sync_jobs'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Tabela sync_jobs não encontrada. Criando...');
      
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
      await client.query(`
        INSERT INTO migrations (name) 
        VALUES ('006_add_sync_jobs')
        ON CONFLICT (name) DO NOTHING;
      `);
      
      console.log('Tabela sync_jobs criada com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao verificar/criar tabela sync_jobs:', error);
  } finally {
    client.release();
  }
}

// Executar migrações automaticamente na inicialização
(async function() {
  try {
    console.log('Iniciando migrações automáticas...');
    await runMigration();
    console.log('Migrações concluídas com sucesso!');
    
    // Verificar e criar tabela sync_jobs se necessária
    await checkSyncJobsTable();
    
    // Start job worker after migrations
    jobWorker.startWorker();
    console.log('Processador de jobs iniciado com sucesso');
  } catch (error) {
    console.error('Erro ao executar migrações:', error);
  }
})();

// Iniciar o servidor com timeout aumentado
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  server.timeout = 900000; // 15 minutos (900.000 ms)
});

module.exports = app;
