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

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Check dist directory exists
const distPath = join(__dirname, 'dist');
console.log('Checking dist path:', distPath);

if (!existsSync(distPath)) {
  console.error('ERROR: dist directory does not exist!');
  console.error(`Expected path: ${distPath}`);
  console.error('Current directory:', __dirname);
  process.exit(1);
}

const indexPath = join(__dirname, 'dist', 'index.html');
console.log('Checking index.html:', indexPath);

if (!existsSync(indexPath)) {
  console.error('ERROR: index.html not found in dist directory');
  console.error(`Expected path: ${indexPath}`);
  process.exit(1);
}

console.log('Dist directory and index.html found. Starting server...');

// Serve static files
app.use(express.static(distPath, {
  maxAge: '1y',
  etag: false
}));

// Serve index.html for all routes (SPA routing)
app.get('*', (req, res) => {
  try {
    console.log(`Serving index.html for: ${req.path}`);
    const html = readFileSync(indexPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error reading index.html:', error);
    console.error('Error stack:', error.stack);
    res.status(500).send('Error loading application');
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  console.error('Error stack:', err.stack);
  res.status(500).send('Internal server error');
});

// Start server
let server;
try {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Serving from: ${distPath}`);
    console.log(`✅ Ready to accept requests`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

// Error handlers
server.on('error', (error) => {
  console.error('Server error:', error);
  console.error('Error code:', error.code);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});
