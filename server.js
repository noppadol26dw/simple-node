const app = require('./src/app');
const db = require('./src/db');

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  // Wait for Postgres before accepting traffic.
  await db.waitForDb();

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown so the container stops cleanly.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
      db.pool.end().then(() => {
        console.log('Closed server and DB pool');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
