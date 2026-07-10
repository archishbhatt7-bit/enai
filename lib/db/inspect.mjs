import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'shops';
  `);
  console.log("Shops table columns:");
  console.log(JSON.stringify(result.rows, null, 2));
  
  const ownersCheck = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'owners'
    );
  `);
  console.log("Owners table exists:", ownersCheck.rows[0].exists);
  
  process.exit(0);
}

main().catch(console.error);
