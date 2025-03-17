const axios = require('axios');
const { pool } = require('../db');

// URL base da API SOC
const SOC_API_URL = 'https://ws1.soc.com.br/WebSoc/exportadados';

/**
 * Obtém as configurações de API do usuário
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 * @param {Function} next - Função next do Express
 */
exports.getConfigurations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Buscar configurações de API do usuário
    const result = await pool.query(
      `SELECT api_type, empresa_principal, codigo, chave, 
              ativo, inativo, afastado, pendente, ferias
       FROM api_configurations 
       WHERE user_id = $1`,
      [userId]
    );
    
    // Transformar resultado em objeto agrupado por tipo de API
    const configs = {};
    
    result.rows.forEach(row => {
      configs[row.api_type] = {
        empresa_principal: row.empresa_principal,
        codigo: row.codigo,
        chave: row.chave
      };
      
      // Adicionar campos específicos para cada tipo de API
      if (row.api_type === 'funcionario') {
        configs[row.api_type] = {
          ...configs[row.api_type],
          ativo: row.ativo,
          inativo: row.inativo,
          afastado: row.afastado,
          pendente: row.pendente,
          ferias: row.ferias
        };
      } else if (row.api_type === 'absenteismo') {
        const today = new Date();
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(today.getMonth() - 2);
        
        configs[row.api_type] = {
          ...configs[row.api_type],
          dataInicio: twoMonthsAgo.toISOString().split('T')[0],
          dataFim: today.toISOString().split('T')[0]
        };
      }
    });
    
    // Buscar empresas disponíveis para seleção
    const empresasResult = await pool.query(
      `SELECT codigo, razao_social FROM empresas WHERE user_id = $1 AND ativo = true ORDER BY razao_social`,
      [userId]
    );
    
    configs.empresasDisponiveis = empresasResult.rows;
    
    res.status(200).json(configs);
  } catch (error) {
    next(error);
  }
};

/**
 * Salva uma configuração de API
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 * @param {Function} next - Função next do Express
 */
