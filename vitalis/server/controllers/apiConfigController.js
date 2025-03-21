const { pool } = require('../db');
const axios = require('axios');

const SOC_API_URL = 'https://ws1.soc.com.br/WebSoc/exportadados';

exports.getConfigurations = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id || 1;
    console.log('Fetching configurations for user:', userId);
    
    // First, check if user exists
    const userExists = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userExists.rows.length === 0) {
      console.log('User not found, returning default configurations');
      return res.status(200).json({
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
      });
    }
    
    // Get existing configurations
    const result = await client.query(
      `SELECT api_type, empresa_padrao, codigo, chave, 
              ativo, inativo, afastado, pendente, ferias,
              data_inicio, data_fim
       FROM api_configurations 
       WHERE user_id = $1`,
      [userId]
    );
    
    // Default configuration structure
    const configs = {
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
    
    // Update with existing values if found
    result.rows.forEach(row => {
      if (row.api_type === 'funcionario') {
        configs.funcionario = {
          empresa_padrao: row.empresa_padrao || '',
          codigo: row.codigo || '',
          chave: row.chave || '',
          ativo: row.ativo === 'Sim',
          inativo: row.inativo === 'Sim',
          afastado: row.afastado === 'Sim',
          pendente: row.pendente === 'Sim',
          ferias: row.ferias === 'Sim'
        };
      } else if (row.api_type === 'absenteismo') {
        configs.absenteismo = {
          empresa_padrao: row.empresa_padrao || '',
          codigo: row.codigo || '',
          chave: row.chave || '',
          dataInicio: row.data_inicio || configs.absenteismo.dataInicio,
          dataFim: row.data_fim || configs.absenteismo.dataFim
        };
      }
    });
    
    return res.status(200).json(configs);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    // Return default configs instead of error
    return res.status(200).json({
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
    });
  } finally {
    client.release();
  }
};

