import React, { useState, useEffect } from 'react';
import { 
  Container, Grid, Paper, Typography, Box, Card, 
  Divider, CircularProgress, Button, IconButton,
  FormControl, InputLabel, Select, MenuItem, TextField,
  Tabs, Tab, Alert, Snackbar, Dialog, DialogTitle,
  DialogContent, DialogActions, CardContent, FormControlLabel,
  Checkbox, FormGroup, FormHelperText, useTheme, alpha
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import TestIcon from '@mui/icons-material/PlayCircleFilled';
import SyncIcon from '@mui/icons-material/Sync';
import InfoIcon from '@mui/icons-material/Info';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { format, subMonths } from 'date-fns';
import { apiConfigService, funcionarioService, absenteismoService } from '../../services/apiService';

const Settings = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [infoDialog, setInfoDialog] = useState({ open: false, title: '', content: '' });
  const [error, setError] = useState(null);
  
  // Configurations
  const [configurations, setConfigurations] = useState({
    funcionario: {
      empresa_padrao: '',
      codigo: '',
      chave: '',
      ativo: false,
      inativo: false,
      afastado: false,
      pendente: false,
      ferias: false
    },
    absenteismo: {
      empresa_padrao: '',
      codigo: '',
      chave: '',
      dataInicio: format(subMonths(new Date(), 2), 'yyyy-MM-dd'),
      dataFim: format(new Date(), 'yyyy-MM-dd')
    }
  });

  // Validation of required fields
  const [errors, setErrors] = useState({
    funcionario: {
      empresa_padrao: false,
      codigo: false,
      chave: false
    },
    absenteismo: {
      empresa_padrao: false,
      codigo: false,
      chave: false
    }
  });
  
  useEffect(() => {
    fetchConfigurations();
  }, []);
  
  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);
      const configs = await apiConfigService.getConfigurations();
      
      // Update state with loaded configurations
      const updatedConfigs = { ...configurations };
      
      Object.keys(configs).forEach(apiType => {
        if (configs[apiType] && typeof configs[apiType] === 'object') {
          updatedConfigs[apiType] = {
            ...updatedConfigs[apiType],
            ...configs[apiType]
          };
          
          // Convert values to boolean for checkboxes
          if (apiType === 'funcionario') {
            updatedConfigs[apiType].ativo = configs[apiType].ativo === true;
            updatedConfigs[apiType].inativo = configs[apiType].inativo === true;
            updatedConfigs[apiType].afastado = configs[apiType].afastado === true;
            updatedConfigs[apiType].pendente = configs[apiType].pendente === true;
            updatedConfigs[apiType].ferias = configs[apiType].ferias === true;
          }
        }
      });
      
      setConfigurations(updatedConfigs);
      showNotification('Configurações carregadas com sucesso', 'success');
    } catch (error) {
      setError('Erro ao carregar configurações: ' + (error.message || 'Erro desconhecido'));
      showNotification('Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
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
    
    // Clear error for this field if it exists
    if (errors[apiType] && errors[apiType][field]) {
      setErrors(prev => ({
        ...prev,
        [apiType]: {
          ...prev[apiType],
          [field]: false
        }
      }));
    }
  };
  
  const handleDateChange = (apiType, field, date) => {
    const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
    handleInputChange(apiType, field, formattedDate);
  };

  const validateConfigFields = (apiType) => {
    const config = configurations[apiType];
    const newErrors = { ...errors[apiType] };
    let isValid = true;

    // Validate fields for each API type
    if (apiType === 'funcionario' || apiType === 'absenteismo') {
      ['empresa_padrao', 'codigo', 'chave'].forEach(field => {
        if (!config[field]) {
          newErrors[field] = true;
          isValid = false;
        } else {
          newErrors[field] = false;
        }
      });
    }

    // Update errors
    setErrors(prev => ({
      ...prev,
      [apiType]: newErrors
    }));

    return isValid;
  };
  
  const handleSaveConfig = async (apiType) => {
    try {
      // Validate required fields before saving
      if (!validateConfigFields(apiType)) {
        showNotification('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      setSavingConfig(true);
      setError(null);
      
      // Create a copy of the configuration to avoid modifying state directly
      const dataToSave = { ...configurations[apiType] };
      
      console.log(`Salvando configuração ${apiType}:`, dataToSave);
      
      // Call API
      const result = await apiConfigService.saveConfiguration(apiType, dataToSave);
      
      // Update local state with saved configuration
      setConfigurations(prev => ({
        ...prev,
        [apiType]: result.config || prev[apiType]
      }));
      
      showNotification(`Configurações de ${getApiTypeLabel(apiType)} salvas com sucesso`, 'success');
    } catch (error) {
      console.error(`Erro ao salvar configuração ${apiType}:`, error);
      setError(`Erro ao salvar configurações de ${getApiTypeLabel(apiType)}: ${error.response?.data?.message || 'Tente novamente mais tarde'}`);
      showNotification(`Erro ao salvar configurações: ${error.message || 'Tente novamente mais tarde'}`, 'error');
    } finally {
      setSavingConfig(false);
    }
  };
  
  const handleSync = async (apiType) => {
    try {
      setSyncLoading(true);
      setError(null);
      
      let result;
      
      switch (apiType) {
        case 'funcionario':
          result = await funcionarioService.syncFuncionarios();
          break;
        case 'absenteismo':
          result = await absenteismoService.syncAbsenteismo(
            configurations.absenteismo.dataInicio,
            configurations.absenteismo.dataFim
          );
          break;
        default:
          throw new Error(`Tipo de API inválido: ${apiType}`);
      }
      
      if (result.success) {
        showNotification(`Job de sincronização de ${getApiTypeLabel(apiType)} adicionado à fila.`, 'success');
      } else {
        setError(`Erro na sincronização: ${result.message}`);
        showNotification(`Erro na sincronização: ${result.message}`, 'error');
      }
    } catch (error) {
      setError(`Erro ao sincronizar dados de ${getApiTypeLabel(apiType)}: ${error.message || 'Erro desconhecido'}`);
      showNotification(`Erro ao sincronizar dados de ${getApiTypeLabel(apiType)}`, 'error');
    } finally {
      setSyncLoading(false);
    }
  };
  
  const handleTestConnection = async (apiType) => {
    try {
      // Validate required fields before testing
      if (!validateConfigFields(apiType)) {
        showNotification('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      setTestLoading(true);
      setError(null);
      
      // Prepare data for testing
      const dataToTest = { ...configurations[apiType], type: apiType };
      
      const result = await apiConfigService.testConnection(dataToTest);
      
      if (result.success) {
        showNotification(`Conexão com API de ${getApiTypeLabel(apiType)} testada com sucesso`, 'success');
      } else {
        setError(`Erro no teste de conexão: ${result.message}`);
        showNotification(`Erro no teste de conexão: ${result.message}`, 'error');
      }
    } catch (error) {
      setError(`Erro ao testar conexão com API de ${getApiTypeLabel(apiType)}: ${error.message || 'Erro desconhecido'}`);
      showNotification(`Erro ao testar conexão com API de ${getApiTypeLabel(apiType)}`, 'error');
    } finally {
      setTestLoading(false);
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
      case 'funcionario':
        title = 'Configuração da API de Funcionários';
        content = `
          Esta API retorna os dados dos funcionários no sistema SOC.
          
          Parâmetros necessários:
          - Empresa Padrão: Código numérico da empresa
          - Código: Código de acesso à API
          - Chave: Chave de segurança alfanumérica
          
          Parâmetros opcionais:
          - Ativo: Filtro para funcionários ativos
          - Inativo: Filtro para funcionários inativos
          - Afastado: Filtro para funcionários afastados
          - Pendente: Filtro para funcionários pendentes
          - Férias: Filtro para funcionários em férias
        `;
        break;
      case 'absenteismo':
        title = 'Configuração da API de Absenteísmo';
        content = `
          Esta API retorna os dados de absenteísmo.
          
          Parâmetros necessários:
          - Empresa Padrão: Código numérico da empresa
          - Código: Código de acesso à API
          - Chave: Chave de segurança alfanumérica
          - Data Início: Data inicial do período de consulta
          - Data Fim: Data final do período de consulta
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
      case 'funcionario':
        return 'Funcionários';
      case 'absenteismo':
        return 'Absenteísmo';
      default:
        return apiType;
    }
  };

  // TabPanel component
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
  
  if (loading && !configurations) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 500 }}>
          Configurações da API
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={fetchConfigurations}
          startIcon={<SyncIcon />}
          sx={{ ml: 2 }}
          disabled={loading}
        >
          Atualizar
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 0, mb: 4, overflow: 'hidden', borderRadius: 2, boxShadow: theme.shadows[2] }} elevation={1}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              py: 2,
              fontSize: '1rem',
              textTransform: 'none'
            }
          }}
        >
          <Tab label="Funcionários" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Absenteísmo" id="tab-1" aria-controls="tabpanel-1" />
        </Tabs>
        
        {/* Funcionários Configuration Tab */}
        <TabPanel value={activeTab} index={0}>
          <Card variant="outlined" sx={{ border: 'none', boxShadow: 'none' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={500}>
                  Configuração da API de Funcionários
                </Typography>
                <IconButton 
                  onClick={() => showInfoDialog('funcionario')} 
                  color="primary"
                  size="small"
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}
                >
                  <InfoIcon />
                </IconButton>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Empresa Padrão"
                    variant="outlined"
                    value={configurations.funcionario.empresa_padrao}
                    onChange={(e) => handleInputChange('funcionario', 'empresa_padrao', e.target.value)}
                    margin="normal"
                    required
                    error={errors.funcionario.empresa_padrao}
                    helperText={errors.funcionario.empresa_padrao ? "Campo obrigatório" : ""}
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
                    required
                    error={errors.funcionario.codigo}
                    helperText={errors.funcionario.codigo ? "Campo obrigatório" : ""}
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
                    required
                    error={errors.funcionario.chave}
                    helperText={errors.funcionario.chave ? "Campo obrigatório" : ""}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                    Filtros para importação de funcionários
                  </Typography>
                  <FormGroup row sx={{ mt: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={configurations.funcionario.ativo}
                          onChange={(e) => handleInputChange('funcionario', 'ativo', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Ativo"
                      sx={{ mr: 3 }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={configurations.funcionario.inativo}
                          onChange={(e) => handleInputChange('funcionario', 'inativo', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Inativo"
                      sx={{ mr: 3 }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={configurations.funcionario.afastado}
                          onChange={(e) => handleInputChange('funcionario', 'afastado', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Afastado"
                      sx={{ mr: 3 }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={configurations.funcionario.pendente}
                          onChange={(e) => handleInputChange('funcionario', 'pendente', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Pendente"
                      sx={{ mr: 3 }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={configurations.funcionario.ferias}
                          onChange={(e) => handleInputChange('funcionario', 'ferias', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Férias"
                    />
                  </FormGroup>
                  <FormHelperText sx={{ mt: 1 }}>
                    Selecione os status de funcionários que deseja importar. 
                    Por padrão, são importados apenas funcionários ativos.
                  </FormHelperText>
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<TestIcon />}
                  onClick={() => handleTestConnection('funcionario')}
                  disabled={testLoading || savingConfig}
                >
                  {testLoading ? 'Testando...' : 'Testar Conexão'}
                </Button>
                
                <Button 
                  variant="outlined" 
                  color="secondary"
                  startIcon={
                    <SyncIcon 
                      className={syncLoading ? "icon-spin" : ""}
                    />
                  }
                  onClick={() => handleSync('funcionario')}
                  disabled={syncLoading || savingConfig}
                >
                  {syncLoading ? 'Sincronizando...' : 'Sincronizar Funcionários'}
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={() => handleSaveConfig('funcionario')}
                  disabled={savingConfig}
                >
                  {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>
        
        {/* Absenteísmo Configuration Tab */}
        <TabPanel value={activeTab} index={1}>
          <Card variant="outlined" sx={{ border: 'none', boxShadow: 'none' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={500}>
                  Configuração da API de Absenteísmo
                </Typography>
                <IconButton 
                  onClick={() => showInfoDialog('absenteismo')} 
                  color="primary"
                  size="small"
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}
                >
                  <InfoIcon />
                </IconButton>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Empresa Padrão"
                    variant="outlined"
                    value={configurations.absenteismo.empresa_padrao}
                    onChange={(e) => handleInputChange('absenteismo', 'empresa_padrao', e.target.value)}
                    margin="normal"
                    required
                    error={errors.absenteismo.empresa_padrao}
                    helperText={errors.absenteismo.empresa_padrao ? "Campo obrigatório" : ""}
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
                    required
                    error={errors.absenteismo.codigo}
                    helperText={errors.absenteismo.codigo ? "Campo obrigatório" : ""}
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
                    required
                    error={errors.absenteismo.chave}
                    helperText={errors.absenteismo.chave ? "Campo obrigatório" : ""}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                    Período para sincronização
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
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
                
                <Grid item xs={12} md={6}>
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
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<TestIcon />}
                  onClick={() => handleTestConnection('absenteismo')}
                  disabled={testLoading || savingConfig}
                >
                  {testLoading ? 'Testando...' : 'Testar Conexão'}
                </Button>
                
                <Button 
                  variant="outlined" 
                  color="secondary"
                  startIcon={
                    <SyncIcon 
                      className={syncLoading ? "icon-spin" : ""}
                    />
                  }
                  onClick={() => handleSync('absenteismo')}
                  disabled={syncLoading || savingConfig}
                >
                  {syncLoading ? 'Sincronizando...' : 'Sincronizar Dados'}
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={() => handleSaveConfig('absenteismo')}
                  disabled={savingConfig}
                >
                  {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>
      
      {/* Quick help card */}
      <Paper sx={{ p: 3, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.1) }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CheckCircleIcon sx={{ color: 'info.main', mr: 1 }} />
          <Typography variant="h6" color="info.main" fontWeight={500}>
            Dicas de configuração
          </Typography>
        </Box>
        <Typography variant="body1" paragraph>
          Para utilizar corretamente as sincronizações, configure os parâmetros da API para cada módulo e salve as configurações.
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li>Use o botão "Testar Conexão" para verificar se os parâmetros estão corretos.</li>
          <li>Após salvar as configurações, você poderá sincronizar os dados.</li>
          <li>Você pode acompanhar o progresso das sincronizações no "Monitor de Sincronização".</li>
          <li>Recomendamos sincronizar os dados periodicamente para manter as informações atualizadas.</li>
        </Typography>
      </Paper>
      
      {/* Notificações */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={closeNotification} 
          severity={notification.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
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
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}`, pb: 2 }}>
          {infoDialog.title}
        </DialogTitle>
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

export default Settings;
