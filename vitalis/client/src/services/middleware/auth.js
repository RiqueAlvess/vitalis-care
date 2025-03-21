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
      return res.status(401).json({ message: 'Token não fornecido' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET não está definido no ambiente');
      return res.status(500).json({ message: 'Erro de configuração do servidor' });
    }
    
    try {
      // Verificar e decodificar o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Buscar o usuário no banco de dados
      const result = await pool.query(
        'SELECT id, company_name, email, created_at FROM users WHERE id = $1',
        [decoded.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Usuário não encontrado' });
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
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token inválido' });
      }
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expirado' });
      }
      
      return res.status(401).json({ message: 'Erro na autenticação' });
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ message: 'Erro interno no servidor' });
  }
};
