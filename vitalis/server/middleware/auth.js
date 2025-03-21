const jwt = require('jsonwebtoken');
const { pool } = require('../db');

/**
 * Middleware para verificar a autenticação do usuário
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Verificar se existe um token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }
    
    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_padrao_vitalis';
    
    try {
      // Verificar e decodificar o token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Adicionar os dados do usuário à requisição
      req.user = {
        id: decoded.id,
        email: decoded.email
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
