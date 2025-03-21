const { pool } = require('./db');

async function fixApiConfigurationsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Verificando tabela api_configurations...');
    
    // Verificar se a tabela existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'api_configurations'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (tableExists) {
      console.log('A tabela api_configurations já existe, verificando colunas...');
      
      // Garantir que todas as colunas necessárias existam
      const columnsToCheck = [
        { name: 'empresa_padrao', type: 'VARCHAR(50)' },
        { name: 'codigo', type: 'VARCHAR(50)' },
        { name: 'chave', type: 'VARCHAR(255)' },
        { name: 'ativo', type: 'VARCHAR(50)' },
        { name: 'inativo', type: 'VARCHAR(50)' },
        { name: 'afastado', type: 'VARCHAR(50)' },
        { name: 'pendente', type: 'VARCHAR(50)' },
        { name: 'ferias', type: 'VARCHAR(50)' },
        { name: 'data_inicio', type: 'DATE' },
        { name: 'data_fim', type: 'DATE' }
      ];
      
      for (const column of columnsToCheck) {
        const columnCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'api_configurations'
            AND column_name = $1
          );
        `, [column.name]);
        
        if (!columnCheck.rows[0].exists) {
          console.log(`Adicionando coluna ${column.name} à tabela...`);
          await client.query(`
            ALTER TABLE api_configurations 
            ADD COLUMN ${column.name} ${column.type};
          `);
        }
      }
      
      console.log('Verificação de colunas concluída.');
    } else {
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
      
      console.log('Tabela api_configurations criada com sucesso.');
    }
    
    console.log('Verificação e correção concluídas com sucesso!');
  } catch (error) {
    console.error('Erro ao verificar/corrigir tabela api_configurations:', error);
  } finally {
    client.release();
  }
}

// Executar a função
fixApiConfigurationsTable()
  .then(() => {
    console.log('Processo finalizado.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro no processo:', error);
    process.exit(1);
  });
