import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== SERVER STARTING ===');
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
let indexHtml;
try {
  indexHtml = readFileSync(indexPath, 'utf8');
  console.log('✅ index.html loaded');
} catch (error) {
  console.error('ERROR loading index.html:', error);
  process.exit(1);
}

// Health check - FIRST route, respond immediately
app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.status(200).send('OK');
});

// Root route - SECOND route, respond immediately
app.get('/', (req, res) => {
  console.log('✅ Root path requested');
  res.setHeader('Content-Type', 'text/html');
  res.send(indexHtml);
});

// Log all other requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Serve static assets
app.use('/assets', express.static(join(distPath, 'assets')));
app.use(express.static(distPath, { index: false }));

// Catch-all for SPA routes
app.get('*', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(indexHtml);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
let server;
try {
  server = app.listen(PORT, '0.0.0.0', () => {
    const addr = server.address();
    console.log('=== SERVER READY ===');
    console.log(`✅ Listening on ${addr.address}:${addr.port}`);
    console.log(`✅ Health: http://0.0.0.0:${PORT}/health`);
    console.log(`✅ Root: http://0.0.0.0:${PORT}/`);
    console.log('=== READY FOR REQUESTS ===');
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

// Handle SIGTERM gracefully (Railway sends this)
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received - Railway is stopping container');
  console.log('This might be normal if health check failed');
  if (server) {
    server.close(() => {
      console.log('Server closed gracefully');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
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