exports.saveConfiguration = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const apiType = req.params.apiType;
    const config = req.body;
    
    // Validar tipo de API
    const validApiTypes = ['empresa', 'funcionario', 'absenteismo'];
    if (!validApiTypes.includes(apiType)) {
      return res.status(400).json({ message: 'Tipo de API inválido' });
    }
    
    // Campos comuns a todas as APIs
    const { empresa_principal, codigo, chave } = config;
    
    // Query base para atualização
    let query = `
      UPDATE api_configurations
      SET empresa_principal = $1, 
          codigo = $2, 
          chave = $3,
          updated_at = CURRENT_TIMESTAMP
    `;
    
    // Parâmetros para a query
    const params = [empresa_principal, codigo, chave, userId, apiType];
    
    // Se for API de funcionário, incluir os campos adicionais
    if (apiType === 'funcionario') {
      const { ativo, inativo, afastado, pendente, ferias } = config;
      query += `, ativo = $6, inativo = $7, afastado = $8, pendente = $9, ferias = $10`;
      params.splice(4, 0, ativo, inativo, afastado, pendente, ferias);
    }
    
    // Completar query
    query += ` WHERE user_id = $4 AND api_type = $5`;
    
    // Executar atualização
    await pool.query(query, params);
    
    // Preparar resposta
    const responseConfig = {
      empresa_principal,
      codigo,
      chave
    };
    
    // Adicionar campos específicos na resposta
    if (apiType === 'funcionario') {
      const { ativo, inativo, afastado, pendente, ferias } = config;
      responseConfig.ativo = ativo;
      responseConfig.inativo = inativo;
      responseConfig.afastado = afastado;
      responseConfig.pendente = pendente;
      responseConfig.ferias = ferias;
    }
    
    res.status(200).json({ 
      message: 'Configuração salva com sucesso',
      apiType,
      config: responseConfig
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Testa a conexão com a API SOC
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 * @param {Function} next - Função next do Express
 */
exports.testConnection = async (req, res, next) => {
  try {
    const { type, empresa_principal, codigo, chave, ativo, inativo, afastado, pendente, ferias } = req.body;
    
    // Validar tipo de API
    const validApiTypes = ['empresa', 'funcionario', 'absenteismo'];
    if (!validApiTypes.includes(type)) {
      return res.status(400).json({ message: 'Tipo de API inválido' });
    }
    
    // Validar campos obrigatórios
    if (!empresa_principal || !codigo || !chave) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }
    
    // Construir parâmetros de acordo com o tipo de API
    let parametros = {
      empresa: empresa_principal,
      codigo: codigo,
      chave: chave,
      tipoSaida: 'json'
    };
    
    // Adicionar parâmetros específicos para cada tipo de API
    if (type === 'funcionario') {
      if (ativo) parametros.ativo = 'Sim';
      if (inativo) parametros.inativo = 'Sim';
      if (afastado) parametros.afastado = 'Sim';
      if (pendente) parametros.pendente = 'Sim';
      if (ferias) parametros.ferias = 'Sim';
    } else if (type === 'absenteismo') {
      const today = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      
      parametros.dataInicio = oneMonthAgo.toISOString().split('T')[0];
      parametros.dataFim = today.toISOString().split('T')[0];
    }
    
    // Converter parâmetros para string JSON
    const parametrosString = JSON.stringify(parametros);
    
    // Fazer requisição para a API SOC
    const response = await axios.get(`${SOC_API_URL}?parametro=${encodeURIComponent(parametrosString)}`);
    
    // Verificar se a resposta é válida
    if (response.status !== 200) {
      return res.status(400).json({ 
        success: false,
        message: 'Erro ao conectar com a API SOC' 
      });
    }
    
    // Tentar decodificar a resposta
    const responseData = response.data;
    let parsedData;
    
    try {
      // Se a resposta for uma string, tentar decodificar como JSON
      if (typeof responseData === 'string') {
        parsedData = JSON.parse(responseData);
      } else {
        parsedData = responseData;
      }
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: 'Erro ao processar resposta da API SOC' 
      });
    }
    
    // Verificar se há erros na resposta
    if (parsedData.error) {
      return res.status(400).json({ 
        success: false,
        message: `Erro na API SOC: ${parsedData.error}` 
      });
    }
    
    // Verificar se a resposta contém dados
    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'A API SOC não retornou dados' 
      });
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Conexão com a API SOC realizada com sucesso',
      count: parsedData.length
    });
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Erro ao testar conexão com a API SOC',
      error: error.message
    });
  }
};

/**
 * Faz requisição para a API SOC
 * @param {Object} parametros - Parâmetros da requisição
 * @returns {Promise<Array>} - Dados retornados da API
 */
exports.requestSocApi = async (parametros) => {
  try {
    // Converter parâmetros para string JSON
    const parametrosString = JSON.stringify(parametros);
    
    // Fazer requisição para a API SOC
    const response = await axios.get(`${SOC_API_URL}?parametro=${encodeURIComponent(parametrosString)}`);
    
    // Verificar se a resposta é válida
    if (response.status !== 200) {
      throw new Error('Erro ao conectar com a API SOC');
    }
    
    // Decodificar a resposta
    const responseData = response.data;
    let parsedData;
    
    try {
      // Se a resposta for uma string, tentar decodificar como JSON
      if (typeof responseData === 'string') {
        // Se for uma string codificada em latin1, converter para UTF-8
        const decodedData = Buffer.from(responseData, 'latin1').toString('utf8');
        parsedData = JSON.parse(decodedData);
      } else {
        parsedData = responseData;
      }
    } catch (error) {
      throw new Error('Erro ao processar resposta da API SOC');
    }
    
    // Verificar se há erros na resposta
    if (parsedData.error) {
      throw new Error(`Erro na API SOC: ${parsedData.error}`);
    }
    
    // Verificar se a resposta contém dados
    if (!Array.isArray(parsedData)) {
      throw new Error('A API SOC não retornou dados no formato esperado');
    }
    
    return parsedData;
  } catch (error) {
    console.error('Erro na requisição SOC API:', error);
    throw error;
  }
};
