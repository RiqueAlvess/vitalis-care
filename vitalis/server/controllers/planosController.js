const { pool } = require('../db');

/**
 * Obtém o plano atual do usuário
 */
exports.getPlanoAtual = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Verificar se o usuário já existe na tabela de planos
    const result = await pool.query(
      `SELECT * FROM planos_usuarios WHERE user_id = $1`,
      [userId]
    );
    
    // Se não existe, retornar plano gratuito
    if (result.rows.length === 0) {
      return res.status(200).json({
        tipo_plano: 'gratuito',
        data_inicio: null,
        data_expiracao: null,
        recursos_disponíveis: [
          'dashboard_basico',
          'grafico_evolucao',
          'top_cids',
          'setores_afetados'
        ]
      });
    }
    
    // Retornar dados do plano
    const plano = result.rows[0];
    
    // Verificar se o plano expirou
    const hoje = new Date();
    const expiracao = new Date(plano.data_expiracao);
    
    if (plano.tipo_plano !== 'gratuito' && expiracao < hoje) {
      // O plano premium expirou, retornar informações atualizadas
      return res.status(200).json({
        tipo_plano: 'gratuito',
        data_inicio: plano.data_inicio,
        data_expiracao: plano.data_expiracao,
        plano_expirado: true,
        recursos_disponíveis: [
          'dashboard_basico',
          'grafico_evolucao',
          'top_cids',
          'setores_afetados'
        ]
      });
    }
    
    // Retornar recursos conforme o tipo de plano
    let recursos = [];
    
    if (plano.tipo_plano === 'premium') {
      recursos = [
        'dashboard_basico',
        'grafico_evolucao',
        'top_cids',
        'setores_afetados',
        'prejuizo_por_cid',
        'afastamento_por_dia_semana',
        'analise_por_genero',
        'exportacao_dados',
        'alertas_personalizados'
      ];
    } else {
      recursos = [
        'dashboard_basico',
        'grafico_evolucao',
        'top_cids',
        'setores_afetados'
      ];
    }
    
    res.status(200).json({
      tipo_plano: plano.tipo_plano,
      data_inicio: plano.data_inicio,
      data_expiracao: plano.data_expiracao,
      recursos_disponíveis: recursos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Atualiza o plano do usuário para premium
 * Em um ambiente real, isso seria integrado a um gateway de pagamento
 */
exports.atualizarParaPremium = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Em um ambiente real, aqui verificaria pagamento através de um gateway
    // e então atualizaria o status apenas se confirmado
    
    // Calcular datas
    const hoje = new Date();
    const dataExpiracao = new Date();
    dataExpiracao.setMonth(hoje.getMonth() + 1); // Plano mensal
    
    // Verificar se o usuário já existe na tabela de planos
    const checkResult = await pool.query(
      `SELECT * FROM planos_usuarios WHERE user_id = $1`,
      [userId]
    );
    
    if (checkResult.rows.length === 0) {
      // Inserir novo registro de plano
      await pool.query(
        `INSERT INTO planos_usuarios (user_id, tipo_plano, data_inicio, data_expiracao)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'premium', hoje, dataExpiracao]
      );
    } else {
      // Atualizar plano existente
      await pool.query(
        `UPDATE planos_usuarios
         SET tipo_plano = $2,
             data_inicio = $3,
             data_expiracao = $4
         WHERE user_id = $1`,
        [userId, 'premium', hoje, dataExpiracao]
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'Plano atualizado para Premium com sucesso',
      plano: {
        tipo_plano: 'premium',
        data_inicio: hoje,
        data_expiracao: dataExpiracao
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    next(error);
  }
};

/**
 * Verifica se o usuário tem acesso a um recurso específico
 */
exports.verificarAcesso = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { recurso } = req.params;
    
    if (!recurso) {
      return res.status(400).json({
        message: 'Recurso não especificado'
      });
    }
    
    // Verificar plano do usuário
    const result = await pool.query(
      `SELECT * FROM planos_usuarios WHERE user_id = $1`,
      [userId]
    );
    
    // Definir recursos por tipo de plano
    const recursosPremium = [
      'dashboard_basico',
      'grafico_evolucao',
      'top_cids',
      'setores_afetados',
      'prejuizo_por_cid',
      'afastamento_por_dia_semana',
      'analise_por_genero',
      'exportacao_dados',
      'alertas_personalizados'
    ];
    
    const recursosGratuito = [
      'dashboard_basico',
      'grafico_evolucao',
      'top_cids',
      'setores_afetados'
    ];
    
    // Se não tem plano ou plano gratuito
    if (result.rows.length === 0 || result.rows[0].tipo_plano === 'gratuito') {
      // Verificar se o recurso está disponível no plano gratuito
      const temAcesso = recursosGratuito.includes(recurso);
      
      return res.status(200).json({
        acesso: temAcesso,
        tipo_plano: 'gratuito'
      });
    }
    
    // Usuário tem plano premium, verificar se está ativo
    const plano = result.rows[0];
    const hoje = new Date();
    const expiracao = new Date(plano.data_expiracao);
    
    if (expiracao < hoje) {
      // Plano expirado, verificar se recurso está no plano gratuito
      const temAcesso = recursosGratuito.includes(recurso);
      
      return res.status(200).json({
        acesso: temAcesso,
        tipo_plano: 'gratuito',
        plano_expirado: true
      });
    }
    
    // Plano premium ativo, verificar acesso
    const temAcesso = recursosPremium.includes(recurso);
    
    return res.status(200).json({
      acesso: temAcesso,
      tipo_plano: 'premium'
    });
  } catch (error) {
    next(error);
  }
};
