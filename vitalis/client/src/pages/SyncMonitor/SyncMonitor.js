import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, Grid, Card, CardContent, 
  CircularProgress, Divider, Chip, Alert, Button, Table, 
  TableContainer, TableHead, TableRow, TableCell, TableBody,
  LinearProgress, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Collapse
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { jobQueueService } from '../../services/apiService';

const SyncMonitor = () => {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const [activeJob, setActiveJob] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [expandedJobDetails, setExpandedJobDetails] = useState({});

  useEffect(() => {
    fetchJobs();

    // Set up auto-refresh
    const intervalId = setInterval(fetchJobs, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const jobsData = await jobQueueService.getSyncJobs(100);
      setJobs(jobsData);
      setError(null);
    } catch (error) {
      console.error('Error fetching sync jobs:', error);
      setError('Erro ao carregar dados de sincronização');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryJob = async (jobId) => {
    try {
      setActiveJob(jobId);
      await jobQueueService.retrySyncJob(jobId);
      setDialogOpen(false);
      fetchJobs();
    } catch (error) {
      console.error('Error retrying job:', error);
      setError('Erro ao repetir o job');
    } finally {
      setActiveJob(null);
    }
  };

  const handleCancelJob = async (jobId) => {
    try {
      setActiveJob(jobId);
      await jobQueueService.cancelSyncJob(jobId);
      setDialogOpen(false);
      fetchJobs();
    } catch (error) {
      console.error('Error canceling job:', error);
      setError('Erro ao cancelar o job');
    } finally {
      setActiveJob(null);
    }
  };

  const openRetryDialog = (jobId) => {
    setActiveJob(jobId);
    setDialogType('retry');
    setDialogOpen(true);
  };

  const openCancelDialog = (jobId) => {
    setActiveJob(jobId);
    setDialogType('cancel');
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setActiveJob(null);
  };

  const toggleJobDetails = (jobId) => {
    setExpandedJobDetails(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const getJobTypeTranslation = (jobType) => {
    const translations = {
      'empresa': 'Empresas',
      'funcionario': 'Funcionários',
      'absenteismo': 'Absenteísmo'
    };
    return translations[jobType] || jobType;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'warning',
      'processing': 'info',
      'completed': 'success',
      'failed': 'error',
      'canceled': 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'processing':
        return <CircularProgress size={20} />;
      case 'pending':
        return <HourglassEmptyIcon color="warning" />;
      case 'canceled':
        return <CancelIcon color="action" />;
      default:
        return <WarningIcon />;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return format(date, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  };

  const renderJobResult = (job) => {
    if (job.status !== 'completed') return null;
    
    const result = job.result ? 
      (typeof job.result === 'string' ? JSON.parse(job.result) : job.result) : 
      null;
    
    if (!result) return null;
    
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Resultado:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="body2">
              Total de registros: <strong>{result.count || 0}</strong>
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2">
              Novos: <strong>{result.inserted || 0}</strong>
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2">
              Atualizados: <strong>{result.updated || 0}</strong>
            </Typography>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderErrorMessage = (job) => {
    if (job.status !== 'failed' || !job.error_message) return null;
    
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="error" gutterBottom>
          Erro:
        </Typography>
        <Alert severity="error" sx={{ mt: 1 }}>
          {job.error_message}
        </Alert>
      </Box>
    );
  };

  const renderActionButtons = (job) => {
    if (job.status === 'failed') {
      return (
        <Tooltip title="Tentar Novamente">
          <IconButton 
            color="primary" 
            size="small" 
            onClick={() => openRetryDialog(job.id)}
            disabled={loading || activeJob === job.id}
          >
            <ReplayIcon />
          </IconButton>
        </Tooltip>
      );
    }
    
    if (job.status === 'pending') {
      return (
        <Tooltip title="Cancelar">
          <IconButton 
            color="error" 
            size="small" 
            onClick={() => openCancelDialog(job.id)}
            disabled={loading || activeJob === job.id}
          >
            <CancelIcon />
          </IconButton>
        </Tooltip>
      );
    }
    
    return null;
  };

  if (loading && jobs.length === 0) {
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
          Monitor de Sincronização
        </Typography>
        
        <Button 
          variant="outlined" 
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={fetchJobs}
          disabled={loading}
        >
          {loading ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Jobs
              </Typography>
              <Typography variant="h3" component="div">
                {jobs.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Em Processamento
              </Typography>
              <Typography variant="h3" component="div" color="info.main">
                {jobs.filter(job => job.status === 'processing').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Concluídos
              </Typography>
              <Typography variant="h3" component="div" color="success.main">
                {jobs.filter(job => job.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Falhas
              </Typography>
              <Typography variant="h3" component="div" color="error.main">
                {jobs.filter(job => job.status === 'failed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Jobs Table */}
      <Paper sx={{ p: 2, mb: 3 }} elevation={3}>
        <Typography variant="h5" gutterBottom>
          Histórico de Sincronizações
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progresso</TableCell>
                <TableCell>Data Criação</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhum job de sincronização encontrado
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map(job => (
                  <React.Fragment key={job.id}>
                    <TableRow 
                      hover
                      sx={{ 
                        '& > *': { borderBottom: 'unset' },
                        backgroundColor: job.status === 'processing' ? 'rgba(33, 150, 243, 0.08)' : undefined
                      }}
                    >
                      <TableCell>{job.id}</TableCell>
                      <TableCell>{getJobTypeTranslation(job.job_type)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getStatusIcon(job.status)}
                          <Chip 
                            label={job.status === 'pending' ? 'Pendente' : 
                                   job.status === 'processing' ? 'Processando' :
                                   job.status === 'completed' ? 'Concluído' :
                                   job.status === 'failed' ? 'Falha' : 
                                   job.status === 'canceled' ? 'Cancelado' : job.status}
                            color={getStatusColor(job.status)}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {job.status === 'processing' ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={job.progress || 0} 
                                color="primary" 
                              />
                            </Box>
                            <Box sx={{ minWidth: 35 }}>
                              <Typography variant="body2" color="text.secondary">
                                {`${Math.round(job.progress || 0)}%`}
                              </Typography>
                            </Box>
                          </Box>
                        ) : job.status === 'completed' ? (
                          '100%'
                        ) : job.status === 'failed' ? (
                          job.progress ? `${job.progress}%` : '-'
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title={formatTimestamp(job.created_at)}>
                          <span>{formatRelativeTime(job.created_at)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {job.completed_at && job.started_at ? (
                          formatDistanceToNow(new Date(job.started_at), { 
                            locale: ptBR,
                            addSuffix: false
                          })
                        ) : job.status === 'processing' && job.started_at ? (
                          // For running jobs, show time since start
                          formatDistanceToNow(new Date(job.started_at), { 
                            locale: ptBR,
                            addSuffix: false
                          }) + '...'
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {renderActionButtons(job)}
                          
                          <Tooltip title="Detalhes">
                            <IconButton 
                              size="small" 
                              onClick={() => toggleJobDetails(job.id)}
                            >
                              {expandedJobDetails[job.id] ? 
                                <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded details row */}
                    <TableRow>
                      <TableCell 
                        style={{ paddingBottom: 0, paddingTop: 0 }} 
                        colSpan={7}
                      >
                        <Collapse 
                          in={expandedJobDetails[job.id]} 
                          timeout="auto" 
                          unmountOnExit
                        >
                          <Box sx={{ margin: 2 }}>
                            <Typography variant="h6" gutterBottom component="div">
                              Detalhes do Job
                            </Typography>
                            
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Informações:
                                </Typography>
                                
                                <Grid container spacing={1}>
                                  <Grid item xs={6}>
                                    <Typography variant="body2">
                                      Criado em: <strong>{formatTimestamp(job.created_at)}</strong>
                                    </Typography>
                                  </Grid>
                                  
                                  <Grid item xs={6}>
                                    <Typography variant="body2">
                                      Iniciado em: <strong>{formatTimestamp(job.started_at) || '-'}</strong>
                                    </Typography>
                                  </Grid>
                                  
                                  <Grid item xs={6}>
                                    <Typography variant="body2">
                                      Concluído em: <strong>{formatTimestamp(job.completed_at) || '-'}</strong>
                                    </Typography>
                                  </Grid>
                                  
                                  <Grid item xs={6}>
                                    <Typography variant="body2">
                                      Progresso: <strong>{job.progress || 0}%</strong>
                                    </Typography>
                                  </Grid>
                                  
                                  {job.total_records !== null && (
                                    <>
                                      <Grid item xs={6}>
                                        <Typography variant="body2">
                                          Registros totais: <strong>{job.total_records || 0}</strong>
                                        </Typography>
                                      </Grid>
                                      
                                      <Grid item xs={6}>
                                        <Typography variant="body2">
                                          Registros processados: <strong>{job.processed_records || 0}</strong>
                                        </Typography>
                                      </Grid>
                                    </>
                                  )}
                                  
                                  <Grid item xs={12}>
                                    <Typography variant="body2">
                                      Parâmetros: <strong>{job.params ? 
                                        JSON.stringify(
                                          typeof job.params === 'string' ? 
                                            JSON.parse(job.params) : 
                                            job.params
                                        ) : '-'}
                                      </strong>
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </Grid>
                              
                              <Grid item xs={12} md={6}>
                                {renderJobResult(job)}
                                {renderErrorMessage(job)}
                              </Grid>
                            </Grid>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
      >
        <DialogTitle>
          {dialogType === 'retry' ? 'Repetir Job' : 'Cancelar Job'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogType === 'retry'
              ? 'Deseja repetir este job de sincronização que falhou?'
              : 'Deseja cancelar este job de sincronização pendente?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancelar
          </Button>
          <Button 
            onClick={() => dialogType === 'retry' 
              ? handleRetryJob(activeJob) 
              : handleCancelJob(activeJob)
            } 
            color={dialogType === 'retry' ? 'primary' : 'error'}
            autoFocus
          >
            {dialogType === 'retry' ? 'Repetir' : 'Cancelar Job'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SyncMonitor;
