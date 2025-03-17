import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, Grid, Card, CardContent, 
  FormControl, InputLabel, Select, MenuItem, TextField,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody, 
  CircularProgress, Divider, IconButton, Chip, Alert, Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import BadgeIcon from '@mui/icons-material/Badge';
import FilterListIcon from '@mui/icons-material/FilterList';
import { empresaService, funcionarioService } from '../../services/apiService';

const Funcionarios = () => {
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [error, setError] = useState(null);
  const [filteredFuncionarios, setFilteredFuncionarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Carregar empresas
        const empresasData = await empresaService.getEmpresas();
        setEmpresas(empresasData);
        
        // Carregar funcionários (inicial sem filtro de empresa)
        const funcionariosData = await funcionarioService.getFuncionarios();
        setFuncionarios(funcionariosData);
        setFilteredFuncionarios(funcionariosData);
        
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
  
  useEffect(() => {
    // Filtragem de funcionários por termo de busca e empresa selecionada
    let filtered = funcionarios;
    
    if (empresaSelecionada) {
      filtered = filtered.filter(func => func.codigo_empresa === empresaSelecionada);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(func => 
        func.nome?.toLowerCase().includes(term) || 
        func.matricula_funcionario?.toLowerCase().includes(term) ||
        func.nome_cargo?.toLowerCase().includes(term) ||
        func.nome_setor?.toLowerCase().includes(term)
      );
    }
    
    setFilteredFuncionarios(filtered);
  }, [searchTerm, empresaSelecionada, funcionarios]);
  
  const handleEmpresaChange = (event) => {
    setEmpresaSelecionada(event.target.value);
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleSync = async () => {
    try {
      setSyncLoading(true);
      
      const result = await funcionarioService.syncFuncionarios(empresaSelecionada);
      
      if (result.success) {
        // Recarregar funcionários após sincronização
        const funcionariosData = await funcionarioService.getFuncionarios(empresaSelecionada);
        setFuncionarios(funcionariosData);
        setFilteredFuncionarios(funcionariosData);
        setError(null);
      } else {
        setError(`Erro na sincronização: ${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar funcionários:', error);
      setError('Erro ao sincronizar funcionários. Verifique as configurações da API.');
    } finally {
      setSyncLoading(false);
    }
  };
  
  // Cards com estatísticas
  const renderStatisticsCards = () => {
    const totalFuncionarios = filteredFuncionarios.length;
    const totalSetores = new Set(filteredFuncionarios.map(f => f.nome_setor).filter(Boolean)).size;
    const totalCargos = new Set(filteredFuncionarios.map(f => f.nome_cargo).filter(Boolean)).size;
    
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Funcionários
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1, fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h3" component="div" color="primary">
                  {totalFuncionarios}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {empresaSelecionada ? 'Funcionários da empresa selecionada' : 'Todos os funcionários'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Setores
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ContactPhoneIcon sx={{ mr: 1, fontSize: 40, color: 'secondary.main' }} />
                <Typography variant="h3" component="div" color="secondary.main">
                  {totalSetores}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Setores diferentes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Cargos
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BadgeIcon sx={{ mr: 1, fontSize: 40, color: 'success.main' }} />
                <Typography variant="h3" component="div" color="success.main">
                  {totalCargos}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Cargos diferentes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };
  
  // Tabela de funcionários
  const renderFuncionariosTable = () => {
    return (
      <TableContainer component={Paper} elevation={3}>
        <Table sx={{ minWidth: 650 }} aria-label="tabela de funcionários">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.light' }}>
              <TableCell>Matrícula</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Setor</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Situação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFuncionarios.map((funcionario) => (
              <TableRow key={funcionario.id} hover>
                <TableCell>{funcionario.matricula_funcionario}</TableCell>
                <TableCell>{funcionario.nome}</TableCell>
                <TableCell>{funcionario.nome_empresa}</TableCell>
                <TableCell>{funcionario.nome_setor}</TableCell>
                <TableCell>{funcionario.nome_cargo}</TableCell>
                <TableCell>
                  <Chip 
                    label={funcionario.situacao || "Ativo"} 
                    color={funcionario.situacao === 'Inativo' ? "error" : "success"} 
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
            {filteredFuncionarios.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">
                    Nenhum funcionário encontrado. {empresaSelecionada ? "Utilize o botão 'Sincronizar Funcionários' para importar dados." : "Selecione uma empresa e sincronize os dados."}
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
          Gerenciamento de Funcionários
        </Typography>
        
        <Box>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            sx={{ mr: 2 }}
          >
            Novo Funcionário
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncLoading}
          >
            {syncLoading ? 'Sincronizando...' : 'Sincronizar Funcionários'}
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }} elevation={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel id="empresa-select-label">Filtrar por Empresa</InputLabel>
              <Select
                labelId="empresa-select-label"
                id="empresa-select"
                value={empresaSelecionada}
                label="Filtrar por Empresa"
                onChange={handleEmpresaChange}
              >
                <MenuItem value="">Todas as Empresas</MenuItem>
                {empresas.map((empresa) => (
                  <MenuItem key={empresa.id} value={empresa.codigo}>
                    {empresa.razao_social}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Pesquisar Funcionário"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              }}
              placeholder="Nome, matrícula, cargo ou setor"
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterListIcon />}
            >
              Mais Filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {renderStatisticsCards()}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Lista de Funcionários
        </Typography>
        {renderFuncionariosTable()}
      </Box>
    </Container>
  );
};

export default Funcionarios;
