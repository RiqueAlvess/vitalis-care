import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';
 
// Este é um script para testar a autenticação
async function testAuth() {
  try {
    console.log("Testando autenticação...");
    
    // Verificar se há token armazenado
    const token = localStorage.getItem('token');
    if (!token) {
      console.log("Nenhum token encontrado");
      return false;
    }
    
    // Definir token no cabeçalho das requisições
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Tentar verificar o token
    try {
      const response = await axios.get(`${API_URL}/auth/verify`);
      console.log("Verificação de token bem-sucedida:", response.data);
      return true;
    } catch (error) {
      console.error("Erro na verificação do token:", error);
      
      // Limpar token inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      
      return false;
    }
  } catch (error) {
    console.error("Erro ao testar autenticação:", error);
    return false;
  }
}

// Este é um script para tentar login com credenciais padrão
async function tryDefaultLogin() {
  try {
    console.log("Tentando login com credenciais padrão...");
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: "admin@vitalis.com",
      password: "admin123"
    });
    
    const { token, user } = response.data;
    
    // Armazenar token e dados do usuário
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Configurar axios com o token
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log("Login com credenciais padrão bem-sucedido");
    return true;
  } catch (error) {
    console.error("Erro no login com credenciais padrão:", error);
    return false;
  }
}

// Executar os testes
async function runTests() {
  console.log("=======================================");
  console.log("INICIANDO TESTES DE AUTENTICAÇÃO");
  console.log("=======================================");
  
  // Testar autenticação atual
  const isAuthenticated = await testAuth();
  console.log("Status de autenticação:", isAuthenticated ? "Autenticado" : "Não autenticado");
  
  if (!isAuthenticated) {
    // Tentar login com credenciais padrão
    const loginSuccess = await tryDefaultLogin();
    console.log("Resultado do login padrão:", loginSuccess ? "Sucesso" : "Falha");
  }
  
  console.log("=======================================");
  console.log("TESTES CONCLUÍDOS");
  console.log("=======================================");
}

// Executar os testes quando o script for carregado
runTests();
