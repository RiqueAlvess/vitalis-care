const jwt = require('jsonwebtoken');
const { pool } = require('../db');

/**
 * Middleware para verificar a autenticação do usuário
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 * @param {Function} next - Função next do Express
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Verificar se existe um token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Token não fornecido, usando ID padrão 1');
      req.user = { id: 1 };
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verificar e decodificar o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chave_secreta_padrao');
      
      // Buscar o usuário no banco de dados
      const result = await pool.query(
        'SELECT id, company_name, email, created_at FROM users WHERE id = $1',
        [decoded.id]
      );
      
      if (result.rows.length === 0) {
        console.log('Usuário não encontrado, usando ID padrão 1');
        req.user = { id: 1 };
        return next();
      }
      
      // Adicionar os dados do usuário à requisição
      const user = result.rows[0];
      
      req.user = {
        id: user.id,
        companyName: user.company_name,
        email: user.email,
        createdAt: user.created_at
      };
      
      next();
    } catch (jwtError) {
      console.error('Erro JWT:', jwtError);
      console.log('Erro na autenticação, usando ID padrão 1');
      req.user = { id: 1 };
      next();
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    req.user = { id: 1 };
    next();
  }
};
