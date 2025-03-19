-- Remover a tabela de empresas
DROP TABLE IF EXISTS empresas;

-- Atualizar a tabela de configurações de API para incluir código de empresa padrão
ALTER TABLE api_configurations 
ADD COLUMN IF NOT EXISTS empresa_padrao VARCHAR(50);

-- Atualizar todas as configurações existentes com um valor padrão
UPDATE api_configurations 
SET empresa_padrao = '123' 
WHERE api_type = 'funcionario' AND (empresa_padrao IS NULL OR empresa_padrao = '');
