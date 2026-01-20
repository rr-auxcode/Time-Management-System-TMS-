import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting server...');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Verify files exist
const distPath = join(__dirname, 'dist');
const indexPath = join(__dirname, 'dist', 'index.html');

if (!existsSync(distPath) || !existsSync(indexPath)) {
  console.error('ERROR: dist directory or index.html not found!');
  process.exit(1);
}

// Load index.html once
const indexHtml = readFileSync(indexPath, 'utf8');
console.log('✅ index.html loaded');

// Health check - MUST be FIRST and respond IMMEDIATELY (Railway checks this)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Root route - MUST be second, respond IMMEDIATELY (Railway might check this too)
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(indexHtml);
});

// Request logging (after critical routes to avoid slowing them)
app.use((req, res, next) => {
  if (req.path !== '/health' && req.path !== '/') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Serve static assets (but not index.html)
app.use('/assets', express.static(join(distPath, 'assets')));
app.use(express.static(distPath, { index: false }));

// Catch-all for SPA routes
app.get('*', (req, res) => {
  console.log(`Serving SPA route: ${req.path}`);
  res.setHeader('Content-Type', 'text/html');
  res.send(indexHtml);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server - CRITICAL: Must respond immediately to health checks
const server = app.listen(PORT, '0.0.0.0', () => {
  const addr = server.address();
  console.log(`✅ Server listening on ${addr.address}:${addr.port}`);
  console.log(`✅ Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`✅ Root: http://0.0.0.0:${PORT}/`);
  console.log('✅ Server ready - Railway can now health check');
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
