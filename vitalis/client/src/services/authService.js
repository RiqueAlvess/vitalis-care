import axios from 'axios';
import jwtDecode from 'jwt-decode';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const authService = {
  /**
   * Realiza o login do usuário
   * @param {string} email Email do usuário
   * @param {string} password Senha do usuário
   * @returns {Promise<Object>} Dados do usuário e token
   */
  async login(email, password) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user } = response.data;
      
      // Armazena o token e dados do usuário no localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Configure o token de autorização para todas as requisições futuras
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { token, user };
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  },
  
  /**
   * Registra um novo usuário
   * @param {Object} userData Dados do usuário
   * @returns {Promise<Object>} Dados do usuário criado
   */
  async register(userData) {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      return response.data;
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    }
  },
  
  /**
   * Realiza o logout do usuário
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  },
  
  /**
   * Verifica se o usuário está autenticado
   * @returns {boolean} Verdadeiro se o usuário estiver autenticado
   */
  isAuthenticated() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      // Verifica se o token é válido e não expirou
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp < currentTime) {
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  },
  
  /**
   * Obtém os dados do usuário atual
   * @returns {Object|null} Dados do usuário ou null se não estiver autenticado
   */
  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      this.logout();
      return null;
    }
  },
  
  /**
   * Atualiza os dados do usuário
   * @param {Object} userData Dados do usuário para atualizar
   * @returns {Promise<Object>} Dados do usuário atualizados
   */
  async updateProfile(userData) {
    try {
      const response = await axios.put(`${API_URL}/users/profile`, userData);
      
      // Atualiza os dados do usuário no localStorage
      const updatedUser = response.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }
};

export default authService;
