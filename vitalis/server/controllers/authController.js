const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { isEmailCorporate } = require('../utils/validators');

/**
 * Controlador para registro de usuário
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 * @param {Function} next - Função next do Express
 */
exports.register = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { companyName, email, password } = req.body;
    
    // Validação dos dados de entrada
    if (!companyName || !email || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }
    
    // Verificar se é um email corporativo
    if (!isEmailCorporate(email)) {
      return res.status(400).json({ message: 'Por favor, utilize um email corporativo' });
    }
    
    // Verificar se o email já está cadastrado
    const emailCheck = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Este email já está cadastrado' });
    }
    
    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Iniciar transação
    await client.query('BEGIN');
    
    // Inserir o usuário no banco
    const result = await client.query(
      `INSERT INTO users (company_name, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, company_name, email, created_at`,
      [companyName, email, passwordHash]
    );
    
    const user = result.rows[0];
    
    // Criar configurações de API padrão
    const apiTypes = ['empresa', 'funcionario', 'absenteismo'];
    
    for (const apiType of apiTypes) {
      await client.query(
        `INSERT INTO api_configurations (user_id, api_type) 
         VALUES ($1, $2)`,
        [user.id, apiType]
      );
    }
    
    // Commit da transação
    await client.query('COMMIT');
    
    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Retornar os dados do usuário e o token
    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso',
      user: {
        id: user.id,
        companyName: user.company_name,
        email: user.email,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Controlador para login de usuário
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 * @param {Function} next - Função next do Express
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validação dos dados de entrada
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }
    
    // Buscar o usuário pelo email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    const user = result.rows[0];
    
    // Verificar a senha
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Atualizar a data do último login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Retornar os dados do usuário e o token
    return res.status(200).json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        companyName: user.company_name,
        email: user.email,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para verificar o token JWT
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.verifyToken = (req, res) => {
  return res.status(200).json({ 
    message: 'Token válido',
    user: req.user
  });
};
