import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const apiConfigService = {
  async getConfigurations() {
    try {
      const response = await axios.get(`${API_URL}/api-config`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      throw error;
    }
  },
  
  async saveConfiguration(apiType, config) {
    try {
      const response = await axios.post(`${API_URL}/api-config/${apiType}`, config);
      return response.data;
    } catch (error) {
      console.error(`Erro ao salvar configuração de ${apiType}:`, error);
      throw error;
    }
  },
  
  async testConnection(config) {
    try {
      const response = await axios.post(`${API_URL}/api-config/test`, config);
      return response.data;
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      throw error;
    }
  }
};

const funcionarioService = {
  async getFuncionarios() {
    try {
      const response = await axios.get(`${API_URL}/funcionarios`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      throw error;
    }
  },
  
  async syncFuncionarios() {
    try {
      const response = await axios.post(`${API_URL}/funcionarios/sync`);
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar funcionários:', error);
      throw error;
    }
  }
};

const absenteismoService = {
  async getAbsenteismo(dataInicio, dataFim) {
    try {
      const response = await axios.get(`${API_URL}/absenteismo`, {
        params: { dataInicio, dataFim }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar absenteísmo:', error);
      throw error;
    }
  },
  
  async syncAbsenteismo(dataInicio, dataFim) {
    try {
      const response = await axios.post(`${API_URL}/absenteismo/sync`, {
        dataInicio,
        dataFim
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar absenteísmo:', error);
      throw error;
    }
  },

  async getDashboardData(dataInicio, dataFim) {
    try {
      const response = await axios.get(`${API_URL}/absenteismo/dashboard`, {
        params: { dataInicio, dataFim }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      throw error;
    }
  }
};

const planoService = {
  async getPlanoAtual() {
    try {
      const response = await axios.get(`${API_URL}/planos/atual`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar plano atual:', error);
      throw error;
    }
  },
  
  async atualizarParaPremium() {
    try {
      const response = await axios.post(`${API_URL}/planos/premium`);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar para plano premium:', error);
      throw error;
    }
  }
};

const jobQueueService = {
  async getSyncJobs(limit = 100, offset = 0) {
    try {
      const response = await axios.get(`${API_URL}/sync-jobs`, {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar jobs de sincronização:', error);
      throw error;
    }
  }
};

export {
  apiConfigService,
  funcionarioService,
  absenteismoService,
  planoService,
  jobQueueService
};

export default {
  apiConfig: apiConfigService,
  funcionario: funcionarioService,
  absenteismo: absenteismoService,
  plano: planoService,
  jobQueue: jobQueueService
};
