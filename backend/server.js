const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads folder exists safely
const uploadsDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem safe handling
}

// Ensure database connection in serverless lifecycle
let isDbReady = false;
app.use(async (req, res, next) => {
  if (!isDbReady) {
    try {
      await connectDB();
      isDbReady = true;
    } catch (e) {
      // dbAdapter falls back to in-memory store if MongoDB is offline
    }
  }
  next();
});

// Normalize request URLs in Vercel Serverless environment
app.use((req, res, next) => {
  const matchedPath = req.headers['x-matched-path'];
  if (matchedPath && (matchedPath.startsWith('/api') || matchedPath.startsWith('/uploads')) && req.url !== matchedPath) {
    req.url = matchedPath;
  } else if (req.headers['x-now-route-matches']) {
    try {
      const match = new URLSearchParams(req.headers['x-now-route-matches']).get('1');
      if (match) {
        req.url = `/api/${decodeURIComponent(match).replace(/^\/+/, '')}`;
      }
    } catch (e) {}
  } else if (req.query && req.query.path) {
    const subpath = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    req.url = `/api/${subpath.replace(/^\/+/, '')}`;
  }
  next();
});

// Serve uploaded static files
app.use(['/uploads', '/api/uploads'], express.static(uploadsDir));

// Serve frontend static files
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// API Routes (Mounted on both /api/* and standard prefixes for maximum serverless resilience)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/items', '/items'], itemRoutes);

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Lost & Found Campus Portal API is running',
    timestamp: new Date().toISOString(),
  });
});

// Root API info endpoint
app.get(['/api', '/api/'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Lost & Found Campus Portal API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      items: '/api/items',
      health: '/api/health',
    },
    timestamp: new Date().toISOString(),
  });
});

// Fallback route for HTML pages in frontend
app.get('*', (req, res, next) => {
  // If it's an API route that wasn't handled, return 404 JSON
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/items')) {
    return res.status(404).json({
      success: false,
      message: `API route ${req.originalUrl || req.path} not found`,
    });
  }

  // If path matches a html file, send it
  const potentialFile = path.join(frontendDir, req.path.endsWith('.html') ? req.path : `${req.path}.html`);
  if (fs.existsSync(potentialFile)) {
    return res.sendFile(potentialFile);
  }

  // Default to index.html
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);

  // Multer Error
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large! Maximum image size allowed is 5MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  }

  // CastError (Invalid MongoDB ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(404).json({
      success: false,
      message: 'Item not found (Invalid ID format)',
    });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join('. '),
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('====================================================');
      console.log(` LOST & FOUND CAMPUS PORTAL SERVER RUNNING`);
      console.log(` Local URL: http://localhost:${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('====================================================');
    });
    return server;
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
