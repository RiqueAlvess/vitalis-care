const { pool } = require('./index');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Iniciando migração do banco de dados...');
    
    // Criar tabela de controle de migrações se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Ler arquivos de migração
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ordenar por nome para garantir a ordem de execução
    
    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');
      
      // Verificar se a migração já foi executada
      const checkResult = await client.query(
        'SELECT * FROM migrations WHERE name = $1',
        [migrationName]
      );
      
      if (checkResult.rows.length === 0) {
        console.log(`Executando migração: ${migrationName}`);
        
        // Ler conteúdo do arquivo SQL
        const migrationPath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        // Iniciar transação
        await client.query('BEGIN');
        
        try {
          // Executar SQL
          await client.query(migrationSql);
          
          // Registrar migração como executada
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [migrationName]
          );
          
          // Commit da transação
          await client.query('COMMIT');
          console.log(`Migração ${migrationName} executada com sucesso.`);
        } catch (error) {
          // Rollback em caso de erro
          await client.query('ROLLBACK');
          console.error(`Erro ao executar migração ${migrationName}:`, error);
          throw error;
        }
      } else {
        console.log(`Migração ${migrationName} já foi executada anteriormente.`);
      }
    }
    
    console.log('Migração finalizada com sucesso.');
  } catch (error) {
    console.error('Erro durante o processo de migração:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Executar migração
runMigration()
  .then(() => {
    console.log('Processo de migração concluído.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro no processo de migração:', error);
    process.exit(1);
  });
