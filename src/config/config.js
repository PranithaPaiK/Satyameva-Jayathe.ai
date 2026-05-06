require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/satyameva-jayate',
    name: process.env.DB_NAME || 'satyameva-jayate'
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  },
  
  // OTP Configuration
  otp: {
    secret: process.env.OTP_SECRET || 'fallback-otp-secret',
    digits: 6,
    window: 2, // Time window in minutes
    step: 30 // Time step in seconds
  },
  
  // File Upload Configuration
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    path: process.env.UPLOAD_PATH || './uploads',
    allowedTypes: {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
    }
  },
  
  // Cloud Storage Configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET
  },
  
  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  },
  
  // Speech Recognition Configuration
  speech: {
    apiKey: process.env.SPEECH_API_KEY,
    language: 'en-US',
    sampleRate: 16000
  },
  
  // Security Configuration
  security: {
    bcryptRounds: 12,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // Limit each IP to 100 requests per windowMs
    sessionTimeout: 30 * 60 * 1000 // 30 minutes
  },
  
  // Evidence Vault Configuration
  evidenceVault: {
    hashAlgorithm: 'sha256',
    encryptionAlgorithm: 'aes-256-gcm',
    retentionPeriod: '10y' // 10 years
  }
};

// Validation
const validateConfig = () => {
  const requiredEnvVars = ['JWT_SECRET'];
  
  if (config.nodeEnv === 'production') {
    requiredEnvVars.push('MONGODB_URI', 'CLOUDINARY_CLOUD_NAME');
  }
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Using fallback values for development. Set these variables in production.');
  }
};

validateConfig();

module.exports = config;
