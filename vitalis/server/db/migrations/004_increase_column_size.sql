-- Aumentar o tamanho das colunas de configuração de funcionários
ALTER TABLE api_configurations 
ALTER COLUMN ativo TYPE VARCHAR(50),
ALTER COLUMN inativo TYPE VARCHAR(50),
ALTER COLUMN afastado TYPE VARCHAR(50),
ALTER COLUMN pendente TYPE VARCHAR(50),
ALTER COLUMN ferias TYPE VARCHAR(50);