exports.saveConfiguration = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id || 1;
    const apiType = req.params.apiType;
    const config = req.body;
    
    console.log('Saving configuration:', apiType, 'for user:', userId);
    
    // Make sure user exists
    const userExists = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userExists.rows.length === 0) {
      console.log('User not found, cannot save configuration');
      return res.status(200).json({
        message: 'User not found, using default values',
        config: config
      });
    }
    
    const empresa_padrao = config.empresa_padrao || '';
    const codigo = config.codigo || '';
    const chave = config.chave || '';
    const ativo = config.ativo === true ? 'Sim' : '';
    const inativo = config.inativo === true ? 'Sim' : '';
    const afastado = config.afastado === true ? 'Sim' : '';
    const pendente = config.pendente === true ? 'Sim' : '';
    const ferias = config.ferias === true ? 'Sim' : '';
    const dataInicio = config.dataInicio || null;
    const dataFim = config.dataFim || null;
    
    // Check if configuration exists
    const existingConfig = await client.query(
      'SELECT id FROM api_configurations WHERE user_id = $1 AND api_type = $2',
      [userId, apiType]
    );
    
    // Create SQL statement based on existence
    let query, params;
    if (existingConfig.rows.length === 0) {
      query = `
        INSERT INTO api_configurations (
          user_id, api_type, empresa_padrao, codigo, chave,
          ativo, inativo, afastado, pendente, ferias,
          data_inicio, data_fim
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
    } else {
      query = `
        UPDATE api_configurations SET
          empresa_padrao = $3,
          codigo = $4,
          chave = $5,
          ativo = $6,
          inativo = $7,
          afastado = $8,
          pendente = $9,
          ferias = $10,
          data_inicio = $11,
          data_fim = $12,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND api_type = $2
      `;
    }
    
    params = [
      userId,
      apiType,
      empresa_padrao,
      codigo,
      chave,
      ativo,
      inativo,
      afastado,
      pendente,
      ferias,
      dataInicio,
      dataFim
    ];
    
    // Execute query
    await client.query(query, params);
    
    return res.status(200).json({
      message: 'Configuration saved successfully',
      config: {
        empresa_padrao,
        codigo,
        chave,
        ativo: ativo === 'Sim',
        inativo: inativo === 'Sim',
        afastado: afastado === 'Sim',
        pendente: pendente === 'Sim',
        ferias: ferias === 'Sim',
        dataInicio,
        dataFim
      }
    });
  } catch (error) {
    console.error('Error saving configuration:', error);
    return res.status(200).json({ 
      message: 'Error saving configuration. Default values will be used.',
      error: error.message,
      config: req.body
    });
  } finally {
    client.release();
  }
};

exports.testConnection = async (req, res, next) => {
  try {
    const { type, empresa_padrao, codigo, chave, ativo, inativo, afastado, pendente, ferias } = req.body;
    
    console.log('Testing connection with SOC API:', req.body);
    
    const validApiTypes = ['funcionario', 'absenteismo'];
    if (!validApiTypes.includes(type)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid API type' 
      });
    }
    
    if (!empresa_padrao || !codigo || !chave) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }
    
    let parametros = {
      empresa: empresa_padrao,
      codigo: codigo,
      chave: chave,
      tipoSaida: 'json'
    };
    
    if (type === 'funcionario') {
      if (ativo) parametros.ativo = 'Sim';
      if (inativo) parametros.inativo = 'Sim';
      if (afastado) parametros.afastado = 'Sim';
      if (pendente) parametros.pendente = 'Sim';
      if (ferias) parametros.ferias = 'Sim';
    }
    
    console.log('Parameters for SOC API:', parametros);
    
    try {
      const parametrosString = JSON.stringify(parametros);
      const url = `${SOC_API_URL}?parametro=${encodeURIComponent(parametrosString)}`;
      
      console.log('Request URL:', url);
      
      const response = await axios.get(url);
      
      console.log('SOC API response status:', response.status);
      
      if (response.status !== 200) {
        return res.status(400).json({ 
          success: false,
          message: 'Error connecting to SOC API' 
        });
      }
      
      const responseData = response.data;
      let parsedData;
      
      try {
        parsedData = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
        console.log('Parsed response:', parsedData.length ? `${parsedData.length} records` : 'No records');
      } catch (error) {
        console.error('Error processing response:', error);
        return res.status(400).json({ 
          success: false,
          message: 'Error processing SOC API response' 
        });
      }
      
      if (parsedData.error) {
        console.error('Error in API response:', parsedData.error);
        return res.status(400).json({ 
          success: false,
          message: `SOC API error: ${parsedData.error}` 
        });
      }
      
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'The SOC API did not return any data' 
        });
      }
      
      res.status(200).json({ 
        success: true,
        message: 'Connection to SOC API successful',
        count: parsedData.length
      });
    } catch (error) {
      console.error('Error connecting to SOC API:', error.message);
      
      return res.status(400).json({ 
        success: false,
        message: `Error connecting to SOC API: ${error.message}`
      });
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Error testing connection with SOC API',
      error: error.message
    });
  }
};

// Helper method for use by other controllers
exports.requestSocApi = async (params) => {
  try {
    const parametrosString = JSON.stringify(params);
    console.log('SOC API parameters:', parametrosString);
    
    const response = await axios.get(`${SOC_API_URL}?parametro=${encodeURIComponent(parametrosString)}`);
    
    // Check if response is valid
    if (response.status !== 200) {
      throw new Error('Error connecting to SOC API');
    }
    
    // Process response
    const responseData = response.data;
    let parsedData;
    
    try {
      parsedData = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      throw new Error('Error processing SOC API response');
    }
    
    // Check for error in response
    if (parsedData.error) {
      throw new Error(`SOC API error: ${parsedData.error}`);
    }
    
    // Check if returned an array
    if (!Array.isArray(parsedData)) {
      throw new Error('The SOC API did not return a data array');
    }
    
    return parsedData;
  } catch (error) {
    console.error('Error querying SOC API:', error);
    throw error;
  }
};
