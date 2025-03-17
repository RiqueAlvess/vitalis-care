-- Adicionando colunas para configurações de funcionários
ALTER TABLE api_configurations 
ADD COLUMN IF NOT EXISTS ativo VARCHAR(10),
ADD COLUMN IF NOT EXISTS inativo VARCHAR(10),
ADD COLUMN IF NOT EXISTS afastado VARCHAR(10),
ADD COLUMN IF NOT EXISTS pendente VARCHAR(10),
ADD COLUMN IF NOT EXISTS ferias VARCHAR(10);
