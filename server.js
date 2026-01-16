import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist'), {
  maxAge: '1y',
  etag: false
}));

// Handle client-side routing - serve index.html for all routes
app.get('*', (req, res) => {
  try {
    const html = readFileSync(join(__dirname, 'dist', 'index.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error loading index.html:', error);
    res.status(500).send('Error loading application');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
