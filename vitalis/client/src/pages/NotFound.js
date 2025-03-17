import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" color="primary" fontWeight="bold">
          404
        </Typography>
        
        <Typography variant="h4" gutterBottom>
          Página não encontrada
        </Typography>
        
        <Typography variant="body1" color="textSecondary" paragraph>
          A página que você está procurando não existe ou foi movida.
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          Voltar para o Dashboard
        </Button>
      </Box>
    </Container>
  );
};

export default NotFound;
