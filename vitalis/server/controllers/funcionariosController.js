const { pool } = require('../db');
const apiConfigController = require('./apiConfigController');
const jobQueueService = require('../services/jobQueueService');

exports.getFuncionarios = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT * FROM funcionarios 
       WHERE user_id = $1
       ORDER BY nome`,
      [userId]
    );
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

exports.getFuncionario = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const funcionarioId = req.params.id;
    
    const result = await pool.query(
      `SELECT * FROM funcionarios
       WHERE user_id = $1 AND id = $2`,
      [userId, funcionarioId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Funcionário não encontrado'
      });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.syncFuncionarios = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Buscar configuração da API com o código de empresa padrão
    const configResult = await pool.query(
      `SELECT codigo, chave, empresa_padrao, 
              ativo, inativo, afastado, pendente, ferias
       FROM api_configurations
       WHERE user_id = $1 AND api_type = 'funcionario'`,
      [userId]
    );
    
    if (configResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Configurações da API de funcionários não encontradas'
      });
    }
    
    const config = configResult.rows[0];
    
    // Validar configurações
    if (!config.codigo || !config.chave || !config.empresa_padrao) {
      return res.status(400).json({
        success: false,
        message: 'Código, chave e empresa padrão são obrigatórios'
      });
    }
    
    // Criar job de sincronização
    const jobId = await jobQueueService.createJob(userId, 'funcionario', {
      userId,
      empresaId: config.empresa_padrao
    });
    
    res.status(202).json({
      success: true,
      message: 'Job de sincronização de funcionários adicionado à fila',
      jobId
    });
  } catch (error) {
    console.error('Erro ao sincronizar funcionários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar job de sincronização',
      error: error.message
    });
  }
};
