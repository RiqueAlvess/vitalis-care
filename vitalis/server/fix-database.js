const { pool } = require('./db');

async function fixDatabase() {
  const client = await pool.connect();
  console.log('Iniciando verificação e correção do banco de dados...');
  
  try {
    // Verificar conexão com o banco
    console.log('Testando conexão com o banco de dados...');
    await client.query('SELECT 1');
    console.log('Conexão com o banco estabelecida com sucesso!');
    
    // Verificar/criar tabela de usuários
    console.log('Verificando tabela de usuários...');
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
    
    // Verificar/criar tabela de migrações
    console.log('Verificando tabela de migrações...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Verificar/criar tabela de configurações da API
    console.log('Verificando tabela de configurações da API...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_configurations (
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
    
    // Verificar/criar tabela de empresas
    console.log('Verificando tabela de empresas...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        codigo VARCHAR(20) NOT NULL,
        nome_abreviado VARCHAR(60),
        razao_social VARCHAR(200),
        endereco VARCHAR(110),
        numero_endereco VARCHAR(20),
        complemento_endereco VARCHAR(300),
        bairro VARCHAR(80),
        cidade VARCHAR(50),
        cep VARCHAR(11),
        uf VARCHAR(2),
        cnpj VARCHAR(20),
        inscricao_estadual VARCHAR(20),
        inscricao_municipal VARCHAR(20),
        ativo BOOLEAN DEFAULT TRUE,
        codigo_cliente_integracao VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Verificar/criar tabela de funcionários
    console.log('Verificando tabela de funcionários...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS funcionarios (
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
    `);
    
    // Verificar/criar tabela de absenteísmo
    console.log('Verificando tabela de absenteísmo...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS absenteismo (
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
    `);
    
    // Verificar/criar tabela de planos de usuários
    console.log('Verificando tabela de planos de usuários...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS planos_usuarios (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tipo_plano VARCHAR(50) NOT NULL DEFAULT 'gratuito',
        data_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        data_expiracao TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);
    
    // Verificar/criar tabela de jobs de sincronização
    console.log('Verificando tabela de jobs de sincronização...');
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
    
    // Registrar todas as migrações
    console.log('Registrando migrações...');
    const migrations = [
      '001_initial_schema',
      '002_add_funcionario_columns',
      '003_funcionario_config',
      '004_increase_column_size',
      '005_fix_funcionario_api',
      '006_add_sync_jobs',
      '007_simplify_empresa_config',
      '008_add_api_configurations_table'
    ];
    
    for (const migration of migrations) {
      await client.query(`
        INSERT INTO migrations (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING;
      `, [migration]);
    }
    
    console.log('Verificação e correção do banco de dados concluídas com sucesso!');
  } catch (error) {
    console.error('Erro durante a verificação/correção do banco de dados:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Executar a função
fixDatabase()
  .then(() => {
    console.log('Processo de correção do banco de dados finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
