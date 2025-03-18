import axios from 'axios';
import jobQueueService from './jobQueueService';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Configurar interceptor global para adicionar o token a todas as requisições
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Serviço para gerenciamento das configurações de API
 */
const apiConfigService = {
  /**
   * Obtém as configurações de API do usuário
   * @returns {Promise<Object>} Configurações de API
   */
  async getConfigurations() {
    try {
      const response = await axios.get(`${API_URL}/api-config`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar configurações de API:', error);
      throw error;
    }
  },
  
  /**
   * Salva as configurações de API
   * @param {string} apiType Tipo de API ('empresa', 'funcionario', 'absenteismo')
   * @param {Object} config Configurações da API
   * @returns {Promise<Object>} Configurações atualizadas
   */
  async saveConfiguration(apiType, config) {
    try {
      const response = await axios.post(`${API_URL}/api-config/${apiType}`, config);
      return response.data;
    } catch (error) {
      console.error(`Erro ao salvar configuração de API ${apiType}:`, error);
      throw error;
    }
  },
  
  /**
   * Testa a conexão com a API SOC
   * @param {Object} config Configurações para teste
   * @returns {Promise<Object>} Resultado do teste
   */
  async testConnection(config) {
    try {
      const response = await axios.post(`${API_URL}/api-config/test`, config);
      return response.data;
    } catch (error) {
      console.error('Erro ao testar conexão com API:', error);
      throw error;
    }
  }
};

/**
 * Serviço para obtenção de dados de empresas
 */
const empresaService = {
  /**
   * Busca dados de empresas
   * @returns {Promise<Array>} Lista de empresas
   */
  async getEmpresas() {
    try {
      const response = await axios.get(`${API_URL}/empresas`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      throw error;
    }
  },
  
  /**
   * Busca uma empresa específica
   * @param {number} id ID da empresa
   * @returns {Promise<Object>} Dados da empresa
   */
  async getEmpresa(id) {
    try {
      const response = await axios.get(`${API_URL}/empresas/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar empresa ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Sincroniza dados de empresas com a API SOC
   * @returns {Promise<Object>} Resultado da sincronização
   */
  async syncEmpresas() {
    try {
      const response = await axios.post(`${API_URL}/empresas/sync`);
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar empresas:', error);
      throw error;
    }
  }
};

/**
 * Serviço para obtenção de dados de funcionários
 */
const funcionarioService = {
  /**
   * Busca dados de funcionários
   * @param {string} empresaId ID da empresa (opcional)
   * @returns {Promise<Array>} Lista de funcionários
   */
  async getFuncionarios(empresaId = '') {
    try {
      let url = `${API_URL}/funcionarios`;
      if (empresaId) {
        url += `?empresaId=${empresaId}`;
      }
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      throw error;
    }
  },
  
  /**
   * Busca um funcionário específico
   * @param {number} id ID do funcionário
   * @returns {Promise<Object>} Dados do funcionário
   */
  async getFuncionario(id) {
    try {
      const response = await axios.get(`${API_URL}/funcionarios/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar funcionário ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Sincroniza dados de funcionários com a API SOC
   * @param {string} empresaId ID da empresa (opcional)
   * @returns {Promise<Object>} Resultado da sincronização
   */
  async syncFuncionarios(empresaId = '') {
    try {
      let url = `${API_URL}/funcionarios/sync`;
      if (empresaId) {
        url += `?empresaId=${empresaId}`;
      }
      
      const response = await axios.post(url);
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar funcionários:', error);
      throw error;
    }
  }
};

/**
 * Serviço para obtenção de dados de absenteísmo
 */
const absenteismoService = {
  /**
   * Busca dados de absenteísmo
   * @param {string} dataInicio Data de início (formato YYYY-MM-DD)
   * @param {string} dataFim Data de fim (formato YYYY-MM-DD)
   * @param {string} empresaId ID da empresa (opcional)
   * @returns {Promise<Array>} Lista de registros de absenteísmo
   */
  async getAbsenteismo(dataInicio, dataFim, empresaId = '') {
    try {
      let url = `${API_URL}/absenteismo?dataInicio=${dataInicio}&dataFim=${dataFim}`;
      if (empresaId) {
        url += `&empresaId=${empresaId}`;
      }
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dados de absenteísmo:', error);
      throw error;
    }
  },
  
  /**
   * Sincroniza dados de absenteísmo com a API SOC
   * @param {string} dataInicio Data de início (formato YYYY-MM-DD)
   * @param {string} dataFim Data de fim (formato YYYY-MM-DD)
   * @param {string} empresaId ID da empresa (opcional)
   * @returns {Promise<Object>} Resultado da sincronização
   */
  async syncAbsenteismo(dataInicio, dataFim, empresaId = '') {
    try {
      const payload = {
        dataInicio,
        dataFim,
        empresaId: empresaId || undefined
      };
      
      const response = await axios.post(`${API_URL}/absenteismo/sync`, payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar dados de absenteísmo:', error);
      throw error;
    }
  },
  
  /**
   * Obtém dados para o dashboard de absenteísmo
   * @param {string} dataInicio Data de início (formato YYYY-MM-DD)
   * @param {string} dataFim Data de fim (formato YYYY-MM-DD)
   * @param {string} empresaId ID da empresa (opcional)
   * @returns {Promise<Object>} Dados do dashboard
   */
  async getDashboardData(dataInicio, dataFim, empresaId = '') {
    try {
      let url = `${API_URL}/absenteismo/dashboard?dataInicio=${dataInicio}&dataFim=${dataFim}`;
      if (empresaId) {
        url += `&empresaId=${empresaId}`;
      }
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      throw error;
    }
  }
};

/**
 * Serviço para gerenciamento de planos
 */
const planoService = {
  /**
   * Obtém o plano atual do usuário
   * @returns {Promise<Object>} Dados do plano
   */
  async getPlanoAtual() {
    try {
      const response = await axios.get(`${API_URL}/planos/atual`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar plano atual:', error);
      throw error;
    }
  },
  
  /**
   * Atualiza o plano do usuário para premium
   * @returns {Promise<Object>} Resultado da atualização
   */
  async atualizarParaPremium() {
    try {
      const response = await axios.post(`${API_URL}/planos/premium`);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      throw error;
    }
  },
  
  /**
   * Verifica se o usuário tem acesso a um recurso específico
   * @param {string} recurso Nome do recurso
   * @returns {Promise<Object>} Resultado da verificação
   */
  async verificarAcesso(recurso) {
    try {
      const response = await axios.get(`${API_URL}/planos/acesso/${recurso}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao verificar acesso ao recurso ${recurso}:`, error);
      throw error;
    }
  }
};

export {
  apiConfigService,
  empresaService,
  funcionarioService,
  absenteismoService,
  planoService,
  jobQueueService
};

export default {
  apiConfig: apiConfigService,
  empresa: empresaService,
  funcionario: funcionarioService,
  absenteismo: absenteismoService,
  plano: planoService,
  jobQueue: jobQueueService
};
