const Joi = require('joi');
const { logger } = require('../utils/logger');

/**
 * Validation Middleware
 * Handles request validation using Joi schemas
 */

/**
 * Generic validation middleware factory
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      logger.warn('Validation error:', validationErrors);

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: validationErrors
      });
    }

    // Replace request property with validated and sanitized data
    req[property] = value;
    next();
  };
};

// User validation schemas
const userRegistrationSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[\d\s-()]+$/)
    .min(10)
    .max(20)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.empty': 'Phone number is required',
      'string.min': 'Phone number must be at least 10 digits',
      'string.max': 'Phone number cannot exceed 20 characters'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  
  role: Joi.string()
    .valid('judge', 'lawyer', 'citizen')
    .required()
    .messages({
      'any.only': 'Role must be one of: judge, lawyer, citizen',
      'string.empty': 'Role is required'
    }),
  
  barCode: Joi.string()
    .pattern(/^[A-Z0-9]{6,12}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Bar code must be 6-12 alphanumeric characters'
    }),
  
  specialization: Joi.array()
    .items(Joi.string().trim())
    .optional(),
  
  experience: Joi.number()
    .min(0)
    .max(50)
    .optional()
    .messages({
      'number.min': 'Experience cannot be negative',
      'number.max': 'Experience cannot exceed 50 years'
    })
});

const userLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    }),
  
  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .optional()
    .messages({
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'OTP must contain only digits'
    })
});

const userUpdateSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional(),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional(),
  
  phone: Joi.string()
    .pattern(/^[+]?[\d\s-()]+$/)
    .min(10)
    .max(20)
    .optional(),
  
  specialization: Joi.array()
    .items(Joi.string().trim())
    .optional(),
  
  experience: Joi.number()
    .min(0)
    .max(50)
    .optional(),
  
  address: Joi.object({
    street: Joi.string().trim().optional(),
    city: Joi.string().trim().optional(),
    state: Joi.string().trim().optional(),
    pinCode: Joi.string().trim().optional(),
    country: Joi.string().trim().optional()
  }).optional()
});

// Case validation schemas
const caseCreationSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Case title is required',
      'string.min': 'Case title must be at least 5 characters',
      'string.max': 'Case title cannot exceed 200 characters'
    }),
  
  description: Joi.string()
    .trim()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Case description is required',
      'string.min': 'Case description must be at least 10 characters',
      'string.max': 'Case description cannot exceed 2000 characters'
    }),
  
  caseType: Joi.string()
    .valid('civil', 'criminal', 'family', 'corporate', 'property', 'tax', 'labour', 'constitutional', 'other')
    .required()
    .messages({
      'any.only': 'Invalid case type',
      'string.empty': 'Case type is required'
    }),
  
  category: Joi.string()
    .valid('dispute', 'complaint', 'appeal', 'petition', 'suit', 'application', 'other')
    .required()
    .messages({
      'any.only': 'Invalid case category',
      'string.empty': 'Case category is required'
    }),
  
  subcategory: Joi.string()
    .trim()
    .optional(),
  
  plaintiff: Joi.object({
    name: Joi.string().trim().required(),
    type: Joi.string().valid('individual', 'organization').required(),
    contact: Joi.object({
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
      address: Joi.string().trim().optional()
    }).optional(),
    lawyerId: Joi.string().optional()
  }).required(),
  
  defendant: Joi.object({
    name: Joi.string().trim().required(),
    type: Joi.string().valid('individual', 'organization').required(),
    contact: Joi.object({
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
      address: Joi.string().trim().optional()
    }).optional(),
    lawyerId: Joi.string().optional()
  }).required(),
  
  assignedJudge: Joi.string()
    .required()
    .messages({
      'string.empty': 'Assigned judge is required'
    }),
  
  courtRoom: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Court room is required'
    }),
  
  jurisdiction: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Jurisdiction is required'
    }),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium'),
  
  caseValue: Joi.number()
    .min(0)
    .optional(),
  
  tags: Joi.array()
    .items(Joi.string().trim())
    .optional()
});

// Evidence validation schemas
const evidenceUploadSchema = Joi.object({
  caseId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Case ID is required'
    }),
  
  title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Evidence title is required',
      'string.min': 'Evidence title must be at least 3 characters',
      'string.max': 'Evidence title cannot exceed 200 characters'
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .optional(),
  
  evidenceType: Joi.string()
    .valid('document', 'image', 'video', 'audio', 'digital', 'physical', 'other')
    .required()
    .messages({
      'any.only': 'Invalid evidence type',
      'string.empty': 'Evidence type is required'
    }),
  
  tags: Joi.string()
    .optional()
    .messages({
      'string.base': 'Tags must be a comma-separated string'
    })
});

// Voice recording validation schemas
const voiceRecordingSchema = Joi.object({
  caseId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Case ID is required'
    }),
  
  title: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Recording title is required',
      'string.min': 'Recording title must be at least 3 characters',
      'string.max': 'Recording title cannot exceed 200 characters'
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .optional(),
  
  speakerRole: Joi.string()
    .valid('judge', 'lawyer', 'plaintiff', 'defendant', 'witness', 'other')
    .required()
    .messages({
      'any.only': 'Invalid speaker role',
      'string.empty': 'Speaker role is required'
    }),
  
  speakerId: Joi.string()
    .optional(),
  
  language: Joi.string()
    .valid('en-US', 'en-GB', 'hi-IN', 'bn-IN', 'ta-IN', 'te-IN', 'mr-IN')
    .default('en-US')
});

// Law library validation schemas
const lawSearchSchema = Joi.object({
  q: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Search query must be at least 2 characters',
      'string.max': 'Search query cannot exceed 100 characters'
    }),
  
  category: Joi.string()
    .valid('criminal', 'civil', 'family', 'property', 'tax', 'labour', 'constitutional', 'corporate', 'other')
    .optional(),
  
  act: Joi.string()
    .trim()
    .optional(),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(20),
  
  sortBy: Joi.string()
    .valid('relevance', 'recent', 'alphabetical')
    .default('relevance')
});

// Pagination validation schema
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
});

// Password reset validation schema
const passwordResetSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    })
});

const newPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'string.empty': 'Password confirmation is required'
    })
});

// Export validation functions
module.exports = {
  validate,
  
  // User validations
  validateUserRegistration: validate(userRegistrationSchema),
  validateUserLogin: validate(userLoginSchema),
  validateUserUpdate: validate(userUpdateSchema),
  
  // Case validations
  validateCase: validate(caseCreationSchema),
  
  // Evidence validations
  validateEvidence: validate(evidenceUploadSchema),
  
  // Voice recording validations
  validateVoiceRecording: validate(voiceRecordingSchema),
  
  // Law library validations
  validateLawSearch: validate(lawSearchSchema),
  
  // Pagination validations
  validatePagination: validate(paginationSchema),
  
  // Password validations
  validatePasswordReset: validate(passwordResetSchema),
  validateNewPassword: validate(newPasswordSchema),
  
  // Schemas for use in other modules
  schemas: {
    userRegistrationSchema,
    userLoginSchema,
    userUpdateSchema,
    caseCreationSchema,
    evidenceUploadSchema,
    voiceRecordingSchema,
    lawSearchSchema,
    paginationSchema,
    passwordResetSchema,
    newPasswordSchema
  }
};
