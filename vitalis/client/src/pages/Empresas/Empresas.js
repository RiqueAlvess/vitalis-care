import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, Grid, Card, CardContent, 
  CardHeader, Divider, Button, TextField, TableContainer,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress,
  IconButton, Chip, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import apiService from '../../services/apiService';e';

const Empresas = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchEmpresas();
  }, []);
  
  const fetchEmpresas = async () => {
    try {
      setLoading(true);
      const empresasData = await apiService.empresa.getEmpresas();
      setEmpresas(empresasData);
      setError(null);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      setError('Erro ao carregar dados das empresas. Verifique as configurações da API.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSync = async () => {
    try {
      setSyncLoading(true);
      
      const result = await apiService.empresa.syncEmpresas();
      
      if (result.success) {
        showNotification('Job de sincronização adicionado à fila. Acesse o Monitor de Sincronização para acompanhar o progresso.', 'success');
        // Navigate to the sync monitor page
        navigate('/sync-monitor');
      } else {
        setError(`Erro na sincronização: ${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar empresas:', error);
      setError('Erro ao sincronizar empresas. Verifique as configurações da API.');
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
  
  // Cards com estatísticas
  const renderStatisticsCards = () => {
    const totalEmpresas = empresas.length;
    const empresasAtivas = empresas.filter(emp => emp.ativo).length;
    const empresasInativas = totalEmpresas - empresasAtivas;
    
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Empresas
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1, fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h3" component="div" color="primary">
                  {totalEmpresas}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Empresas cadastradas no sistema
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Empresas Ativas
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1, fontSize: 40, color: 'success.main' }} />
                <Typography variant="h3" component="div" color="success.main">
                  {empresasAtivas}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Empresas em operação
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Empresas Inativas
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1, fontSize: 40, color: 'error.main' }} />
                <Typography variant="h3" component="div" color="error.main">
                  {empresasInativas}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Empresas sem operação
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };
  
  // Tabela de empresas
  const renderEmpresasTable = () => {
    return (
      <TableContainer component={Paper} elevation={3}>
        <Table sx={{ minWidth: 650 }} aria-label="tabela de empresas">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.light' }}>
              <TableCell>Código</TableCell>
              <TableCell>Razão Social</TableCell>
              <TableCell>CNPJ</TableCell>
              <TableCell>Cidade/UF</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {empresas.map((empresa) => (
              <TableRow key={empresa.id} hover>
                <TableCell>{empresa.codigo}</TableCell>
                <TableCell>{empresa.razao_social}</TableCell>
                <TableCell>{empresa.cnpj}</TableCell>
                <TableCell>{empresa.cidade}/{empresa.uf}</TableCell>
                <TableCell>
                  <Chip 
                    label={empresa.ativo ? "Ativa" : "Inativa"} 
                    color={empresa.ativo ? "success" : "error"} 
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton color="primary" size="small" title="Editar">
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" size="small" title="Excluir">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {empresas.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">
                    Nenhuma empresa encontrada. Utilize o botão "Sincronizar Empresas" para importar dados.
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
          Gerenciamento de Empresas
        </Typography>
        
        <Box>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            sx={{ mr: 2 }}
          >
            Nova Empresa
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncLoading}
          >
            {syncLoading ? 'Sincronizando...' : 'Sincronizar Empresas'}
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {renderStatisticsCards()}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Lista de Empresas
        </Typography>
        {renderEmpresasTable()}
      </Box>
    </Container>
  );
};

export default Empresas;
