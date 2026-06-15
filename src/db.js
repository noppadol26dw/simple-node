const { Pool } = require('pg');

// Connection details come from the environment so the same image works
// locally, in docker-compose, and in production without code changes.
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'books',
  max: 10,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err);
});

// Thin query helper so routes don't reach into the pool directly.
function query(text, params) {
  return pool.query(text, params);
}

// Retry the first connection a few times: in docker-compose the app
// container usually starts before Postgres is ready to accept connections.
async function waitForDb(retries = 10, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('Connected to Postgres');
      return;
    } catch (err) {
      console.log(
        `Postgres not ready (attempt ${attempt}/${retries}): ${err.code || err.message}`
      );
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { query, waitForDb, pool };
