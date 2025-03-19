const { pool } = require('../db');
const axios = require('axios');

const SOC_API_URL = 'https://ws1.soc.com.br/WebSoc/exportadados';

exports.getConfigurations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT api_type, empresa_padrao, codigo, chave, 
              ativo, inativo, afastado, pendente, ferias,
              data_inicio, data_fim
       FROM api_configurations 
       WHERE user_id = $1`,
      [userId]
    );
    
    const configs = {};
    
    result.rows.forEach(row => {
      configs[row.api_type] = {
        empresa_padrao: row.empresa_padrao || '',
        codigo: row.codigo || '',
        chave: row.chave || ''
      };
      
      if (row.api_type === 'funcionario') {
        configs[row.api_type] = {
          ...configs[row.api_type],
          ativo: row.ativo === 'Sim',
          inativo: row.inativo === 'Sim',
          afastado: row.afastado === 'Sim',
          pendente: row.pendente === 'Sim',
          ferias: row.ferias === 'Sim'
        };
      } else if (row.api_type === 'absenteismo') {
        const today = new Date();
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(today.getMonth() - 2);
        
        configs[row.api_type] = {
          ...configs[row.api_type],
          dataInicio: row.data_inicio || twoMonthsAgo.toISOString().split('T')[0],
          dataFim: row.data_fim || today.toISOString().split('T')[0]
        };
      }
    });
    
    res.status(200).json(configs);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({
      message: 'Erro ao buscar configurações',
      error: error.message
    });
  }
};

exports.saveConfiguration = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const apiType = req.params.apiType;
    const config = req.body;
    
    const validApiTypes = ['funcionario', 'absenteismo'];
    if (!validApiTypes.includes(apiType)) {
      return res.status(400).json({ message: 'Tipo de API inválido' });
    }
    
    const { 
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
    } = config;
    
    await client.query('BEGIN');
    
    const checkResult = await client.query(
      'SELECT id FROM api_configurations WHERE user_id = $1 AND api_type = $2',
      [userId, apiType]
    );
    
    if (checkResult.rows.length === 0) {
      let insertQuery = `
        INSERT INTO api_configurations (
          user_id, api_type, empresa_padrao, codigo, chave,
          ativo, inativo, afastado, pendente, ferias,
          data_inicio, data_fim
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      
      const insertParams = [
        userId, 
        apiType, 
        empresa_padrao, 
        codigo, 
        chave,
        ativo === true ? 'Sim' : '',
        inativo === true ? 'Sim' : '',
        afastado === true ? 'Sim' : '',
        pendente === true ? 'Sim' : '',
        ferias === true ? 'Sim' : '',
        dataInicio || null,
        dataFim || null
      ];
      
      await client.query(insertQuery, insertParams);
    } else {
      let updateQuery = `
        UPDATE api_configurations
        SET empresa_padrao = $1,
            codigo = $2, 
            chave = $3,
            ativo = $4,
            inativo = $5,
            afastado = $6,
            pendente = $7,
            ferias = $8,
            data_inicio = $9,
            data_fim = $10,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $11 AND api_type = $12
      `;
      
      const updateParams = [
        empresa_padrao,
        codigo,
        chave,
        ativo === true ? 'Sim' : '',
        inativo === true ? 'Sim' : '',
        afastado === true ? 'Sim' : '',
        pendente === true ? 'Sim' : '',
        ferias === true ? 'Sim' : '',
        dataInicio || null,
        dataFim || null,
        userId,
        apiType
      ];
      
      await client.query(updateQuery, updateParams);
    }
    
    await client.query('COMMIT');
    
    res.status(200).json({ 
      message: 'Configuração salva com sucesso',
      config: {
        empresa_padrao,
        codigo,
        chave,
        ativo: ativo === true,
        inativo: inativo === true,
        afastado: afastado === true,
        pendente: pendente === true,
        ferias: ferias === true,
        dataInicio,
        dataFim
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao salvar configuração:', error);
    res.status(500).json({
      message: 'Erro ao salvar configuração',
      error: error.message
    });
  } finally {
    client.release();
  }
};

exports.testConnection = async (req, res, next) => {
  try {
    const { type, empresa_padrao, codigo, chave, ativo, inativo, afastado, pendente, ferias } = req.body;
    
    const validApiTypes = ['funcionario', 'absenteismo'];
    if (!validApiTypes.includes(type)) {
      return res.status(400).json({ message: 'Tipo de API inválido' });
    }
    
    if (!empresa_padrao || !codigo || !chave) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
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
    
    const parametrosString = JSON.stringify(parametros);
    
    const response = await axios.get(`${SOC_API_URL}?parametro=${encodeURIComponent(parametrosString)}`);
    
    if (response.status !== 200) {
      return res.status(400).json({ 
        success: false,
        message: 'Erro ao conectar com a API SOC' 
      });
    }
    
    const responseData = response.data;
    let parsedData;
    
    try {
      parsedData = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      return res.status(400).json({ 
        success: false,
        message: 'Erro ao processar resposta da API SOC' 
      });
    }
    
    if (parsedData.error) {
      return res.status(400).json({ 
        success: false,
        message: `Erro na API SOC: ${parsedData.error}` 
      });
    }
    
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
