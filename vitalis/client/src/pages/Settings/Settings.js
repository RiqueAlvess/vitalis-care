import React, { useState, useEffect } from 'react';
import { 
  Container, Grid, Paper, Typography, Box, Card, CardContent, 
  CardHeader, Divider, CircularProgress, Button, IconButton,
  FormControl, InputLabel, Select, MenuItem, TextField,
  Tabs, Tab, Alert, Snackbar, Dialog, DialogTitle,
  DialogContent, DialogActions, CardActions, FormControlLabel,
  Checkbox, FormGroup, FormHelperText
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import TestIcon from '@mui/icons-material/PlayCircleFilled';
import SyncIcon from '@mui/icons-material/Sync';
import InfoIcon from '@mui/icons-material/Info';
import { format, subMonths } from 'date-fns';
import { apiConfigService, funcionarioService, absenteismoService } from '../../services/apiService';

const Settings = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [infoDialog, setInfoDialog] = useState({ open: false, title: '', content: '' });
  
  // Configurações de APIs
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

  // Validação de campos obrigatórios
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
      const configs = await apiConfigService.getConfigurations();
      
      // Atualizar estado com configurações carregadas
      const updatedConfigs = { ...configurations };
      
      Object.keys(configs).forEach(apiType => {
        if (configs[apiType] && typeof configs[apiType] === 'object') {
          updatedConfigs[apiType] = {
            ...updatedConfigs[apiType],
            ...configs[apiType]
          };
          
          // Converter valores para booleano para os checkboxes
          if (apiType === 'funcionario') {
            updatedConfigs[apiType].ativo = configs[apiType].ativo === 'Sim';
            updatedConfigs[apiType].inativo = configs[apiType].inativo === 'Sim';
            updatedConfigs[apiType].afastado = configs[apiType].afastado === 'Sim';
            updatedConfigs[apiType].pendente = configs[apiType].pendente === 'Sim';
            updatedConfigs[apiType].ferias = configs[apiType].ferias === 'Sim';
          }
        }
      });
      
      setConfigurations(updatedConfigs);
    } catch (error) {
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
    
    // Limpar erro deste campo se existir
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

    // Validar campos específicos para cada tipo de API
    if (apiType === 'funcionario') {
      ['empresa_padrao', 'codigo', 'chave'].forEach(field => {
        if (!config[field]) {
          newErrors[field] = true;
          isValid = false;
        } else {
          newErrors[field] = false;
        }
      });
    } else if (apiType === 'absenteismo') {
      ['empresa_padrao', 'codigo', 'chave'].forEach(field => {
        if (!config[field]) {
          newErrors[field] = true;
          isValid = false;
        } else {
          newErrors[field] = false;
        }
      });
    }

    // Atualizar erros
    setErrors(prev => ({
      ...prev,
      [apiType]: newErrors
    }));

    return isValid;
  };
  
  const handleSaveConfig = async (apiType) => {
    try {
      // Validar campos obrigatórios antes de salvar
      if (!validateConfigFields(apiType)) {
        showNotification('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      setLoading(true);
      
      // Preparar dados para salvar
      const dataToSave = { ...configurations[apiType] };
      
      await apiConfigService.saveConfiguration(apiType, dataToSave);
      showNotification(`Configurações de ${getApiTypeLabel(apiType)} salvas com sucesso`, 'success');
    } catch (error) {
      showNotification(`Erro ao salvar configurações de ${getApiTypeLabel(apiType)}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSync = async (apiType) => {
    try {
      setSyncLoading(true);
      
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
  
  const handleTestConnection = async (apiType) => {
    try {
      // Validar campos obrigatórios antes de testar
      if (!validateConfigFields(apiType)) {
        showNotification('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      setTestLoading(true);
      
      // Preparar dados para o teste
      const dataToTest = { ...configurations[apiType], type: apiType };
      
      const result = await apiConfigService.testConnection(dataToTest);
      
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
          <Tab label="Funcionários" />
          <Tab label="Absenteísmo" />
        </Tabs>
        
        {/* Tab de Configuração de Funcionários */}
        <TabPanel value={activeTab} index={0}>
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
                      <Typography variant="subtitle1" gutterBottom>
                        Filtros para importação de funcionários
                      </Typography>
                      <FormGroup row>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={configurations.funcionario.ativo}
                              onChange={(e) => handleInputChange('funcionario', 'ativo', e.target.checked)}
/>
                          }
                          label="Ativo"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={configurations.funcionario.inativo}
                              onChange={(e) => handleInputChange('funcionario', 'inativo', e.target.checked)}
                            />
                          }
                          label="Inativo"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={configurations.funcionario.afastado}
                              onChange={(e) => handleInputChange('funcionario', 'afastado', e.target.checked)}
                            />
                          }
                          label="Afastado"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={configurations.funcionario.pendente}
                              onChange={(e) => handleInputChange('funcionario', 'pendente', e.target.checked)}
                            />
                          }
                          label="Pendente"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={configurations.funcionario.ferias}
                              onChange={(e) => handleInputChange('funcionario', 'ferias', e.target.checked)}
                            />
                          }
                          label="Férias"
                        />
                      </FormGroup>
                      <FormHelperText>
                        Selecione os status de funcionários que deseja importar. 
                        Por padrão, são importados apenas funcionários ativos.
                      </FormHelperText>
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
                    startIcon={
                      <SyncIcon 
                        className={syncLoading ? "icon-spin" : ""}
                      />
                    }
                    onClick={() => handleSync('funcionario')}
                    disabled={syncLoading}
                  >
                    {syncLoading ? 'Sincronizando...' : 'Sincronizar Funcionários'}
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
          </Grid>
        </TabPanel>
        
        {/* Tab de Configuração de Absenteísmo */}
        <TabPanel value={activeTab} index={1}>
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
                      <Typography variant="subtitle1" gutterBottom>
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
                    startIcon={
                      <SyncIcon 
                        className={syncLoading ? "icon-spin" : ""}
                      />
                    }
                    onClick={() => handleSync('absenteismo')}
                    disabled={syncLoading}
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

export default Settings;
