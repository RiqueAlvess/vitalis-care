const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { pool } = require('./db');
const dotenv = require('dotenv');
const path = require('path');
const { runMigration } = require('./db/migrate');

// Importação das rotas
const authRoutes = require('./routes/auth');
const apiConfigRoutes = require('./routes/apiConfig');

// Configuração do ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Servir arquivos estáticos do React em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
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
  } catch (error) {
    console.error('Erro ao executar migrações:', error);
  }
})();

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
