import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log("Starting data migration...");
  await pool.query("BEGIN");
  
  // Create owners table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "owners" (
      "id" serial PRIMARY KEY NOT NULL,
      "phone" text NOT NULL UNIQUE,
      "password_hash" text NOT NULL,
      "name" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  // Add owner_id to shops if it doesn't exist
  await pool.query(`
    ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_id integer;
  `);

  // Migrate data
  const { rows: shops } = await pool.query(`
    SELECT id, phone, password_hash, owner_name 
    FROM shops 
    WHERE owner_id IS NULL
  `).catch(() => ({ rows: [] }));
  
  console.log(`Found ${shops.length} shops to migrate.`);
  
  for (const shop of shops) {
    if (!shop.phone) continue;
    // insert owner and get id
    const { rows: owner } = await pool.query(`
      INSERT INTO owners (phone, password_hash, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [shop.phone, shop.password_hash, shop.owner_name]);
    
    // link shop to owner
    await pool.query(`
      UPDATE shops SET owner_id = $1 WHERE id = $2
    `, [owner[0].id, shop.id]);
  }

  // Now, drop old columns
  await pool.query(`
    ALTER TABLE shops 
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS password_hash,
    DROP COLUMN IF EXISTS owner_name;
  `);

  // Make owner_id NOT NULL and add foreign key
  await pool.query(`
    ALTER TABLE shops ALTER COLUMN owner_id SET NOT NULL;
  `);
  
  await pool.query(`
    ALTER TABLE shops ADD CONSTRAINT "shops_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade;
  `).catch(e => console.log("Constraint might already exist:", e.message));

  await pool.query("COMMIT");
  console.log("Migration successful!");
  process.exit(0);
}

migrate().catch(e => {
  pool.query("ROLLBACK").finally(() => {
    console.error(e);
    process.exit(1);
  });
});
