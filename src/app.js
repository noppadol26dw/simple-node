const os = require('os');
const express = require('express');
const client = require('prom-client');
const db = require('./db');
const booksRouter = require('./routes/books');

const app = express();

// Prometheus: default process metrics (CPU, memory, event-loop lag) plus a
// request counter. Labelled by method + status only — adding the raw URL path
// would explode cardinality once /books/:id has many ids.
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status'],
  registers: [register],
});

app.use(express.json());

// Tag the responding container (so load balancing is visible), log, and count.
app.use((req, res, next) => {
  res.setHeader('X-Served-By', os.hostname());
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} -> ${res.statusCode}`);
    // Don't count scrapes of /metrics, or the request rate is all scrape noise.
    if (req.path !== '/metrics') {
      httpRequests.inc({ method: req.method, status: res.statusCode });
    }
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Liveness/readiness probe — also checks the DB connection.
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Books API', endpoints: ['/books', '/health'] });
});

app.use('/books', booksRouter);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
