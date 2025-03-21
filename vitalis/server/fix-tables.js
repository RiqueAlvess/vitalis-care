// Em vitalis/server/fix-tables.js
const { pool } = require('./db');

async function fixApiConfigurationsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Verificando tabela api_configurations...');
    
    // Verificar se a tabela api_configurations existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'api_configurations'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('A tabela api_configurations não existe. Criando tabela...');
      
      await client.query(`
        CREATE TABLE api_configurations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      console.log('A tabela api_configurations já existe. Verificando colunas...');
      
      // Verificar se todas as colunas necessárias existem
      const columnsToCheck = [
        'empresa_padrao', 'codigo', 'chave', 'ativo', 'inativo', 
        'afastado', 'pendente', 'ferias', 'data_inicio', 'data_fim'
      ];
      
      for (const column of columnsToCheck) {
        const columnCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'api_configurations'
            AND column_name = $1
          );
        `, [column]);
        
        if (!columnCheck.rows[0].exists) {
          console.log(`Adicionando coluna ${column} à tabela api_configurations...`);
          
          let dataType = 'VARCHAR(50)';
          if (column === 'data_inicio' || column === 'data_fim') {
            dataType = 'DATE';
          }
          
          await client.query(`
            ALTER TABLE api_configurations 
            ADD COLUMN ${column} ${dataType};
          `);
          
          console.log(`Coluna ${column} adicionada com sucesso!`);
        }
      }
    }
    
    console.log('Tabela api_configurations verificada e corrigida com sucesso!');
  } catch (error) {
    console.error('Erro ao verificar/criar tabela api_configurations:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar a função
fixApiConfigurationsTable()
  .then(() => {
    console.log('Correção concluída com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro na correção:', error);
    process.exit(1);
  });
