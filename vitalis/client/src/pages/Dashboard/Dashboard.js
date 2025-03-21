import React, { useState, useEffect } from 'react';
import { 
  Container, Grid, Paper, Typography, Box, Card, CardContent, 
  CardHeader, Divider, CircularProgress, Button, IconButton,
  FormControl, InputLabel, Select, MenuItem, TextField
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import LockIcon from '@mui/icons-material/Lock';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DownloadIcon from '@mui/icons-material/Download';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { format, subMonths, parseISO } from 'date-fns';
import axios from 'axios';

// Import services
import { funcionarioService, absenteismoService } from '../../services/apiService';

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
  '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'
];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
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
  });
  
  const [dateRange, setDateRange] = useState({
    inicio: format(subMonths(new Date(), 2), 'yyyy-MM-dd'),
    fim: format(new Date(), 'yyyy-MM-dd')
  });
  const [filtros, setFiltros] = useState({
    empresaId: '',
    dataInicio: subMonths(new Date(), 2),
    dataFim: new Date()
  });
  
  const [planoUsuario, setPlanoUsuario] = useState({
    tipo_plano: 'gratuito',
    recursos_disponíveis: []
  });
  
  // Carregar dados do plano do usuário
  useEffect(() => {
    const fetchPlanoUsuario = async () => {
      try {
        const response = await axios.get('/api/planos/atual');
        setPlanoUsuario(response.data);
      } catch (error) {
        console.error('Erro ao carregar plano do usuário:', error);
      }
    };
    
    fetchPlanoUsuario();
  }, []);
  
  // Carregar dados do dashboard
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Formatar datas para a API
        const dataInicio = format(filtros.dataInicio, 'yyyy-MM-dd');
        const dataFim = format(filtros.dataFim, 'yyyy-MM-dd');
        
        const data = await absenteismoService.getDashboardData(
          dataInicio, 
          dataFim, 
          filtros.empresaId || undefined
        );
        
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setError('Erro ao carregar dados. Verifique as configurações da API.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filtros]);
  
  const handleChangeEmpresa = (event) => {
    setFiltros(prev => ({
      ...prev,
      empresaId: event.target.value
    }));
  };
  
  const handleChangeDateRange = (field, date) => {
    setFiltros(prev => ({
      ...prev,
      [field]: date
    }));
  };
  
  const handleUpgradeToPremium = async () => {
    try {
      const response = await axios.post('/api/planos/premium');
      if (response.data.success) {
        setPlanoUsuario({
          tipo_plano: 'premium',
          recursos_disponíveis: [
            'dashboard_basico',
            'grafico_evolucao',
            'top_cids',
            'setores_afetados',
            'prejuizo_por_cid',
            'afastamento_por_dia_semana',
            'analise_por_genero',
            'exportacao_dados',
            'alertas_personalizados'
          ]
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
    }
  };
  
  const temAcessoRecurso = (recurso) => {
    return planoUsuario.recursos_disponíveis?.includes(recurso);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            href="/settings"
          >
            Configurar APIs
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard de Absenteísmo
        </Typography>
        
        {planoUsuario.tipo_plano === 'gratuito' && (
          <Button 
            variant="contained" 
            color="secondary"
            onClick={handleUpgradeToPremium}
          >
            Adquirir Plano Premium
          </Button>
        )}
      </Box>
      
      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }} elevation={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Código da Empresa"
              variant="outlined"
              value={filtros.empresaId}
              onChange={handleChangeEmpresa}
              placeholder="Deixe em branco para todas as empresas"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data Início"
                value={filtros.dataInicio}
                onChange={(date) => handleChangeDateRange('dataInicio', date)}
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
                onChange={(date) => handleChangeDateRange('dataFim', date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined'
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={() => {
                setFiltros({
                  ...filtros,
                  dataInicio: subMonths(new Date(), 2),
                  dataFim: new Date()
                });
              }}
            >
              Atualizar
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Cards de indicadores principais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Taxa de Absenteísmo
              </Typography>
              <Typography variant="h3" component="div" color="primary">
                {dashboardData.indicadores.taxaAbsenteismo}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                % de horas perdidas em relação ao total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Prejuízo Financeiro
              </Typography>
              <Typography variant="h3" component="div" color="error">
                R$ {Number(dashboardData.indicadores.prejuizoTotal).toLocaleString('pt-BR')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Valor estimado com base em salário médio
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Afastamentos
              </Typography>
              <Typography variant="h3" component="div" color="secondary">
                {dashboardData.indicadores.totalAtestados}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Atestados no período
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
              <Typography variant="h3" component="div" color="warning.main">
                {dashboardData.indicadores.totalDiasAfastamento}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total de dias de afastamento
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Gráficos principais */}
      <Grid container spacing={3}>
        {/* Evolução Mensal de Absenteísmo */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }} elevation={3}>
            <Typography variant="h6" gutterBottom>
              Evolução do Absenteísmo
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={dashboardData.evolucaoMensal}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Dias perdidos"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Top CIDs */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }} elevation={3}>
            <Typography variant="h6" gutterBottom>
              Top 5 CIDs
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                layout="vertical"
                data={dashboardData.topCids.slice(0, 5)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Ocorrências" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Setores mais afetados */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }} elevation={3}>
            <Typography variant="h6" gutterBottom>
              Setores Mais Afetados
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.setoresMaisAfetados}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {dashboardData.setoresMaisAfetados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(1)} horas`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Prejuízo por CID - Premium */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, position: 'relative' }} elevation={3}>
            {!temAcessoRecurso('prejuizo_por_cid') && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10,
                }}
              >
                <LockIcon sx={{ fontSize: 48, color: 'grey.500', mb: 2 }} />
                <Typography variant="h6" align="center" gutterBottom>
                  Recurso Premium
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleUpgradeToPremium}
                >
                  Adquirir Plano Premium
                </Button>
              </Box>
            )}
            <Typography variant="h6" gutterBottom>
              Prejuízo por CID
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={dashboardData.prejuizoPorCid.slice(0, 5)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="value" name="Valor (R$)" fill="#ff8042" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Afastamentos por Dia da Semana - Premium */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, position: 'relative' }} elevation={3}>
            {!temAcessoRecurso('afastamento_por_dia_semana') && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10,
                }}
              >
                <LockIcon sx={{ fontSize: 48, color: 'grey.500', mb: 2 }} />
                <Typography variant="h6" align="center" gutterBottom>
                  Recurso Premium
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleUpgradeToPremium}
                >
                  Adquirir Plano Premium
                </Button>
              </Box>
            )}
            <Typography variant="h6" gutterBottom>
              Afastamentos por Dia da Semana
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={dashboardData.distribuicaoPorDiaSemana}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Ocorrências" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Análise por gênero - Premium */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, position: 'relative' }} elevation={3}>
            {!temAcessoRecurso('analise_por_genero') && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10,
                }}
              >
                <LockIcon sx={{ fontSize: 48, color: 'grey.500', mb: 2 }} />
                <Typography variant="h6" align="center" gutterBottom>
                  Recurso Premium
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleUpgradeToPremium}
                >
                  Adquirir Plano Premium
                </Button>
              </Box>
            )}
            <Typography variant="h6" gutterBottom>
              Análise por Gênero
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.distribuicaoPorSexo}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#0088FE" />
                  <Cell fill="#FF8042" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Ferramentas Avançadas - Premium */}
      {temAcessoRecurso('exportacao_dados') && (
        <Paper sx={{ p: 2, mt: 4 }} elevation={3}>
          <Typography variant="h6" gutterBottom>
            Ferramentas Avançadas
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={<DownloadIcon />}
              >
                Exportar Relatório em PDF
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={<DownloadIcon />}
              >
                Exportar Dados em Excel
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={<NotificationsIcon />}
              >
                Configurar Alertas
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default Dashboard;
