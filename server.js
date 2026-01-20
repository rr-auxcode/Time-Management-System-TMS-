import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} ${req.url}`);
  next();
});

// Serve static files from the dist directory
const distPath = join(__dirname, 'dist');
if (!existsSync(distPath)) {
  console.error('ERROR: dist directory does not exist!');
  console.error('Make sure the build completed successfully.');
  console.error(`Expected path: ${distPath}`);
  process.exit(1);
}

// Serve static files (CSS, JS, images, etc.) - exclude index.html
// Only serve files that actually exist, let routes handle everything else
app.use(express.static(distPath, {
  maxAge: '1y',
  etag: false,
  index: false, // Don't auto-serve index.html
  fallthrough: true // Continue to next middleware if file not found
}));

// Handle root path explicitly - this is critical for OAuth redirects
app.get('/', (req, res) => {
  try {
    const indexPath = join(__dirname, 'dist', 'index.html');
    if (!existsSync(indexPath)) {
      console.error('ERROR: index.html not found in dist directory');
      console.error(`Expected path: ${indexPath}`);
      return res.status(500).send('Application not built correctly. Please check build logs.');
    }
    
    const html = readFileSync(indexPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error loading index.html:', error);
    res.status(500).send('Error loading application');
  }
});

// Handle client-side routing - serve index.html for all other routes
app.get('*', (req, res) => {
  try {
    const indexPath = join(__dirname, 'dist', 'index.html');
    if (!existsSync(indexPath)) {
      console.error('ERROR: index.html not found in dist directory');
      console.error(`Expected path: ${indexPath}`);
      return res.status(500).send('Application not built correctly. Please check build logs.');
    }
    
    const html = readFileSync(indexPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error loading index.html:', error);
    res.status(500).send('Error loading application');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Internal server error');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving files from: ${distPath}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
