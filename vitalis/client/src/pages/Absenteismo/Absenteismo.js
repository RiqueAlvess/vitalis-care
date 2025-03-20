import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, Grid, Card, CardContent, 
  FormControl, InputLabel, Select, MenuItem, TextField,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody, 
  CircularProgress, Divider, IconButton, Chip, Alert, Button,
  Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { format, subMonths, differenceInDays, parseISO } from 'date-fns';
import { apiConfigService, absenteismoService } from '../../services/apiService';

const Absenteismo = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [absenteismo, setAbsenteismo] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [apiConfig, setApiConfig] = useState(null);
  const [filtros, setFiltros] = useState({
    dataInicio: subMonths(new Date(), 2),
    dataFim: new Date(),
    filtro: ''
  });
  
  // Estatísticas
  const [estatisticas, setEstatisticas] = useState({
    totalAtestados: 0,
    totalDias: 0,
    funcionariosAfetados: 0,
    mediaAtestadoPorFunc: 0,
    topCid: { codigo: '', descricao: '', qtd: 0 }
  });
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Carregar configurações da API para obter a empresa padrão
        const configs = await apiConfigService.getConfigurations();
        setApiConfig(configs.absenteismo || {});
        
        // Carregar dados de absenteísmo
        await fetchAbsenteismo();
        
        setError(null);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Erro ao carregar dados. Verifique as configurações da API.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const fetchAbsenteismo = async () => {
    try {
      setLoading(true);
      
      // Formatar datas para a API
      const dataInicio = format(filtros.dataInicio, 'yyyy-MM-dd');
      const dataFim = format(filtros.dataFim, 'yyyy-MM-dd');
      
      const absenteismoData = await absenteismoService.getAbsenteismo(
        dataInicio, 
        dataFim
      );
      
      setAbsenteismo(absenteismoData);
      
      // Calcular estatísticas
      calcularEstatisticas(absenteismoData);
      
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar dados de absenteísmo:', error);
      setError('Erro ao carregar dados de absenteísmo. Verifique as configurações da API.');
    } finally {
      setLoading(false);
    }
  };
  
  const calcularEstatisticas = (dados) => {
    if (!dados || dados.length === 0) {
      setEstatisticas({
        totalAtestados: 0,
        totalDias: 0,
        funcionariosAfetados: 0,
        mediaAtestadoPorFunc: 0,
        topCid: { codigo: '', descricao: '', qtd: 0 }
      });
      return;
    }
    
    const totalAtestados = dados.length;
    const totalDias = dados.reduce((sum, atestado) => sum + (atestado.dias_afastados || 0), 0);
    
    // Contar funcionários únicos
    const funcionariosUnicos = new Set(dados.map(a => a.matricula_func));
    const funcionariosAfetados = funcionariosUnicos.size;
    
    // Média de atestados por funcionário
    const mediaAtestadoPorFunc = funcionariosAfetados > 0 ? (totalAtestados / funcionariosAfetados).toFixed(1) : 0;
    
    // Encontrar o CID mais comum
    const cidsCount = {};
    dados.forEach(atestado => {
      if (atestado.cid_principal) {
        cidsCount[atestado.cid_principal] = (cidsCount[atestado.cid_principal] || 0) + 1;
      }
    });
    
    let topCidCodigo = '';
    let topCidQtd = 0;
    
    Object.entries(cidsCount).forEach(([cid, qtd]) => {
      if (qtd > topCidQtd) {
        topCidCodigo = cid;
        topCidQtd = qtd;
      }
    });
    
    // Encontrar descrição do CID mais comum
    const topCidAtestado = dados.find(a => a.cid_principal === topCidCodigo);
    const topCidDescricao = topCidAtestado?.descricao_cid || '';
    
    setEstatisticas({
      totalAtestados,
      totalDias,
      funcionariosAfetados,
      mediaAtestadoPorFunc,
      topCid: { codigo: topCidCodigo, descricao: topCidDescricao, qtd: topCidQtd }
    });
  };
  
  const handleChangeFiltro = (field, value) => {
    setFiltros(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleSync = async () => {
    try {
      setSyncLoading(true);
      
      // Validar intervalo de datas (3 meses para plano gratuito)
      const dataInicio = format(filtros.dataInicio, 'yyyy-MM-dd');
      const dataFim = format(filtros.dataFim, 'yyyy-MM-dd');
      
      const result = await absenteismoService.syncAbsenteismo(
        dataInicio,
        dataFim
      );
      
      if (result.success) {
        showNotification('Job de sincronização adicionado à fila. Acesse o Monitor de Sincronização para acompanhar o progresso.', 'success');
        // Navigate to the sync monitor page
        navigate('/sync-monitor');
      } else {
        setError(`Erro na sincronização: ${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar dados de absenteísmo:', error);
      setError('Erro ao sincronizar dados de absenteísmo. Verifique as configurações da API.');
    } finally {
      setSyncLoading(false);
    }
  };
  
  const showNotification = (message, severity = 'info') => {
    // This implementation depends on how you handle notifications
    if (severity === 'error') {
      setError(message);
    } else {
      setError(null);
      // For now, just use an alert
      alert(message);
    }
  };
  
  const handleAplicarFiltros = () => {
    fetchAbsenteismo();
  };
  
  // Cards com estatísticas
  const renderStatisticsCards = () => {
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Atestados
              </Typography>
              <Typography variant="h3" component="div" color="primary">
                {estatisticas.totalAtestados}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                No período selecionado
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Dias Perdidos
              </Typography>
              <Typography variant="h3" component="div" color="error">
                {estatisticas.totalDias}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total de dias de afastamento
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Funcionários Afetados
              </Typography>
              <Typography variant="h3" component="div" color="secondary">
                {estatisticas.funcionariosAfetados}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Com pelo menos um atestado
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                CID Mais Frequente
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {estatisticas.topCid.codigo || '-'}
              </Typography>
              <Tooltip title={estatisticas.topCid.descricao} placement="bottom" arrow>
                <Typography variant="body2" noWrap color="textSecondary">
                  {estatisticas.topCid.descricao ? `${estatisticas.topCid.descricao} (${estatisticas.topCid.qtd}x)` : '-'}
                </Typography>
              </Tooltip>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };
  
  // Tabela de absenteísmo
  const renderAbsenteismoTable = () => {
    let dados = absenteismo;
    
    // Aplicar filtragem por texto de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      dados = dados.filter(item => 
        (item.nome && item.nome.toLowerCase().includes(term)) ||
        (item.matricula_func && item.matricula_func.toLowerCase().includes(term)) ||
        (item.setor && item.setor.toLowerCase().includes(term)) ||
        (item.cid_principal && item.cid_principal.toLowerCase().includes(term)) ||
        (item.descricao_cid && item.descricao_cid.toLowerCase().includes(term))
      );
    }
    
    return (
      <TableContainer component={Paper} elevation={3}>
        <Table sx={{ minWidth: 650 }} aria-label="tabela de absenteísmo">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.light' }}>
              <TableCell>Funcionário</TableCell>
              <TableCell>Matrícula</TableCell>
              <TableCell>Período</TableCell>
              <TableCell>Dias</TableCell>
              <TableCell>Setor</TableCell>
              <TableCell>CID</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dados.map((item) => {
              // Formatar datas
              const dataInicio = item.dt_inicio_atestado ? format(new Date(item.dt_inicio_atestado), 'dd/MM/yyyy') : '-';
              const dataFim = item.dt_fim_atestado ? format(new Date(item.dt_fim_atestado), 'dd/MM/yyyy') : '-';
              const periodo = `${dataInicio} a ${dataFim}`;
              
              return (
                <TableRow key={item.id} hover>
                  <TableCell>{item.nome || '-'}</TableCell>
                  <TableCell>{item.matricula_func}</TableCell>
                  <TableCell>{periodo}</TableCell>
                  <TableCell>{item.dias_afastados || '-'}</TableCell>
                  <TableCell>{item.nome_setor || item.setor || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title={item.descricao_cid || ''} placement="top" arrow>
                      <span>{item.cid_principal || '-'}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Visualizar Detalhes">
                      <IconButton color="primary" size="small">
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Exportar">
                      <IconButton color="secondary" size="small">
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {dados.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">
                    Nenhum registro de absenteísmo encontrado para o período selecionado.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Gestão de Absenteísmo
        </Typography>
        
        <Box>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            sx={{ mr: 2 }}
          >
            Novo Registro
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncLoading}
          >
            {syncLoading ? 'Sincronizando...' : 'Sincronizar Dados'}
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Configuração da empresa */}
      {apiConfig && apiConfig.empresa_padrao && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Usando a empresa padrão: <strong>{apiConfig.empresa_padrao}</strong>
        </Alert>
      )}
      
      {!apiConfig?.empresa_padrao && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Empresa padrão não configurada. Por favor, configure a empresa padrão nas <Button 
            size="small" 
            color="inherit" 
            onClick={() => navigate('/settings')}
          >
            Configurações
          </Button>
        </Alert>
      )}
      
      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }} elevation={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data Início"
                value={filtros.dataInicio}
                onChange={(date) => handleChangeFiltro('dataInicio', date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined'
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data Fim"
                value={filtros.dataFim}
                onChange={(date) => handleChangeFiltro('dataFim', date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined'
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Pesquisar"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              }}
              placeholder="Funcionário, matrícula, CID..."
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={handleAplicarFiltros}
            >
              Aplicar Filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {renderStatisticsCards()}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Registros de Absenteísmo
          <Button 
            variant="text" 
            startIcon={<DownloadIcon />} 
            sx={{ ml: 2 }}
          >
            Exportar
          </Button>
        </Typography>
        {renderAbsenteismoTable()}
      </Box>
    </Container>
  );
};

export default Absenteismo;
