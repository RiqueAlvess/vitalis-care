# Vitalis - Sistema de Gestão de Absenteísmo

## Visão Geral

Vitalis é uma plataforma corporativa para gestão e análise de absenteísmo. O sistema permite integração com a API SOC para obtenção de dados de empresas, funcionários e registros de absenteísmo.

## Recursos Principais

- Dashboard de visualização de dados de absenteísmo
- Análise de taxas de absenteísmo e impacto financeiro
- Integração com API SOC
- Gerenciamento de múltiplas empresas
- Versão premium com funcionalidades avançadas

## Deploy no Render

### 1. Configuração do Banco de Dados

O banco de dados PostgreSQL já está configurado no Render:

- **Host**: dpg-cvblvjd2ng1s73efitig-a
- **Port**: 5432
- **Database**: db_vitalis
- **Username**: db_vitalis_user
- **Password**: skk1guiKUO5fe77SDZJGzHHZhXu2jitP
- **External URL**: postgresql://db_vitalis_user:skk1guiKUO5fe77SDZJGzHHZhXu2jitP@dpg-cvblvjd2ng1s73efitig-a.oregon-postgres.render.com/db_vitalis

### 2. Deploy do Backend (Web Service)

1. No Render, crie um novo **Web Service**
2. Conecte ao repositório Git
3. Configure:
   - **Nome**: vitalis-api (ou escolha outro nome)
   - **Runtime**: Node
   - **Root Directory**: server
   - **Build Command**: npm install
   - **Start Command**: node app.js
   - **Variáveis de Ambiente**:
     

### 3. Deploy do Frontend (Static Site)

1. No Render, crie um novo **Static Site**
2. Conecte ao mesmo repositório Git
3. Configure:
   - **Nome**: vitalis (ou escolha outro nome)
   - **Root Directory**: client
   - **Build Command**: npm install && npm run build
   - **Publish Directory**: build
   - **Variáveis de Ambiente**:
     
     (Substitua pela URL do seu backend após criação)

### 4. Inicialização do Banco de Dados

Após o deploy do backend, execute as migrações pelo terminal do Render:

1. Vá para o serviço do backend no Render
2. Abra a aba "Shell"
3. Execute: 
   

## Tecnologias Utilizadas

- **Frontend**: React, Material-UI, Recharts
- **Backend**: Node.js, Express
- **Banco de Dados**: PostgreSQL
- **Autenticação**: JWT
- **Hospedagem**: Render
