require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const telemetryRoutes = require('./routes/telemetry');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for client interaction (allows local dev and Vercel deployments)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// High-throughput JSON parser with reasonable limit
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB on startup (non-blocking)
connectDB()
  .then((db) => {
    if (db) {
      console.log('⚡ [Database] MongoDB connection established');
    } else {
      console.log('⚡ [Database] In-memory buffer active (Set MONGODB_URI to use persistent MongoDB)');
    }
  })
  .catch((err) => {
    console.warn('⚠️ [Database] Initial connection notice:', err.message);
  });

// Health check endpoint (matches both /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Live Telemetry & System Monitoring System',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    hasMongoUri: Boolean(process.env.MONGODB_URI),
  });
});

// Telemetry API routes (matches both /api/telemetry and /telemetry for Vercel serverless routing)
app.use('/api/telemetry', telemetryRoutes);
app.use('/telemetry', telemetryRoutes);

// Serve static frontend build if present (Unified monolithic deployment)
const rootDistPath = path.join(__dirname, '../dist');
const clientDistPath = path.join(__dirname, '../client/dist');
const clientBuildPath = require('fs').existsSync(rootDistPath) ? rootDistPath : clientDistPath;
app.use(express.static(clientBuildPath));

// Fallback for SPA routing if static files exist
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If client is not built yet, return friendly API status
      res.json({
        message: 'Live Telemetry & System Monitoring API is active',
        apiDocs: {
          ingest: 'POST /api/telemetry',
          query: 'GET /api/telemetry',
          stats: 'GET /api/telemetry/stats',
          units: 'GET /api/telemetry/units',
          stream: 'GET /api/telemetry/stream',
          health: 'GET /api/health',
        },
      });
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start listener when running standalone (not inside Vercel serverless function)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 [Server] Telemetry Ingestion API running at http://localhost:${PORT}`);
    console.log(`📡 [Endpoint] Ingest: http://localhost:${PORT}/api/telemetry`);
    console.log(`📊 [Dashboard] Stats: http://localhost:${PORT}/api/telemetry/stats`);
  });
}

// Export for Vercel serverless function entry
module.exports = app;
