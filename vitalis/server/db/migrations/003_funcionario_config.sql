-- Limpe as configurações de API para garantir consistência
DELETE FROM api_configurations WHERE api_type = 'funcionario';

-- Insira uma configuração padrão para API de funcionários
INSERT INTO api_configurations (user_id, api_type, empresa_principal, codigo, chave, ativo)
SELECT id, 'funcionario', '', '', '', 'Sim'
FROM users;
