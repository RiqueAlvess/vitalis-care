-- Remover tabela de empresas
DROP TABLE IF EXISTS empresas;

-- Modificar tabela de configurações
ALTER TABLE api_configurations 
ADD COLUMN IF NOT EXISTS empresa_padrao VARCHAR(50),
ADD COLUMN IF NOT EXISTS data_inicio DATE,
ADD COLUMN IF NOT EXISTS data_fim DATE;

-- Atualizar configurações existentes
UPDATE api_configurations 
SET empresa_padrao = '123' 
WHERE api_type = 'funcionario' AND (empresa_padrao IS NULL OR empresa_padrao = '');

-- Remover índices e constraints relacionados a empresas
DROP INDEX IF EXISTS idx_funcionarios_empresa;
DROP INDEX IF EXISTS empresas_user_id_idx;
