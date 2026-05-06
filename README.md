# Satyameva Jayate.ai - Enhanced Judicial Platform

## 🚀 Overview

Satyameva Jayate.ai is an advanced AI-driven integrity and evidence ecosystem for Court Case Monitoring Systems (CCMS). This enhanced version includes cutting-edge features like voice recording with speech recognition, tamper-proof evidence storage, secure authentication, and real-time collaboration.

## ✨ Key Features

### 🔐 Advanced Authentication System
- **JWT-based authentication** with refresh tokens
- **Role-based access control (RBAC)** for judges, lawyers, and citizens
- **Two-factor authentication** with OTP support
- **Session management** with timeout and security monitoring
- **Password encryption** using bcrypt with 12 rounds

### 🎤 Voice Sensing + Storage System
- **Real-time voice recording** using Web Audio API
- **Speech-to-text transcription** with multiple engine support
- **Audio storage** with integrity verification
- **Live transcription** during recording sessions
- **Sentiment analysis** and keyword extraction
- **Contradiction detection** against existing evidence

### 🛡️ Tamper-Proof Evidence Storage
- **SHA-256 cryptographic hashing** for integrity verification
- **Chain of custody tracking** with detailed audit logs
- **Access control** with granular permissions
- **File type validation** for images, videos, PDFs, and audio
- **Cloud storage integration** (Cloudinary, AWS S3)
- **Secure file upload** with virus scanning

### 📊 Fully Functional Dashboards
- **Role-specific dashboards** for judges, lawyers, and citizens
- **Real-time statistics** and analytics
- **Interactive charts** and visualizations
- **Case management** with status tracking
- **Evidence heatmaps** for strategic analysis
- **Hearing schedules** and reminders

### 📚 Integrated Law Library
- **Searchable legal database** with acts and sections
- **Keyword-based search** with highlighting
- **Category filtering** for efficient navigation
- **Simplified explanations** for common users
- **Cross-references** and related laws

### ⚡ Real-Time Features
- **WebSocket integration** for live updates
- **Contradiction radar** with instant alerts
- **Live hearing room** with real-time transcription
- **Case notifications** and status updates
- **Collaborative tools** for multi-user access

## 🏗️ Architecture

### Clean Architecture Pattern
```
src/
├── config/          # Configuration files
├── controllers/     # Business logic handlers
├── middleware/      # Request processing middleware
├── models/         # Database models and schemas
├── routes/         # API route definitions
├── services/       # Business service layer
├── utils/          # Utility functions and helpers
└── database/       # Database configuration
```

### Technology Stack

#### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Socket.IO** for real-time communication
- **Multer** for file uploads
- **Winston** for logging
- **Helmet** for security

#### Frontend
- **HTML5** with semantic markup
- **Tailwind CSS** for styling
- **Vanilla JavaScript** (no framework dependencies)
- **Web Audio API** for voice recording
- **Speech Recognition API** for transcription
- **Socket.IO Client** for real-time updates

#### Security
- **bcrypt** for password hashing
- **Helmet.js** for security headers
- **Rate limiting** for API protection
- **CORS** configuration
- **Input validation** and sanitization

## 📋 Prerequisites

### System Requirements
- **Node.js** v16.0 or higher
- **MongoDB** v4.4 or higher
- **npm** v8.0 or higher
- **Modern web browser** with Web Audio API support

### Browser Compatibility
- **Chrome** v80+
- **Firefox** v75+
- **Safari** v13+
- **Edge** v80+

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd satyameva-jayate-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=8080
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/satyameva-jayate

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRE=30d

# File Upload Configuration
MAX_FILE_SIZE=50000000
UPLOAD_PATH=./uploads

# Cloud Storage (Optional)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
```

### 4. Database Setup
```bash
# Start MongoDB service
sudo systemctl start mongod

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 5. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 6. Access the Application
- **Enhanced Version**: http://localhost:8080/enhanced.html
- **Standalone Version**: http://localhost:8080/standalone.html
- **API Documentation**: http://localhost:8080/api-docs

## 📖 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "securePassword123",
  "role": "lawyer",
  "barCode": "BAR123456"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123",
  "otp": "123456"  // Optional for 2FA
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

### Voice Recording Endpoints

#### Upload Voice Recording
```http
POST /api/voice/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

audio: <audio_file>
caseId: "case_id_here"
title: "Recording Title"
speakerRole: "judge"
```

#### Get Voice Recording
```http
GET /api/voice/:recordingId
Authorization: Bearer <token>
```

#### Get Case Recordings
```http
GET /api/voice/case/:caseId?page=1&limit=10
Authorization: Bearer <token>
```

### Evidence Endpoints

#### Upload Evidence
```http
POST /api/evidence/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

evidence: <file>
caseId: "case_id_here"
title: "Evidence Title"
category: "document"
```

#### Get Evidence
```http
GET /api/evidence/:evidenceId
Authorization: Bearer <token>
```

