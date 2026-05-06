# Satyameva Jayate.ai - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Satyameva Jayate.ai legal platform in production and development environments.

## Prerequisites

### System Requirements

**Minimum:**
- Node.js 16.x or higher
- MongoDB 4.4 or higher
- 4GB RAM
- 20GB Storage
- Ubuntu 18.04+ / CentOS 7+ / Windows Server 2016+

**Recommended:**
- Node.js 18.x LTS
- MongoDB 5.0+
- 8GB RAM
- 50GB Storage
- Ubuntu 20.04+ LTS

### External Services

- **Cloud Storage:** Cloudinary or AWS S3
- **Email Service:** SMTP server (Gmail, SendGrid, etc.)
- **Speech Recognition:** Google Speech-to-Text or AWS Transcribe (optional)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-org/satyameva-jayate-ai.git
cd satyameva-jayate-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy and configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=production
PORT=8080
CLIENT_URL=https://your-domain.com

# Database Configuration
MONGODB_URI=mongodb://username:password@localhost:27017/satyameva-jayate
DB_NAME=satyameva-jayate

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_REFRESH_EXPIRE=30d

# OTP Configuration
OTP_SECRET=your-otp-secret-key-here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Speech Recognition (Optional)
SPEECH_API_KEY=your-speech-api-key

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### 4. Database Setup

#### MongoDB Installation

**Ubuntu/Debian:**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**CentOS/RHEL:**
```bash
sudo vi /etc/yum.repos.d/mongodb-org-5.0.repo
```
Add the following content:
```ini
[mongodb-org-5.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/5.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-5.0.asc
```

```bash
sudo yum install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Database Initialization

Create the database and initial collections:

```bash
npm run db:init
```

### 5. Create Upload Directories

```bash
mkdir -p uploads/{audio,documents,images,videos,temp}
chmod 755 uploads
```

### 6. Build Application

```bash
npm run build
```

## Deployment Options

### Option 1: Direct Node.js Deployment

#### Development

```bash
npm run dev
```

#### Production

```bash
npm start
```

### Option 2: PM2 Process Manager

Install PM2:

```bash
npm install -g pm2
```

Start application with PM2:

```bash
pm2 start ecosystem.config.js
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'satyameva-jayate-ai',
    script: './app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Option 3: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create upload directories
RUN mkdir -p uploads/{audio,documents,images,videos,temp}

# Expose port
EXPOSE 8080

# Start application
CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/satyameva-jayate
    depends_on:
      - mongo
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password

volumes:
  mongo_data:
```

Deploy with Docker:

```bash
docker-compose up -d
```

### Option 4: Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: satyameva-jayate-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: satyameva-jayate-ai
  template:
    metadata:
      labels:
        app: satyameva-jayate-ai
    spec:
      containers:
      - name: app
        image: your-registry/satyameva-jayate-ai:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongodb-uri
        volumeMounts:
        - name: uploads
          mountPath: /app/uploads
      volumes:
      - name: uploads
        persistentVolumeClaim:
          claimName: uploads-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: satyameva-jayate-ai-service
spec:
  selector:
    app: satyameva-jayate-ai
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

## SSL/TLS Configuration

### Using Nginx Reverse Proxy

Create `/etc/nginx/sites-available/satyameva-jayate-ai`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/satyameva-jayate-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring and Logging

### Application Monitoring

Install monitoring dependencies:

```bash
npm install -g pm2-logrotate
```

Configure log rotation:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### Health Checks

The application exposes a health check endpoint:

```bash
curl http://localhost:8080/health
```

### Monitoring with Prometheus

Add to `package.json`:

```json
{
  "scripts": {
    "monitor": "prom-client-node"
  }
}
```

## Security Configuration

### Firewall Setup

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow SSH
sudo ufw allow 22

# Enable firewall
sudo ufw enable
```

### Security Headers

The application includes security headers via Helmet middleware. Verify:

```bash
curl -I https://your-domain.com
```

### Database Security

Create MongoDB user with limited privileges:

```javascript
use satyameva-jayate
db.createUser({
  user: "app_user",
  pwd: "secure_password",
  roles: [
    { role: "readWrite", db: "satyameva-jayate" }
  ]
});
```

## Backup Strategy

### Database Backup

Create backup script `scripts/backup-db.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR

mongodump --uri="mongodb://username:password@localhost:27017/satyameva-jayate" --out="$BACKUP_DIR/backup_$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "backup_$DATE"

# Remove uncompressed backup
rm -rf "$BACKUP_DIR/backup_$DATE"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
```

Add to crontab:

```bash
0 2 * * * /path/to/scripts/backup-db.sh
```

### File Backup

Sync uploads to cloud storage:

```bash
#!/bin/bash
aws s3 sync uploads/ s3://your-backup-bucket/uploads/ --delete
```

## Performance Optimization

### Node.js Optimization

Set Node.js environment variables:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
export UV_THREADPOOL_SIZE=128
```

### MongoDB Optimization

Edit `/etc/mongod.conf`:

```yaml
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo

operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp
```

### Caching

Enable Redis caching (optional):

```bash
npm install redis
```

Add to environment:

```env
REDIS_URL=redis://localhost:6379
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   sudo lsof -i :8080
   sudo kill -9 <PID>
   ```

2. **MongoDB Connection Failed**
   ```bash
   sudo systemctl status mongod
   sudo tail -f /var/log/mongodb/mongod.log
   ```

3. **File Permission Errors**
   ```bash
   sudo chown -R $USER:$USER uploads/
   chmod -R 755 uploads/
   ```

4. **Memory Issues**
   ```bash
   # Increase swap space
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Log Analysis

```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

## Scaling

### Horizontal Scaling

Use PM2 cluster mode:

```javascript
module.exports = {
  apps: [{
    name: 'satyameva-jayate-ai',
    script: './app.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster'
  }]
};
```

### Load Balancing

Configure multiple instances behind load balancer:

```nginx
upstream app_servers {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}

server {
    listen 80;
    location / {
        proxy_pass http://app_servers;
    }
}
```

## Maintenance

### Updates

```bash
git pull origin main
npm install
npm run build
pm2 restart satyameva-jayate-ai
```

### Database Maintenance

```javascript
// Connect to MongoDB
mongo satyameva-jayate

// Create indexes
db.cases.createIndex({ "caseId": 1 }, { unique: true })
db.users.createIndex({ "email": 1 }, { unique: true })
db.evidence.createIndex({ "caseId": 1, "uploadedAt": -1 })

// Compact database
db.runCommand({ compact: "cases" })
```

## Support

For deployment support:
- Documentation: https://docs.satyameva-jayate.ai
- Issues: https://github.com/your-org/satyameva-jayate-ai/issues
- Support: support@satyameva-jayate.ai

## Security Considerations

1. **Regular Updates**: Keep Node.js and MongoDB updated
2. **Security Patches**: Apply security patches promptly
3. **Access Control**: Implement proper firewall rules
4. **Monitoring**: Monitor for suspicious activities
5. **Backups**: Regular backup and restore testing
6. **SSL**: Always use HTTPS in production
7. **Environment Variables**: Never commit secrets to version control
