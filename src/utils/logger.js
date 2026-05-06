const winston = require('winston');
const path = require('path');
const config = require('../config/config');

/**
 * Logger Configuration
 * Provides structured logging with different levels and outputs
 */

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'satyameva-jayate' },
  transports: [
    // Write all logs to combined file
    new winston.transports.File({
      filename: path.join(config.logging.file.replace('.log', '-error.log')),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined file
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for development
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Logger helper methods for different contexts
 */
const auditLogger = {
  /**
   * Log user authentication events
   */
  auth: (action, userId, details = {}) => {
    logger.info('Authentication Event', {
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  },

  /**
   * Log evidence access events
   */
  evidence: (action, evidenceId, userId, details = {}) => {
    logger.info('Evidence Access', {
      action,
      evidenceId,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  },

  /**
   * Log case management events
   */
  case: (action, caseId, userId, details = {}) => {
    logger.info('Case Management', {
      action,
      caseId,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  },

  /**
   * Log security events
   */
  security: (event, severity, details = {}) => {
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    logger.log(level, 'Security Event', {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details
    });
  }
};

/**
 * Request logger middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

module.exports = {
  logger,
  auditLogger,
  requestLogger
};
