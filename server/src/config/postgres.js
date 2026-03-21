const { Pool } = require('pg');

let pool;

const getPool = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required when DATABASE_PROVIDER=postgres');
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
  }

  return pool;
};

const connectPostgres = async () => {
  const client = await getPool().connect();
  try {
    await client.query('SELECT 1');
    console.log('✅ PostgreSQL Connected');
  } finally {
    client.release();
  }
};

module.exports = {
  connectPostgres,
  getPool
};
