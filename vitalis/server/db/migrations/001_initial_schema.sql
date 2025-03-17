-- Criação da tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

-- Criação da tabela de configurações de API
CREATE TABLE IF NOT EXISTS api_configurations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_type VARCHAR(50) NOT NULL, -- 'empresa', 'funcionario', 'absenteismo'
  empresa_principal VARCHAR(50),
  codigo VARCHAR(50),
  chave VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, api_type)
);

-- Criação da tabela de empresas (cache dos dados da API)
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, codigo)
);

-- Criação da tabela de funcionários (cache dos dados da API)
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, matricula_funcionario)
);

-- Criação da tabela de absenteísmo (cache dos dados da API)
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

-- Índices para melhorar performance
CREATE INDEX idx_funcionarios_empresa ON funcionarios(codigo_empresa);
CREATE INDEX idx_funcionarios_matricula ON funcionarios(matricula_funcionario);
CREATE INDEX idx_absenteismo_matricula ON absenteismo(matricula_func);
CREATE INDEX idx_absenteismo_data ON absenteismo(dt_inicio_atestado, dt_fim_atestado);
