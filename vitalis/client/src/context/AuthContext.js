import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();

  // Verificar autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          return;
        }
        
        // Verificar se o token é válido e não expirou
        try {
          const decoded = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            // Token expirado
            logout();
            return;
          }
          
          // Token válido, obter dados do usuário
          const user = JSON.parse(localStorage.getItem('user'));
          
          // Configurar axios com o token
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verificar token com o backend
          try {
            await axios.get(`${API_URL}/auth/verify`);
            
            // Token verificado com sucesso
            setCurrentUser(user);
            setIsAuthenticated(true);
          } catch (error) {
            // Erro ao verificar token
            console.error('Erro ao verificar token:', error);
            logout();
          }
        } catch (error) {
          // Erro ao decodificar token
          console.error('Erro ao decodificar token:', error);
          logout();
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login
  const login = async (email, password) => {
    try {
      setAuthError(null);
      
      // Fazer requisição de login
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      const { token, user } = response.data;
      
      // Armazenar token e dados do usuário
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Configurar axios com o token
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Atualizar estado
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (error) {
      console.error('Erro no login:', error);
      
      const errorMessage = error.response?.data?.message || 'Erro ao fazer login';
      setAuthError(errorMessage);
      
      throw error;
    }
  };

  // Registro
  const register = async (userData) => {
    try {
      setAuthError(null);
      
      // Fazer requisição de registro
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      
      return response.data;
    } catch (error) {
      console.error('Erro no registro:', error);
      
      const errorMessage = error.response?.data?.message || 'Erro ao realizar cadastro';
      setAuthError(errorMessage);
      
      throw error;
    }
  };

  // Logout
  const logout = () => {
    // Remover token e dados do usuário
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Remover token do axios
    delete axios.defaults.headers.common['Authorization'];
    
    // Atualizar estado
    setCurrentUser(null);
    setIsAuthenticated(false);
    
    // Redirecionar para login
    navigate('/login');
  };

  // Atualizar perfil
  const updateProfile = async (userData) => {
    try {
      // Fazer requisição de atualização
      const response = await axios.put(`${API_URL}/users/profile`, userData);
      
      // Atualizar dados do usuário
      const updatedUser = response.data;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Atualizar estado
      setCurrentUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  };

  // Valores do contexto
  const contextValue = {
    currentUser,
    isAuthenticated,
    isLoading,
    authError,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
};
