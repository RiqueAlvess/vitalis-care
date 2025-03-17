import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Typography, TextField, Button,
  Tabs, Tab, Box, Alert, CircularProgress, Snackbar,
  Divider, Card, CardContent, CardActions, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import TestIcon from '@mui/icons-material/PlayCircleFilled';
import SyncIcon from '@mui/icons-material/Sync';
import InfoIcon from '@mui/icons-material/Info';
import { format, subMonths } from 'date-fns';
import { apiConfigService, empresaService, funcionarioService, absenteismoService } from '../../services/apiService';

const Settings = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [infoDialog, setInfoDialog] = useState({ open: false, title: '', content: '' });
  const [empresas, setEmpresas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  
  // Configurações de APIs
  const [configurations, setConfigurations] = useState({
    empresa: {
      empresa_principal: '',
      codigo: '',
      chave: ''
    },
    funcionario: {
      empresa_principal: '',
      codigo: '',
      chave: '',
      ativo: 'Sim',
      inativo: '',
      afastado: '',
      pendente: '',
      ferias: ''
    },
    absenteismo: {
      empresa_principal: '',
      codigo: '',
      chave: '',
      dataInicio: format(subMonths(new Date(), 2), 'yyyy-MM-dd'),
      dataFim: format(new Date(), 'yyyy-MM-dd')
    }
  });
  
  useEffect(() => {
    fetchConfigurations();
  }, []);
  
  useEffect(() => {
    if (!loading) {
      // Tentar carregar empresas se as configurações já estiverem carregadas
      fetchEmpresas();
    }
  }, [loading]);
  
  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const configs = await apiConfigService.getConfigurations();
      
      // Mapeie as configurações recebidas para o estado local
      const updatedConfigs = { ...configurations };
      
      Object.keys(configs).forEach(apiType => {
        if (configs[apiType]) {
          updatedConfigs[apiType] = {
            ...updatedConfigs[apiType],
            ...configs[apiType]
          };
        }
      });
      
      setConfigurations(updatedConfigs);
    } catch (error) {
      showNotification('Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchEmpresas = async () => {
    try {
      const result = await empresaService.getEmpresas();
      setEmpresas(result);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };
  
  const fetchFuncionarios = async (empresaId) => {
    try {
      const result = await funcionarioService.getFuncionarios(empresaId);
      setFuncionarios(result);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleInputChange = (apiType, field, value) => {
    setConfigurations(prev => ({
      ...prev,
      [apiType]: {
        ...prev[apiType],
        [field]: value
      }
    }));
    
    // Se estiver mudando empresa_principal, atualizar outros campos também
    if (field === 'empresa_principal') {
      setConfigurations(prev => ({
        ...prev,
        funcionario: {
          ...prev.funcionario,
          empresa_principal: value
        },
        absenteismo: {
          ...prev.absenteismo,
          empresa_principal: value
        }
      }));
    }
  };
  
  const handleDateChange = (apiType, field, date) => {
    const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
    
    handleInputChange(apiType, field, formattedDate);
  };
  
  const handleSaveConfig = async (apiType) => {
    try {
      setLoading(true);
      await apiConfigService.saveConfiguration(apiType, configurations[apiType]);
      showNotification(`Configurações de ${getApiTypeLabel(apiType)} salvas com sucesso`, 'success');
    } catch (error) {
      showNotification(`Erro ao salvar configurações de ${getApiTypeLabel(apiType)}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestConnection = async (apiType) => {
    try {
      setTestLoading(true);
      const result = await apiConfigService.testConnection({
        type: apiType,
        ...configurations[apiType]
      });
      
      if (result.success) {
        showNotification(`Conexão com API de ${getApiTypeLabel(apiType)} testada com sucesso`, 'success');
      } else {
        showNotification(`Erro no teste de conexão: ${result.message}`, 'error');
      }
    } catch (error) {
      showNotification(`Erro ao testar conexão com API de ${getApiTypeLabel(apiType)}`, 'error');
    } finally {
      setTestLoading(false);
    }
  };
  
  const handleSync = async (apiType) => {
    try {
      setSyncLoading(true);
      let result;
      
      switch (apiType) {
        case 'empresa':
          result = await empresaService.syncEmpresas();
          // Atualizar lista de empresas após sincronização
          if (result.success) await fetchEmpresas();
          break;
        case 'funcionario':
          result = await funcionarioService.syncFuncionarios(empresaSelecionada);
          break;
        case 'absenteismo':
          result = await absenteismoService.syncAbsenteismo(
            configurations.absenteismo.dataInicio,
            configurations.absenteismo.dataFim,
            empresaSelecionada
          );
          break;
        default:
          throw new Error(`Tipo de API inválido: ${apiType}`);
      }
      
      if (result.success) {
        showNotification(`Sincronização de ${getApiTypeLabel(apiType)} realizada com sucesso. ${result.count || 0} registros importados.`, 'success');
      } else {
        showNotification(`Erro na sincronização: ${result.message}`, 'error');
      }
    } catch (error) {
      showNotification(`Erro ao sincronizar dados de ${getApiTypeLabel(apiType)}`, 'error');
    } finally {
      setSyncLoading(false);
    }
  };
  
  const handleEmpresaChange = (event) => {
    const empresaId = event.target.value;
    setEmpresaSelecionada(empresaId);
    
    if (empresaId) {
      fetchFuncionarios(empresaId);
    } else {
      setFuncionarios([]);
    }
  };
  
  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  const closeNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };
  
  const showInfoDialog = (apiType) => {
    let title = '';
    let content = '';
    
    switch (apiType) {
      case 'empresa':
        title = 'Configuração da API de Empresas';
        content = `
          Esta API retorna os dados das empresas cadastradas no sistema SOC.
          
          Parâmetros necessários:
          - Empresa Principal: Código numérico da empresa principal
          - Código: Código de acesso à API
          - Chave: Chave de segurança alfanumérica
          
          Estrutura do retorno:
          - CODIGO: Código da empresa
          - NOMEABREVIADO: Nome abreviado
          - RAZAOSOCIAL: Razão social
          - CNPJ: CNPJ da empresa
          - Entre outros campos...
        `;
        break;
      case 'funcionario':
        title = 'Configuração da API de Funcionários';
        content = `
          Esta API retorna os dados dos funcionários cadastrados no sistema SOC.
          
          Parâmetros necessários:
          - Empresa Principal: Código numérico da empresa principal
          - Código: Código de acesso à API
          - Chave: Chave de segurança alfanumérica
          
          Parâmetros opcionais:
          - Ativo: Filtro para funcionários ativos
          - Inativo: Filtro para funcionários inativos
          - Afastado: Filtro para funcionários afastados
          - Pendente: Filtro para funcionários pendentes
          - Férias: Filtro para funcionários em férias
          
          Estrutura do retorno:
          - CODIGO: Código do funcionário
          - NOME: Nome completo
          - CODIGOEMPRESA: Código da empresa
          - NOMEEMPRESA: Nome da empresa
          - Entre outros campos...
        `;
        break;
      case 'absenteismo':
        title = 'Configuração da API de Absenteísmo';
        content = `
          Esta API retorna os dados de absenteísmo dos funcionários.
          
          Parâmetros necessários:
          - Empresa Principal: Código numérico da empresa principal
          - Código: Código de acesso à API
          - Chave: Chave de segurança alfanumérica
          - Data Início: Data inicial do período de consulta
          - Data Fim: Data final do período de consulta
          
          Estrutura do retorno:
          - UNIDADE: Unidade do funcionário
          - SETOR: Setor do funcionário
          - MATRICULA_FUNC: Matrícula do funcionário
          - DT_INICIO_ATESTADO: Data de início do atestado
          - DT_FIM_ATESTADO: Data de fim do atestado
          - DIAS_AFASTADOS: Número de dias de afastamento
          - CID_PRINCIPAL: CID principal do atestado
          - Entre outros campos...
        `;
        break;
      default:
        title = 'Informações da API';
        content = 'Informações não disponíveis.';
    }
    
    setInfoDialog({
      open: true,
      title,
      content
    });
  };
  
  const closeInfoDialog = () => {
    setInfoDialog(prev => ({
      ...prev,
      open: false
    }));
  };
  
  const getApiTypeLabel = (apiType) => {
    switch (apiType) {
      case 'empresa':
        return 'Empresas';
      case 'funcionario':
        return 'Funcionários';
      case 'absenteismo':
        return 'Absenteísmo';
      default:
        return apiType;
    }
  };
  
  if (loading && Object.keys(configurations.empresa).length <= 3) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Configurações da API
      </Typography>
      
      <Paper sx={{ p: 0, mb: 4 }} elevation={3}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Empresas" />
          <Tab label="Funcionários" />
          <Tab label="Absenteísmo" />
        </Tabs>
        
        {/* Tab de Configuração de Empresas */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Configuração da API de Empresas
                    </Typography>
                    <IconButton onClick={() => showInfoDialog('empresa')} color="primary">
                      <InfoIcon />
                    </IconButton>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Empresa Principal"
                        variant="outlined"
                        value={configurations.empresa.empresa_principal}
                        onChange={(e) => handleInputChange('empresa', 'empresa_principal', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Código"
                        variant="outlined"
                        value={configurations.empresa.codigo}
                        onChange={(e) => handleInputChange('empresa', 'codigo', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Chave"
                        variant="outlined"
                        value={configurations.empresa.chave}
                        onChange={(e) => handleInputChange('empresa', 'chave', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<TestIcon />}
                    onClick={() => handleTestConnection('empresa')}
                    disabled={testLoading}
                    sx={{ mr: 1 }}
                  >
                    {testLoading ? 'Testando...' : 'Testar Conexão'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<SyncIcon />}
                    onClick={() => handleSync('empresa')}
                    disabled={syncLoading}
                    sx={{ mr: 1 }}
                  >
                    {syncLoading ? 'Sincronizando...' : 'Sincronizar Dados'}
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleSaveConfig('empresa')}
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            {/* Empresas sincronizadas */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Empresas Sincronizadas ({empresas.length})
                  </Typography>
                  
                  {empresas.length > 0 ? (
                    <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Código</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Razão Social</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>CNPJ</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Cidade/UF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empresas.map((empresa) => (
                            <tr key={empresa.id}>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{empresa.codigo}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{empresa.razao_social}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{empresa.cnpj}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{empresa.cidade}/{empresa.uf}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  ) : (
                    <Typography variant="body1" color="textSecondary" sx={{ py: 2 }}>
                      Nenhuma empresa sincronizada. Utilize o botão "Sincronizar Dados" acima para importar as empresas.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Tab de Configuração de Funcionários */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Configuração da API de Funcionários
                    </Typography>
                    <IconButton onClick={() => showInfoDialog('funcionario')} color="primary">
                      <InfoIcon />
                    </IconButton>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Empresa Principal"
                        variant="outlined"
                        value={configurations.funcionario.empresa_principal}
                        onChange={(e) => handleInputChange('funcionario', 'empresa_principal', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Código"
                        variant="outlined"
                        value={configurations.funcionario.codigo}
                        onChange={(e) => handleInputChange('funcionario', 'codigo', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Chave"
                        variant="outlined"
                        value={configurations.funcionario.chave}
                        onChange={(e) => handleInputChange('funcionario', 'chave', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Filtros opcionais
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <TextField
                        fullWidth
                        label="Ativo"
                        variant="outlined"
                        value={configurations.funcionario.ativo}
                        onChange={(e) => handleInputChange('funcionario', 'ativo', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <TextField
                        fullWidth
                        label="Inativo"
                        variant="outlined"
                        value={configurations.funcionario.inativo}
                        onChange={(e) => handleInputChange('funcionario', 'inativo', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <TextField
                        fullWidth
                        label="Afastado"
                        variant="outlined"
                        value={configurations.funcionario.afastado}
                        onChange={(e) => handleInputChange('funcionario', 'afastado', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <TextField
                        fullWidth
                        label="Pendente"
                        variant="outlined"
                        value={configurations.funcionario.pendente}
                        onChange={(e) => handleInputChange('funcionario', 'pendente', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <TextField
                        fullWidth
                        label="Férias"
                        variant="outlined"
                        value={configurations.funcionario.ferias}
                        onChange={(e) => handleInputChange('funcionario', 'ferias', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<TestIcon />}
                    onClick={() => handleTestConnection('funcionario')}
                    disabled={testLoading}
                    sx={{ mr: 1 }}
                  >
                    {testLoading ? 'Testando...' : 'Testar Conexão'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<SyncIcon />}
                    onClick={() => handleSync('funcionario')}
                    disabled={syncLoading}
                    sx={{ mr: 1 }}
                  >
                    {syncLoading ? 'Sincronizando...' : 'Sincronizar Dados'}
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleSaveConfig('funcionario')}
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            {/* Filtro de empresas e listagem de funcionários */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Funcionários
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      select
                      fullWidth
                      label="Filtrar por Empresa"
                      value={empresaSelecionada}
                      onChange={handleEmpresaChange}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    >
                      <MenuItem value="">Todas as Empresas</MenuItem>
                      {empresas.map((empresa) => (
                        <MenuItem key={empresa.id} value={empresa.codigo}>
                          {empresa.razao_social}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  
                  {funcionarios.length > 0 ? (
                    <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Matrícula</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Nome</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Empresa</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Setor</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Cargo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {funcionarios.map((funcionario) => (
                            <tr key={funcionario.id}>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{funcionario.matricula_funcionario}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{funcionario.nome}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{funcionario.nome_empresa}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{funcionario.nome_setor}</td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{funcionario.nome_cargo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  ) : (
                    <Typography variant="body1" color="textSecondary" sx={{ py: 2 }}>
                      {empresaSelecionada 
                        ? 'Nenhum funcionário encontrado para a empresa selecionada. Utilize o botão "Sincronizar Dados" acima para importar os funcionários.'
                        : 'Selecione uma empresa para visualizar os funcionários.'}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Tab de Configuração de Absenteísmo */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Configuração da API de Absenteísmo
                    </Typography>
                    <IconButton onClick={() => showInfoDialog('absenteismo')} color="primary">
                      <InfoIcon />
                    </IconButton>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Empresa Principal"
                        variant="outlined"
                        value={configurations.absenteismo.empresa_principal}
                        onChange={(e) => handleInputChange('absenteismo', 'empresa_principal', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Código"
                        variant="outlined"
                        value={configurations.absenteismo.codigo}
                        onChange={(e) => handleInputChange('absenteismo', 'codigo', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Chave"
                        variant="outlined"
                        value={configurations.absenteismo.chave}
                        onChange={(e) => handleInputChange('absenteismo', 'chave', e.target.value)}
                        margin="normal"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Período para sincronização
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        select
                        fullWidth
                        label="Filtrar por Empresa"
                        value={empresaSelecionada}
                        onChange={handleEmpresaChange}
                        variant="outlined"
                        margin="normal"
                      >
                        <MenuItem value="">Todas as Empresas</MenuItem>
                        {empresas.map((empresa) => (
                          <MenuItem key={empresa.id} value={empresa.codigo}>
                            {empresa.razao_social}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                        <DatePicker
                          label="Data Início"
                          value={configurations.absenteismo.dataInicio ? new Date(configurations.absenteismo.dataInicio) : null}
                          onChange={(date) => handleDateChange('absenteismo', 'dataInicio', date)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              variant: 'outlined',
                              margin: 'normal'
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                        <DatePicker
                          label="Data Fim"
                          value={configurations.absenteismo.dataFim ? new Date(configurations.absenteismo.dataFim) : null}
                          onChange={(date) => handleDateChange('absenteismo', 'dataFim', date)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              variant: 'outlined',
                              margin: 'normal'
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                  </Grid>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<TestIcon />}
                    onClick={() => handleTestConnection('absenteismo')}
                    disabled={testLoading}
                    sx={{ mr: 1 }}
                  >
                    {testLoading ? 'Testando...' : 'Testar Conexão'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<SyncIcon />}
                    onClick={() => handleSync('absenteismo')}
                    disabled={syncLoading}
                    sx={{ mr: 1 }}
                  >
                    {syncLoading ? 'Sincronizando...' : 'Sincronizar Dados'}
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleSaveConfig('absenteismo')}
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
      
      {/* Notificações */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={closeNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
      
      {/* Diálogo de informações */}
      <Dialog
        open={infoDialog.open}
        onClose={closeInfoDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{infoDialog.title}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line' }}>
            {infoDialog.content}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInfoDialog} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Componente auxiliar para as abas
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`api-config-tabpanel-${index}`}
      aria-labelledby={`api-config-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default Settings;
