import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const apiConfigService = {
  async getConfigurations() {
    try {
      const response = await axios.get(`${API_URL}/api-config`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      // Retorna um objeto de configuração padrão em caso de erro
      return {
        funcionario: {
          empresa_padrao: '',
          codigo: '',
          chave: '',
          ativo: true,
          inativo: false,
          afastado: false,
          pendente: false,
          ferias: false
        },
        absenteismo: {
          empresa_padrao: '',
          codigo: '',
          chave: '',
          dataInicio: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString().split('T')[0],
          dataFim: new Date().toISOString().split('T')[0]
        }
      };
    }
  },
  
  async saveConfiguration(apiType, config) {
    try {
      const response = await axios.post(`${API_URL}/api-config/${apiType}`, config);
      return response.data;
    } catch (error) {
      console.error(`Erro ao salvar configuração de ${apiType}:`, error);
      // Retorna resposta padrão para evitar erros no frontend
      return {
        message: 'Falha ao salvar configuração, tente novamente mais tarde',
        config: config
      };
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
      // Retorna array vazio em caso de erro para evitar quebra no frontend
      return [];
    }
  },
  
  async syncFuncionarios() {
    try {
      const response = await axios.post(`${API_URL}/funcionarios/sync`);
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar funcionários:', error);
      // Retorna objeto de resposta padrão em caso de erro
      return {
        success: false,
        message: 'Falha na sincronização, verifique a configuração da API'
      };
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
      // Retorna array vazio em caso de erro
      return [];
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
      // Retorna objeto de resposta padrão em caso de erro
      return {
        success: false,
        message: 'Falha na sincronização, verifique a configuração da API'
      };
    }
  },

  async getDashboardData(dataInicio, dataFim, empresaId) {
    try {
      const response = await axios.get(`${API_URL}/absenteismo/dashboard`, {
        params: { dataInicio, dataFim, empresaId }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      // Retorna objeto com estrutura padrão para evitar erros no frontend
      return {
        indicadores: {
          taxaAbsenteismo: 0,
          prejuizoTotal: 0,
          totalDiasAfastamento: 0,
          totalHorasAfastamento: 0,
          totalAtestados: 0,
          totalFuncionariosAfastados: 0,
          totalFuncionarios: 0
        },
        setoresMaisAfetados: [],
        topCids: [],
        evolucaoMensal: [],
        distribuicaoPorSexo: [],
        distribuicaoPorDiaSemana: [],
        prejuizoPorCid: []
      };
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
      // Retorna plano gratuito padrão em caso de erro
      return {
        tipo_plano: 'gratuito',
        recursos_disponíveis: [
          'dashboard_basico',
          'grafico_evolucao',
          'top_cids',
          'setores_afetados'
        ]
      };
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
      // Retorna array vazio em caso de erro
      return [];
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
