import React, { useState, useEffect } from 'react';
import { 
  Container, Box, Paper, Typography, Grid, Card, CardContent, CardActions, 
  Button, TextField, Avatar, Divider, Chip, CardHeader, CircularProgress, 
  Alert, List, ListItem, ListItemIcon, ListItemText, Switch
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { planoService } from '../../services/apiService';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import StarIcon from '@mui/icons-material/Star';
import LockIcon from '@mui/icons-material/Lock';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import DateRangeIcon from '@mui/icons-material/DateRange';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Profile = () => {
  const { currentUser, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planoInfo, setPlanoInfo] = useState(null);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    email: ''
  });
  
  useEffect(() => {
    const fetchPlanoInfo = async () => {
      try {
        setLoading(true);
        const planoData = await planoService.getPlanoAtual();
        setPlanoInfo(planoData);
        
        // Preencher dados do formulário com dados do usuário atual
        if (currentUser) {
          setFormData({
            companyName: currentUser.companyName || '',
            email: currentUser.email || ''
          });
        }
      } catch (error) {
        console.error('Erro ao carregar informações do plano:', error);
        setError('Erro ao carregar informações do plano.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlanoInfo();
  }, [currentUser]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSave = async () => {
    try {
      setLoading(true);
      await updateProfile(formData);
      setEditMode(false);
      setError(null);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setError('Erro ao atualizar perfil. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpgradeToPremium = async () => {
    try {
      setLoading(true);
      await planoService.atualizarParaPremium();
      
      // Recarregar informações do plano
      const planoData = await planoService.getPlanoAtual();
      setPlanoInfo(planoData);
      
      setError(null);
    } catch (error) {
      console.error('Erro ao atualizar para plano premium:', error);
      setError('Erro ao atualizar para plano premium. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Renderiza os cards de planos
  const renderPlanoCards = () => {
    const isPremium = planoInfo?.tipo_plano === 'premium';
    
    return (
      <Grid container spacing={4}>
        {/* Plano Gratuito */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            borderColor: !isPremium ? 'primary.main' : 'transparent',
            borderWidth: !isPremium ? 2 : 0,
            borderStyle: 'solid'
          }}>
            <CardHeader
              title="Plano Gratuito"
              titleTypographyProps={{ align: 'center', variant: 'h5' }}
              sx={{ 
                backgroundColor: !isPremium ? 'primary.light' : 'grey.100',
                color: !isPremium ? 'primary.contrastText' : 'text.primary'
              }}
            />
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h4" color="text.primary">
                  R$ 0
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  /mês
                </Typography>
                
                {!isPremium && (
                  <Chip 
                    label="Plano Atual" 
                    color="primary" 
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Dashboard básico" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Até 3 meses de histórico" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Sincronização de empresas" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Sincronização de funcionários" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CancelIcon color="error" />
                  </ListItemIcon>
                  <ListItemText primary="Análise por gênero" sx={{ color: 'text.disabled' }} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CancelIcon color="error" />
                  </ListItemIcon>
                  <ListItemText primary="Análise por dia da semana" sx={{ color: 'text.disabled' }} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CancelIcon color="error" />
                  </ListItemIcon>
                  <ListItemText primary="Exportação de dados" sx={{ color: 'text.disabled' }} />
                </ListItem>
              </List>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
              <Button 
                variant="outlined" 
                color="primary"
                disabled={!isPremium}
              >
                {!isPremium ? 'Plano Atual' : 'Fazer Downgrade'}
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        {/* Plano Premium */}
        <Grid item xs={12} md={6}>
          <Card elevation={4} sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            borderColor: isPremium ? 'secondary.main' : 'transparent',
            borderWidth: isPremium ? 2 : 0,
            borderStyle: 'solid',
            position: 'relative'
          }}>
            {/* Selo Premium */}
            <Box
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                bgcolor: 'warning.main',
                color: 'warning.contrastText',
                borderRadius: '50%',
                width: 60,
                height: 60,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: 2,
                zIndex: 1,
              }}
            >
              <StarIcon fontSize="large" />
            </Box>
            
            <CardHeader
              title="Plano Premium"
              titleTypographyProps={{ align: 'center', variant: 'h5' }}
              sx={{ 
                backgroundColor: isPremium ? 'secondary.light' : 'grey.100',
                color: isPremium ? 'secondary.contrastText' : 'text.primary'
              }}
            />
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h4" color="text.primary">
                  R$ 99,90
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  /mês
                </Typography>
                
                {isPremium && (
                  <Chip 
                    label="Plano Atual" 
                    color="secondary" 
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Todas as funcionalidades do plano gratuito" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Histórico completo" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Análise por gênero" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Análise por dia da semana" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Análise de prejuízo financeiro por CID" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Exportação em Excel e PDF" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Suporte prioritário" />
                </ListItem>
              </List>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
              <Button 
                variant="contained" 
                color="secondary"
                disabled={isPremium}
                onClick={handleUpgradeToPremium}
              >
                {isPremium ? 'Plano Atual' : 'Fazer Upgrade'}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    );
  };
  
  if (loading && !currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>
        Meu Perfil
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={4}>
        {/* Informações do usuário */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: 'primary.main',
                  fontSize: '2.5rem',
                  mb: 2
                }}
              >
                {currentUser?.companyName?.charAt(0) || 'V'}
              </Avatar>
              
              <Typography variant="h5" align="center">
                {editMode ? (
                  <TextField
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    margin="dense"
                    fullWidth
                  />
                ) : (
                  currentUser?.companyName
                )}
              </Typography>
              
              {planoInfo && (
                <Chip 
                  label={planoInfo.tipo_plano === 'premium' ? 'Premium' : 'Gratuito'} 
                  color={planoInfo.tipo_plano === 'premium' ? 'secondary' : 'primary'} 
                  icon={planoInfo.tipo_plano === 'premium' ? <StarIcon /> : null}
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <EmailIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Email" 
                  secondary={
                    editMode ? (
                      <TextField
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        margin="dense"
                        fullWidth
                        disabled // Email não editável
                      />
                    ) : (
                      currentUser?.email
                    )
                  } 
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <BusinessIcon />
                </ListItemIcon>
                <ListItemText primary="ID da Empresa" secondary={currentUser?.id} />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <DateRangeIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Data de Cadastro" 
                  secondary={currentUser?.createdAt ? format(new Date(currentUser.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : '-'} 
                />
              </ListItem>
              
              {planoInfo?.tipo_plano === 'premium' && planoInfo?.data_expiracao && (
                <ListItem>
                  <ListItemIcon>
                    <DateRangeIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Validade do Premium" 
                    secondary={format(new Date(planoInfo.data_expiracao), 'dd/MM/yyyy', { locale: ptBR })} 
                  />
                </ListItem>
              )}
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              {editMode ? (
                <>
                  <Button 
                    variant="outlined" 
                    color="secondary" 
                    onClick={() => setEditMode(false)}
                    sx={{ mr: 2 }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSave}
                  >
                    Salvar
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={() => setEditMode(true)}
                >
                  Editar Perfil
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
        
        {/* Planos disponíveis */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Planos Disponíveis
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Escolha o plano que melhor se adapta às necessidades da sua empresa.
            </Typography>
            
            {renderPlanoCards()}
            
            {planoInfo?.tipo_plano === 'premium' && (
              <Box sx={{ mt: 4, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="body1" color="success.contrastText">
                  Você está utilizando o plano Premium com todos os recursos disponíveis!
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile;
