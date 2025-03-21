import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ConfigurationForm = () => {
  const [config, setConfig] = useState({
    empresa_padrao: '',
    codigo: '',
    chave: '',
    ativo: false,
    inativo: false,
    afastado: false,
    pendente: false,
    ferias: false,
  });

  useEffect(() => {
    axios.get('/api/configurations')
      .then(response => setConfig(response.data))
      .catch(error => console.error('Error fetching configuration:', error));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prevConfig => ({
      ...prevConfig,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('/api/configurations', config)
      .then(response => console.log('Configuration saved:', response))
      .catch(error => console.error('Error saving configuration:', error));
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Empresa Padrão:
        <input
          type="text"
          name="empresa_padrao"
          value={config.empresa_padrao}
          onChange={handleChange}
        />
      </label>
      <label>
        Código:
        <input
          type="text"
          name="codigo"
          value={config.codigo}
          onChange={handleChange}
        />
      </label>
      <label>
        Chave:
        <input
          type="text"
          name="chave"
          value={config.chave}
          onChange={handleChange}
        />
      </label>
      <label>
        Ativo:
        <input
          type="checkbox"
          name="ativo"
          checked={config.ativo}
          onChange={handleChange}
        />
      </label>
      <label>
        Inativo:
        <input
          type="checkbox"
          name="inativo"
          checked={config.inativo}
          onChange={handleChange}
        />
      </label>
      <label>
        Afastado:
        <input
          type="checkbox"
          name="afastado"
          checked={config.afastado}
          onChange={handleChange}
        />
      </label>
      <label>
        Pendente:
        <input
          type="checkbox"
          name="pendente"
          checked={config.pendente}
          onChange={handleChange}
        />
      </label>
      <label>
        Férias:
        <input
          type="checkbox"
          name="ferias"
          checked={config.ferias}
          onChange={handleChange}
        />
      </label>
      <button type="submit">Salvar Configuração</button>
    </form>
  );
};

export default ConfigurationForm;
