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

// Health check - MUST be first route
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Check dist directory
const distPath = join(__dirname, 'dist');
const indexPath = join(__dirname, 'dist', 'index.html');

if (!existsSync(distPath)) {
  console.error('ERROR: dist directory does not exist!');
  process.exit(1);
}

if (!existsSync(indexPath)) {
  console.error('ERROR: index.html not found!');
  process.exit(1);
}

console.log('Files verified. Setting up routes...');

// Serve static files
app.use(express.static(distPath));

// Serve index.html for all routes
app.get('*', (req, res) => {
  try {
    const html = readFileSync(indexPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).send('Internal server error');
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  const addr = server.address();
  console.log(`✅ Server listening on ${addr.address}:${addr.port}`);
  console.log(`✅ Health check: http://0.0.0.0:${PORT}/health`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
