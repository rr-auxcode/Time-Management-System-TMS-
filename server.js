import http from 'http';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;

console.log('=== SERVER STARTING ===');
console.log('PORT:', PORT);

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

// Create Express app
const app = express();

// Health check - FIRST route, respond immediately
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Root route - respond immediately
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(indexHtml);
});

// Log requests (after critical routes)
app.use((req, res, next) => {
  if (req.path !== '/health' && req.path !== '/') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
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

// Create HTTP server
const server = http.createServer(app);

// Start listening
server.listen(PORT, '0.0.0.0', () => {
  const addr = server.address();
  console.log('=== SERVER READY ===');
  console.log(`✅ Listening on ${addr.address}:${addr.port}`);
  console.log(`✅ Health: http://0.0.0.0:${PORT}/health`);
  console.log(`✅ Root: http://0.0.0.0:${PORT}/`);
  console.log('=== READY FOR REQUESTS ===');
  
  // Verify server is actually listening
  server.getConnections((err, count) => {
    if (err) {
      console.error('Error getting connections:', err);
    } else {
      console.log(`✅ Server can accept connections (current: ${count})`);
    }
  });
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received - shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
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
