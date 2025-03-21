// Em vitalis/server/db/index.js
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Configurar pool de conexão com tratamento de erros aprimorado
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // número máximo de clientes no pool
  idleTimeoutMillis: 30000, // quanto tempo um cliente permanece ocioso antes de ser fechado
  connectionTimeoutMillis: 2000, // quanto tempo para esperar antes de desistir de se conectar
});

// Monitorar eventos do pool
pool.on('connect', (client) => {
  console.log('Conexão com o banco de dados estabelecida');
});

pool.on('error', (err, client) => {
  console.error('Erro inesperado no cliente PostgreSQL:', err);
});

// Testar conexão ao iniciar
pool.connect()
  .then(client => {
    console.log('Conectado ao banco de dados PostgreSQL');
    client.release();
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
  });

module.exports = { pool };
