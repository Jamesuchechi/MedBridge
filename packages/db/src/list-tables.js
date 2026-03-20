const postgres = require('postgres');
const connectionString = "postgresql://postgres.btyqdizgspnfjqyqveuq:uchechi3310@aws-1-eu-west-2.pooler.supabase.com:6543/postgres";
const sql = postgres(connectionString);

async function listTables() {
  try {
    console.log('Connecting to:', connectionString);
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Existing tables:', tables.map(t => t.table_name));
  } catch (err) {
    console.error('Error listing tables:', err);
  } finally {
    await sql.end();
  }
}

listTables();
