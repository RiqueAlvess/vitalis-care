import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TextField, Button, Paper, Typography, Container, Box, Alert } from '@mui/material';
import { isValidEmail, isValidPassword } from '../../utils/validators';
import authService from '../../services/authService';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear respective error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Validate company name
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Nome da empresa é obrigatório';
    }
    
    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Email inválido';
    } else {
      // Check if email is corporate (not free domain)
      const freeDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'aol.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com', 'gmx.com'];
      const domain = formData.email.split('@')[1];
      
      if (freeDomains.includes(domain)) {
        newErrors.email = 'Por favor, utilize um email corporativo';
      }
    }
    
    // Validate password
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = 'A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula e um número';
    }
    
    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await authService.register({
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password
      });
      
      // Log the user in after registration
      await login(formData.email, formData.password);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      setApiError(error.response?.data?.message || 'Ocorreu um erro ao realizar o cadastro. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Container component="main" maxWidth="sm">
      <Paper elevation={3} sx={{ mt: 8, p: 4 }}>
        <Typography component="h1" variant="h5" align="center" gutterBottom>
          Cadastro Vitalis
        </Typography>
        
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="companyName"
            label="Nome da Empresa"
            name="companyName"
            autoComplete="organization"
            value={formData.companyName}
            onChange={handleChange}
            error={!!errors.companyName}
            helperText={errors.companyName}
            autoFocus
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Corporativo"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email || 'Utilize seu email corporativo'}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Senha"
            type="password"
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            error={!!errors.password}
            helperText={errors.password}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirmar Senha"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
          
          <Box textAlign="center">
            <Typography variant="body2">
              Já tem uma conta?{' '}
              <Button 
                color="primary" 
                size="small" 
                onClick={() => navigate('/login')}
              >
                Entrar
              </Button>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;
