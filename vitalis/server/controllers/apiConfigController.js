const { pool } = require('../db');
const axios = require('axios');

const SOC_API_URL = 'https://ws1.soc.com.br/WebSoc/exportadados';

exports.getConfigurations = async (req, res, next) => {
  const client = await pool.connect();
  try {
    // Para simplificar, vamos usar o ID 1 se não houver usuário autenticado
    const userId = req.user?.id || 1;
    console.log('Buscando configurações para o usuário:', userId);
    
    // Buscar configurações do usuário
    const result = await client.query(
      `SELECT api_type, empresa_padrao, codigo, chave, 
              ativo, inativo, afastado, pendente, ferias,
              data_inicio, data_fim
       FROM api_configurations 
       WHERE user_id = $1`,
      [userId]
    );
    
    const configs = {};
    
    // Criar configurações padrão se não existir
    if (result.rows.length === 0) {
      console.log('Nenhuma configuração encontrada, criando padrões...');
      // Iniciar configurações padrão
      await client.query('BEGIN');
      
      const apiTypes = ['funcionario', 'absenteismo'];
      
      for (const apiType of apiTypes) {
        await client.query(
          `INSERT INTO api_configurations (user_id, api_type, ativo) 
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, api_type) DO NOTHING`,
          [userId, apiType, 'Sim']
        );
      }
      
      await client.query('COMMIT');
      
      // Buscar as configurações novamente após inserir as padrão
      const newResult = await client.query(
        `SELECT api_type, empresa_padrao, codigo, chave, 
                ativo, inativo, afastado, pendente, ferias,
                data_inicio, data_fim
         FROM api_configurations 
         WHERE user_id = $1`,
        [userId]
      );
      
      console.log('Novas configurações criadas:', newResult.rows);
      
      newResult.rows.forEach(row => {
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
    } else {
      console.log('Configurações encontradas:', result.rows);
      
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
    }
    
    console.log('Configurações retornadas:', configs);
    res.status(200).json(configs);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({
      message: 'Erro ao buscar configurações',
      error: error.message
    });
  } finally {
    client.release();
  }
};

exports.saveConfiguration = async (req, res, next) => {
  const client = await pool.connect();
  try {
    // Para simplificar, vamos usar o ID 1 se não houver usuário autenticado
    const userId = req.user?.id || 1;
    const apiType = req.params.apiType;
    const config = req.body;
    
    console.log('Salvando configuração:', apiType, 'para usuário:', userId);
    console.log('Dados recebidos:', config);
    
    const validApiTypes = ['funcionario', 'absenteismo'];
    if (!validApiTypes.includes(apiType)) {
      return res.status(400).json({ message: 'Tipo de API inválido' });
    }
    
    // Extrair valores com defaults seguros
    const empresa_padrao = config.empresa_padrao || '';
    const codigo = config.codigo || '';
    const chave = config.chave || '';
    
    // Converter valores booleanos para 'Sim' ou string vazia
    const ativo = config.ativo === true ? 'Sim' : '';
    const inativo = config.inativo === true ? 'Sim' : '';
    const afastado = config.afastado === true ? 'Sim' : '';
    const pendente = config.pendente === true ? 'Sim' : '';
    const ferias = config.ferias === true ? 'Sim' : '';
    
    // Datas podem ser nulas
    const dataInicio = config.dataInicio || null;
    const dataFim = config.dataFim || null;
    
    await client.query('BEGIN');
    
    const checkResult = await client.query(
      'SELECT id FROM api_configurations WHERE user_id = $1 AND api_type = $2',
      [userId, apiType]
    );
    
    if (checkResult.rows.length === 0) {
      console.log('Inserindo nova configuração...');
      await client.query(
        `INSERT INTO api_configurations (
          user_id, api_type, empresa_padrao, codigo, chave,
          ativo, inativo, afastado, pendente, ferias,
          data_inicio, data_fim
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
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
        ]
      );
    } else {
      console.log('Atualizando configuração existente...');
      await client.query(
        `UPDATE api_configurations SET
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
        WHERE user_id = $1 AND api_type = $2`,
        [
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
        ]
      );
    }
    
    await client.query('COMMIT');
    
    console.log('Configuração salva com sucesso');
    
    // Retornar a configuração no mesmo formato esperado pelo frontend
    res.status(200).json({ 
      message: 'Configuração salva com sucesso',
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
    
    console.log('Testando conexão com a API SOC:', req.body);
    
    const validApiTypes = ['funcionario', 'absenteismo'];
    if (!validApiTypes.includes(type)) {
      return res.status(400).json({ 
        success: false,
        message: 'Tipo de API inválido' 
      });
    }
    
    if (!empresa_padrao || !codigo || !chave) {
      return res.status(400).json({ 
        success: false,
        message: 'Todos os campos são obrigatórios' 
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
    
    console.log('Parâmetros para API SOC:', parametros);
    
    try {
      const parametrosString = JSON.stringify(parametros);
      const url = `${SOC_API_URL}?parametro=${encodeURIComponent(parametrosString)}`;
      
      console.log('URL da requisição:', url);
      
      const response = await axios.get(url);
      
      console.log('Resposta da API SOC:', response.status);
      
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
        console.log('Resposta parseada:', parsedData.length ? `${parsedData.length} registros` : 'Nenhum registro');
      } catch (error) {
        console.error('Erro ao processar resposta:', error);
        return res.status(400).json({ 
          success: false,
          message: 'Erro ao processar resposta da API SOC' 
        });
      }
      
      if (parsedData.error) {
        console.error('Erro na resposta da API:', parsedData.error);
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
      console.error('Erro na conexão com a API SOC:', error.message);
      
      // Para evitar timeout nas requisições de teste
      return res.status(400).json({ 
        success: false,
        message: `Erro ao conectar com a API SOC: ${error.message}`
      });
    }
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Erro ao testar conexão com a API SOC',
      error: error.message
    });
  }
};

// Método auxiliar para uso por outros controladores
exports.requestSocApi = async (params) => {
  try {
    const parametrosString = JSON.stringify(params);
    console.log('Parâmetros SOC API:', parametrosString);
    
    const response = await axios.get(`${SOC_API_URL}?parametro=${encodeURIComponent(parametrosString)}`);
    
    // Verificar se a resposta é válida
    if (response.status !== 200) {
      throw new Error('Erro ao conectar com a API SOC');
    }
    
    // Processar resposta
    const responseData = response.data;
    let parsedData;
    
    try {
      parsedData = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      throw new Error('Erro ao processar resposta da API SOC');
    }
    
    // Verificar erro na resposta
    if (parsedData.error) {
      throw new Error(`Erro na API SOC: ${parsedData.error}`);
    }
    
    // Verificar se retornou um array
    if (!Array.isArray(parsedData)) {
      throw new Error('A API SOC não retornou um array de dados');
    }
    
    return parsedData;
  } catch (error) {
    console.error('Erro ao consultar API SOC:', error);
    throw error;
  }
};
