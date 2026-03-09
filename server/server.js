require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./src/config/database');
const { initSocket } = require('./src/config/socket');
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

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

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

// Error handler
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  // Start background cron jobs
  startDeadlineChecker(io);
  startEscalationChecker(io);
});

module.exports = { app, server, io };