## 🔧 Configuration

### Database Models

#### User Model
```javascript
{
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  password: String,  // Hashed
  role: String,     // judge, lawyer, citizen, admin
  barCode: String,  // For judges/lawyers
  specialization: [String],
  experience: Number,
  isEmailVerified: Boolean,
  isPhoneVerified: Boolean,
  isActive: Boolean,
  isSuspended: Boolean
}
```

#### Case Model
```javascript
{
  caseId: String,
  title: String,
  description: String,
  caseType: String,
  category: String,
  plaintiff: Object,
  defendant: Object,
  assignedJudge: ObjectId,
  status: String,
  priority: String,
  filingDate: Date,
  evidenceIds: [ObjectId],
  hearings: [ObjectId]
}
```

#### Evidence Model
```javascript
{
  evidenceId: String,
  filename: String,
  originalName: String,
  mimeType: String,
  size: Number,
  fileHash: String,
  uploadedBy: ObjectId,
  caseId: ObjectId,
  category: String,
  title: String,
  description: String,
  isVerified: Boolean,
  chainOfCustody: [Object]
}
```

#### Voice Recording Model
```javascript
{
  recordingId: String,
  filename: String,
  duration: Number,
  caseId: ObjectId,
  recordedBy: ObjectId,
  speakerRole: String,
  transcription: {
    text: String,
    confidence: Number,
    status: String
  },
  analysis: {
    sentiment: String,
    keywords: [Object],
    contradictions: [ObjectId]
  }
}
```

## 🔒 Security Features

### Authentication Security
- **Password hashing** with bcrypt (12 rounds)
- **JWT tokens** with expiration and refresh mechanism
- **Rate limiting** to prevent brute force attacks
- **Account lockout** after failed attempts
- **Session timeout** for inactive sessions

### Data Security
- **Input validation** and sanitization
- **SQL injection prevention** with parameterized queries
- **XSS protection** with content security policy
- **File upload validation** and virus scanning
- **Encryption at rest** for sensitive data

### Network Security
- **HTTPS enforcement** in production
- **CORS configuration** for cross-origin requests
- **Security headers** with Helmet.js
- **API rate limiting** for abuse prevention

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run API tests
npm run test:api
```

### End-to-End Tests
```bash
# Run E2E tests
npm run test:e2e
```

## 📊 Monitoring & Logging

### Application Logging
- **Winston logger** with multiple transports
- **Log levels**: error, warn, info, debug
- **File rotation** for log management
- **Structured logging** with JSON format

### Audit Logging
- **User authentication** events
- **Evidence access** tracking
- **Case management** actions
- **Security events** monitoring

### Performance Monitoring
- **Response time** tracking
- **Error rate** monitoring
- **Database query** performance
- **Memory usage** tracking

## 🚀 Deployment

### Development Deployment
```bash
# Start development server
npm run dev

# With hot reload
npm run dev:watch
```

### Production Deployment
```bash
# Build for production
npm run build

# Start production server
npm start

# With PM2 process manager
pm2 start app.js --name satyameva-jayate
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

```bash
# Build Docker image
docker build -t satyameva-jayate .

# Run container
docker run -d -p 8080:8080 satyameva-jayate
```

## 🔧 Troubleshooting

### Common Issues

#### Voice Recording Not Working
- Check browser permissions for microphone
- Ensure HTTPS is enabled in production
- Verify Web Audio API support
- Check network connectivity

#### Authentication Issues
- Verify JWT secret configuration
- Check token expiration
- Ensure proper CORS setup
- Verify database connection

#### File Upload Problems
- Check upload directory permissions
- Verify file size limits
- Ensure proper MIME type validation
- Check storage configuration

### Debug Mode
```bash
# Enable debug logging
DEBUG=app:* npm start

# Run with verbose output
npm run dev -- --verbose
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Code review and merge

### Code Standards
- **ESLint** for code linting
- **Prettier** for code formatting
- **Conventional commits** for commit messages
- **TypeScript** for type safety (optional)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and inquiries:
- **Email**: support@satyamevajayate.ai
- **Documentation**: https://docs.satyamevajayate.ai
- **Issues**: https://github.com/satyameva-jayate/issues

## 🗺️ Roadmap

### Upcoming Features
- [ ] **AI-powered legal research** with natural language processing
- [ ] **Blockchain integration** for evidence verification
- [ ] **Mobile applications** for iOS and Android
- [ ] **Advanced analytics** with machine learning
- [ ] **Multi-language support** for international courts
- [ ] **Video conferencing** integration for remote hearings
- [ ] **Digital signature** support for documents
- [ ] **Automated scheduling** with calendar integration

### Performance Improvements
- [ ] **Database optimization** with indexing strategies
- [ ] **Caching layer** with Redis
- [ ] **CDN integration** for static assets
- [ ] **Load balancing** for high availability

---

**Satyameva Jayate.ai** - Truth Alone Triumphs through Technology 🚀
