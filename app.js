require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import configuration and utilities
const config = require('./src/config/config');
const database = require('./src/config/database');
const { logger, requestLogger } = require('./src/utils/logger');

// Import routes
const authRoutes = require('./src/routes/auth');
const voiceRoutes = require('./src/routes/voice');

/**
 * Enhanced Satyameva Jayate.ai Application
 * Production-ready server with all advanced features
 */
class SatyamevaJayateApp {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:8080",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.setupErrorHandling();
  }

  /**
   * Setup application middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CLIENT_URL || "http://localhost:8080",
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Logging middleware
    this.app.use(requestLogger);
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    }

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindowMs,
      max: config.security.rateLimitMax,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Serve static files
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  }

  /**
   * Setup application routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await database.healthCheck();
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.nodeEnv,
          version: '2.0.0',
          database: dbHealth,
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        };
        
        res.status(200).json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/voice', voiceRoutes);

    // Serve main application
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Serve standalone version
    this.app.get('/standalone', (req, res) => {
      res.sendFile(path.join(__dirname, 'standalone.html'));
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        code: 'NOT_FOUND'
      });
    });
  }

  /**
   * Setup Socket.IO for real-time features
   */
  setupSocketIO() {
    this.io.on('connection', (socket) => {
      logger.info('Client connected:', socket.id);

      // Join hearing room
      socket.on('join-hearing', (caseId) => {
        socket.join(`hearing-${caseId}`);
        logger.info(`Client ${socket.id} joined hearing room for case ${caseId}`);
      });

      // Handle live statement analysis
      socket.on('statement', async (data) => {
        try {
          const { statement, caseId, speaker } = data;
          
          // Analyze statement for contradictions
          const contradictions = await this.analyzeStatement(statement, caseId);
          
          // Broadcast to hearing room
          this.io.to(`hearing-${caseId}`).emit('contradiction-alert', {
            speaker,
            statement,
            contradictions,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.error('Error analyzing statement:', error);
          socket.emit('analysis-error', {
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle voice recording status updates
      socket.on('voice-status', (data) => {
        const { recordingId, status } = data;
        this.io.emit('voice-update', {
          recordingId,
          status,
          timestamp: new Date().toISOString()
        });
      });

      // Handle case updates
      socket.on('case-update', (data) => {
        const { caseId, update } = data;
        this.io.to(`case-${caseId}`).emit('case-notification', {
          caseId,
          update,
          timestamp: new Date().toISOString()
        });
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected:', socket.id);
      });
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', error);
      
      // Don't leak error details in production
      const message = config.nodeEnv === 'production' 
        ? 'Internal server error' 
        : error.message;

      res.status(error.status || 500).json({
        success: false,
        message,
        code: 'INTERNAL_ERROR',
        ...(config.nodeEnv === 'development' && { stack: error.stack })
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  /**
   * Analyze statement for contradictions (simplified implementation)
   */
  async analyzeStatement(statement, caseId) {
    // This would integrate with the actual contradiction detection service
    // For now, return simulated results
    const hasContradiction = Math.random() > 0.7;
    
    if (hasContradiction) {
      return [{
        type: 'evidence_contradiction',
        severity: 'high',
        description: 'Statement contradicts existing evidence',
        confidence: 0.85
      }];
    }
    
    return [];
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Connect to database
      await database.connect();
      
      // Start server
      this.server.listen(config.port, () => {
        logger.info(`Satyameva Jayate.ai server running on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`Access the application at: http://localhost:${config.port}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    this.server.close(async () => {
      logger.info('HTTP server closed');
      
      // Close database connection
      await database.disconnect();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
}

// Create and start the application
const app = new SatyamevaJayateApp();
app.start();

module.exports = app;
