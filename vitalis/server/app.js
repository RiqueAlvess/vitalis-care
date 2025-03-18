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

// Executar migrações automaticamente na inicialização
(async function() {
  try {
    console.log('Iniciando migrações automáticas...');
    await runMigration();
    console.log('Migrações concluídas com sucesso!');
    
    // Start job worker after migrations
    jobWorker.startWorker();
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
