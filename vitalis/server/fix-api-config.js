const { Pool } = require('pg');

// Conexão direta com o banco de dados
const pool = new Pool({
  connectionString: 'postgresql://db_vitalis_user:skk1guiKUO5fe77SDZJGzHHZhXu2jitP@dpg-cvblvjd2ng1s73efitig-a.oregon-postgres.render.com/db_vitalis',
  ssl: { rejectUnauthorized: false }
});

async function fixApiConfig() {
  const client = await pool.connect();
  
  try {
    console.log('Verificando e corrigindo tabela api_configurations...');
    
    // Verificar se a tabela existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'api_configurations'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Criando tabela api_configurations...');
      await client.query(`
        CREATE TABLE api_configurations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          api_type VARCHAR(50) NOT NULL, 
          empresa_padrao VARCHAR(50),
          codigo VARCHAR(50),
          chave VARCHAR(255),
          ativo VARCHAR(50),
          inativo VARCHAR(50),
          afastado VARCHAR(50),
          pendente VARCHAR(50),
          ferias VARCHAR(50),
          data_inicio DATE,
          data_fim DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, api_type)
        );
      `);
      console.log('Tabela api_configurations criada com sucesso!');
    } else {
      console.log('Tabela api_configurations já existe, verificando colunas...');
      
      // Lista de colunas que devem existir na tabela
      const requiredColumns = [
        'empresa_padrao', 'codigo', 'chave', 'ativo', 'inativo', 
        'afastado', 'pendente', 'ferias', 'data_inicio', 'data_fim'
      ];
      
      // Verificar cada coluna
      for (const column of requiredColumns) {
        const columnExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'api_configurations' 
            AND column_name = $1
          );
        `, [column]);
        
        if (!columnExists.rows[0].exists) {
          console.log(`Adicionando coluna ${column} à tabela...`);
          // Determinar o tipo de dados da coluna
          let dataType = 'VARCHAR(50)';
          if (column === 'data_inicio' || column === 'data_fim') {
            dataType = 'DATE';
          }
          
          await client.query(`
            ALTER TABLE api_configurations ADD COLUMN ${column} ${dataType};
          `);
          console.log(`Coluna ${column} adicionada com sucesso!`);
        }
      }
    }
    
    // Inserir alguns dados de teste
    console.log('Verificando se existem dados de configuração para o usuário 1...');
    const configExists = await client.query(`
      SELECT COUNT(*) FROM api_configurations WHERE user_id = 1;
    `);
    
    if (parseInt(configExists.rows[0].count) === 0) {
      console.log('Inserindo configurações de teste para o usuário 1...');
      await client.query(`
        INSERT INTO api_configurations (user_id, api_type, empresa_padrao, codigo, chave, ativo)
        VALUES (1, 'funcionario', '123', '123456', 'chave_teste', 'Sim')
        ON CONFLICT (user_id, api_type) DO NOTHING;
        
        INSERT INTO api_configurations (user_id, api_type, empresa_padrao, codigo, chave)
        VALUES (1, 'absenteismo', '123', '123456', 'chave_teste')
        ON CONFLICT (user_id, api_type) DO NOTHING;
      `);
      console.log('Dados de teste inseridos com sucesso!');
    } else {
      console.log('Configurações já existem para o usuário 1.');
    }
    
    console.log('Processo concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao verificar/corrigir tabela api_configurations:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixApiConfig().catch(console.error);
