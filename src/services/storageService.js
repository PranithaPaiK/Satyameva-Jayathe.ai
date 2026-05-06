const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const AWS = require('aws-sdk');
const config = require('../config/config');
const { logger } = require('../utils/logger');

/**
 * Storage Service
 * Handles file uploads to cloud storage with integrity verification
 */
class StorageService {
  constructor() {
    this.initializeCloudinary();
    this.initializeS3();
  }

  /**
   * Initialize Cloudinary
   */
  initializeCloudinary() {
    if (config.cloudinary.cloudName) {
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret
      });
    }
  }

  /**
   * Initialize AWS S3
   */
  initializeS3() {
    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      this.s3 = new AWS.S3({
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
        region: config.aws.region
      });
    }
  }

  /**
   * Generate SHA-256 hash for file integrity
   */
  generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Upload file to Cloudinary
   */
  async uploadToCloudinary(buffer, options = {}) {
    try {
      const {
        resource_type = 'auto',
        folder = 'general',
        public_id = null,
        transformation = null
      } = options;

      const uploadOptions = {
        resource_type,
        folder,
        overwrite: true,
        invalidate: true
      };

      if (public_id) {
        uploadOptions.public_id = public_id;
      }

      if (transformation) {
        uploadOptions.transformation = transformation;
      }

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      logger.info(`File uploaded to Cloudinary: ${result.public_id}`);
      return result;
    } catch (error) {
      logger.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Upload file to S3
   */
  async uploadToS3(buffer, key, options = {}) {
    try {
      if (!this.s3) {
        throw new Error('S3 not configured');
      }

      const {
        bucket = config.aws.s3Bucket,
        contentType = 'application/octet-stream',
        metadata = {}
      } = options;

      const params = {
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          uploadTime: new Date().toISOString(),
          hash: this.generateFileHash(buffer)
        }
      };

      const result = await this.s3.upload(params).promise();
      
      logger.info(`File uploaded to S3: ${key}`);
      return result;
    } catch (error) {
      logger.error('Error uploading to S3:', error);
      throw error;
    }
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFromCloudinary(publicId, resource_type = 'auto') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type });
      logger.info(`File deleted from Cloudinary: ${publicId}`);
      return result;
    } catch (error) {
      logger.error('Error deleting from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFromS3(key, bucket = config.aws.s3Bucket) {
    try {
      if (!this.s3) {
        throw new Error('S3 not configured');
      }

      const params = {
        Bucket: bucket,
        Key: key
      };

      await this.s3.deleteObject(params).promise();
      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error('Error deleting from S3:', error);
      throw error;
    }
  }

  /**
   * Get file from S3
   */
  async getFileFromS3(key, bucket = config.aws.s3Bucket) {
    try {
      if (!this.s3) {
        throw new Error('S3 not configured');
      }

      const params = {
        Bucket: bucket,
        Key: key
      };

      const result = await this.s3.getObject(params).promise();
      return result.Body;
    } catch (error) {
      logger.error('Error getting file from S3:', error);
      throw error;
    }
  }

  /**
   * Verify file integrity
   */
  async verifyFileIntegrity(fileUrl, expectedHash) {
    try {
      // Download file
      const https = require('https');
      const buffer = await this.downloadFile(fileUrl);
      
      // Calculate hash
      const actualHash = this.generateFileHash(buffer);
      
      return {
        isValid: actualHash === expectedHash,
        expectedHash,
        actualHash
      };
    } catch (error) {
      logger.error('Error verifying file integrity:', error);
      throw error;
    }
  }

  /**
   * Download file from URL
   */
  async downloadFile(url) {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const chunks = [];
      
      https.get(url, (response) => {
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Get file info from Cloudinary
   */
  async getCloudinaryFileInfo(publicId, resource_type = 'auto') {
    try {
      const result = await cloudinary.api.resource(publicId, { resource_type });
      return result;
    } catch (error) {
      logger.error('Error getting Cloudinary file info:', error);
      throw error;
    }
  }

  /**
   * Get file info from S3
   */
  async getS3FileInfo(key, bucket = config.aws.s3Bucket) {
    try {
      if (!this.s3) {
        throw new Error('S3 not configured');
      }

      const params = {
        Bucket: bucket,
        Key: key
      };

      const result = await this.s3.headObject(params).promise();
      return result;
    } catch (error) {
      logger.error('Error getting S3 file info:', error);
      throw error;
    }
  }

  /**
   * Create signed URL for S3 file
   */
  async getS3SignedUrl(key, expiresIn = 3600, bucket = config.aws.s3Bucket) {
    try {
      if (!this.s3) {
        throw new Error('S3 not configured');
      }

      const params = {
        Bucket: bucket,
        Key: key,
        Expires: expiresIn
      };

      const url = this.s3.getSignedUrl('getObject', params);
      return url;
    } catch (error) {
      logger.error('Error creating S3 signed URL:', error);
      throw error;
    }
  }

  /**
   * Backup file to both Cloudinary and S3
   */
  async backupFile(buffer, filename, options = {}) {
    try {
      const results = {
        cloudinary: null,
        s3: null
      };

      // Upload to Cloudinary
      if (config.cloudinary.cloudName) {
        try {
          results.cloudinary = await this.uploadToCloudinary(buffer, {
            folder: options.cloudinaryFolder || 'backups',
            public_id: filename,
            resource_type: options.resourceType || 'auto'
          });
        } catch (error) {
          logger.warn('Cloudinary backup failed:', error.message);
        }
      }

      // Upload to S3
      if (this.s3) {
        try {
          const key = `backups/${filename}`;
          results.s3 = await this.uploadToS3(buffer, key, {
            bucket: options.s3Bucket,
            contentType: options.contentType,
            metadata: options.metadata
          });
        } catch (error) {
          logger.warn('S3 backup failed:', error.message);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error backing up file:', error);
      throw error;
    }
  }

  /**
   * Process image with transformations
   */
  async processImage(buffer, transformations = {}) {
    try {
      const {
        width,
        height,
        crop = 'fill',
        quality = 'auto',
        format = 'auto'
      } = transformations;

      const transformationString = [];
      if (width) transformationString.push(`w_${width}`);
      if (height) transformationString.push(`h_${height}`);
      transformationString.push(`c_${crop}`);
      transformationString.push(`q_${quality}`);
      transformationString.push(`f_${format}`);

      return await this.uploadToCloudinary(buffer, {
        transformation: transformationString.join(','),
        resource_type: 'image'
      });
    } catch (error) {
      logger.error('Error processing image:', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    try {
      const stats = {
        cloudinary: null,
        s3: null
      };

      // Cloudinary stats
      if (config.cloudinary.cloudName) {
        try {
          const cloudinaryStats = await cloudinary.api.usage();
          stats.cloudinary = {
            resources: cloudinaryStats.resources,
            bandwidth: cloudinaryStats.bandwidth,
            storage: cloudinaryStats.storage
          };
        } catch (error) {
          logger.warn('Could not fetch Cloudinary stats:', error.message);
        }
      }

      // S3 stats (simplified)
      if (this.s3) {
        try {
          const listParams = {
            Bucket: config.aws.s3Bucket,
            Prefix: ''
          };

          const objects = await this.s3.listObjectsV2(listParams).promise();
          stats.s3 = {
            totalObjects: objects.Contents.length,
            totalSize: objects.Contents.reduce((sum, obj) => sum + obj.Size, 0)
          };
        } catch (error) {
          logger.warn('Could not fetch S3 stats:', error.message);
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting storage stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const storageService = new StorageService();

module.exports = {
  uploadToCloudinary: storageService.uploadToCloudinary.bind(storageService),
  uploadToS3: storageService.uploadToS3.bind(storageService),
  deleteFromCloudinary: storageService.deleteFromCloudinary.bind(storageService),
  deleteFromS3: storageService.deleteFromS3.bind(storageService),
  getFileFromS3: storageService.getFileFromS3.bind(storageService),
  verifyFileIntegrity: storageService.verifyFileIntegrity.bind(storageService),
  generateFileHash: storageService.generateFileHash.bind(storageService),
  getCloudinaryFileInfo: storageService.getCloudinaryFileInfo.bind(storageService),
  getS3FileInfo: storageService.getS3FileInfo.bind(storageService),
  getS3SignedUrl: storageService.getS3SignedUrl.bind(storageService),
  backupFile: storageService.backupFile.bind(storageService),
  processImage: storageService.processImage.bind(storageService),
  getStorageStats: storageService.getStorageStats.bind(storageService)
};
