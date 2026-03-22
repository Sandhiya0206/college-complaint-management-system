require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { sequelize, testConnection, syncDatabase } = require('./src/config/sequelize');
const { initSocket } = require('./src/config/socket');
const { corsOptions } = require('./src/config/cors');
const errorMiddleware = require('./src/middleware/error.middleware');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const complaintRoutes = require('./src/routes/complaint.routes');
const adminRoutes = require('./src/routes/admin.routes');
const workerRoutes = require('./src/routes/worker.routes');
const imageRoutes = require('./src/routes/image.routes');

const { startDeadlineChecker } = require('./src/cron/deadlineChecker');
const { startEscalationChecker } = require('./src/cron/escalationChecker');

const app = express();
const server = http.createServer(app);

// Init Socket.io
const io = initSocket(server);
app.set('io', io);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/image', imageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ========== FRONTEND SERVING (SPA with React Router) ==========
// Serve static files from client dist
const frontendPath = path.join(__dirname, '..', 'client', 'dist');

// Log frontend path for debugging
console.log(`📁 Frontend dist path: ${frontendPath}`);
const fs = require('fs');
if (!fs.existsSync(frontendPath)) {
  console.warn(`⚠️  WARNING: Frontend dist folder not found at ${frontendPath}`);
  console.warn('   This will cause 404s for all frontend assets.');
  console.warn('   Ensure npm run build:production was executed during deployment.');
}

app.use('/assets', express.static(path.join(frontendPath, 'assets'), {
  immutable: true,
  maxAge: '1y'
}));

app.use(express.static(frontendPath, {
  index: false,
  maxAge: '1h'
}));

// SPA fallback: serve index.html for all non-API routes (React Router)
app.get('*', (req, res) => {
  // Let API and upload paths continue to normal handlers
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/assets')) {
    return res.status(404).end();
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) res.status(404).json({ success: false, message: 'Frontend build not found' });
  });
});

// Error handler
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

const connectDatabase = async () => {
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Failed to connect to PostgreSQL database');
  }

  // Initialize Sequelize models and sync schema
  require('./src/models/index-sequelize');
  const synced = await syncDatabase();
  if (!synced) {
    console.warn('⚠ Database sync had issues, but continuing...');
  }
  console.log('✓ PostgreSQL database initialized successfully');
};

const startServer = async () => {
  await connectDatabase();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    // Start background cron jobs
    startDeadlineChecker(io);
    startEscalationChecker(io);
  });
};

startServer();

module.exports = { app, server, io };
