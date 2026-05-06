# Satyameva Jayate.ai - API Documentation

## Overview

This document provides comprehensive API documentation for the Satyameva Jayate.ai legal platform. The API is RESTful and uses JSON for data exchange.

## Base URL

```
Development: http://localhost:8080/api
Production: https://your-domain.com/api
```

## Authentication

All API endpoints (except authentication endpoints) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "code": "SUCCESS"
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [ ... ] // For validation errors
}
```

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "role": "lawyer",
  "barCode": "LAW123456",
  "specialization": ["criminal", "civil"],
  "experience": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "authToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### POST /auth/login
Authenticate user and return tokens.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "otp": "123456" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "authToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": "7d"
  }
}
```

### POST /auth/refresh
Refresh authentication tokens.

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

### POST /auth/logout
Logout user and invalidate tokens.

**Headers:** `Authorization: Bearer <token>`

### POST /auth/forgot-password
Initiate password reset.

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

### POST /auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

### GET /auth/me
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

## Case Management Endpoints

### GET /cases/dashboard/stats
Get dashboard statistics for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "pendingCases": 5,
    "activeCases": 12,
    "resolvedCases": 8,
    "todayHearings": 3,
    "overdueCases": 2
  }
}
```

### GET /cases
Get cases for authenticated user.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status (pending, active, resolved, closed)
- `search` (string): Search query

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "cases": [ ... ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 47
    }
  }
}
```

### GET /cases/:caseId
Get case details.

**Headers:** `Authorization: Bearer <token>`

### POST /cases
Create new case.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Contract Dispute Case",
  "description": "Detailed case description...",
  "caseType": "civil",
  "category": "dispute",
  "plaintiff": {
    "name": "John Doe",
    "type": "individual",
    "contact": {
      "email": "john@example.com",
      "phone": "+1234567890"
    }
  },
  "defendant": {
    "name": "ABC Corporation",
    "type": "organization",
    "contact": {
      "email": "legal@abc.com",
      "phone": "+0987654321"
    }
  },
  "assignedJudge": "judge-id",
  "courtRoom": "Court Room 101",
  "jurisdiction": "Delhi High Court",
  "priority": "medium"
}
```

### PUT /cases/:caseId/status
Update case status.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "active",
  "reason": "Case admitted for hearing"
}
```

### GET /cases/schedule/hearings
Get hearing schedule.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `startDate` (date): Start date filter
- `endDate` (date): End date filter

## Evidence Management Endpoints

### POST /evidence/upload
Upload evidence file.

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body (FormData):**
- `file`: File to upload
- `caseId`: Case ID
- `title`: Evidence title
- `description`: Evidence description
- `evidenceType`: Type of evidence (document, image, video, audio)
- `tags`: Comma-separated tags

### GET /evidence/:evidenceId
Get evidence details.

**Headers:** `Authorization: Bearer <token>`

### GET /evidence/case/:caseId
Get all evidence for a case.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `evidenceType` (string): Filter by type
- `status` (string): Filter by status

### PUT /evidence/:evidenceId
Update evidence metadata.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Updated Evidence Title",
  "description": "Updated description",
  "tags": ["tag1", "tag2"]
}
```

### DELETE /evidence/:evidenceId
Delete evidence (soft delete).

**Headers:** `Authorization: Bearer <token>`

### POST /evidence/:evidenceId/verify
Verify evidence integrity.

**Headers:** `Authorization: Bearer <token>`

**Required Roles:** judge, admin

### GET /evidence/:evidenceId/download
Download evidence file.

**Headers:** `Authorization: Bearer <token>`

### GET /evidence/case/:caseId/stats
Get evidence statistics for a case.

**Headers:** `Authorization: Bearer <token>`

## Voice Recording Endpoints

### POST /voice/upload
Upload voice recording.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body (FormData):**
- `audio`: Audio file
- `caseId`: Case ID
- `title`: Recording title
- `speakerRole`: Speaker role (plaintiff, defendant, witness, judge, lawyer)
- `language`: Language code (en-US, hi-IN, etc.)

### GET /voice/:recordingId
Get voice recording details.

**Headers:** `Authorization: Bearer <token>`

### GET /voice/case/:caseId
Get voice recordings for a case.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `speakerRole` (string): Filter by speaker role

### PUT /voice/:recordingId
Update voice recording metadata.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Updated Recording Title",
  "description": "Updated description",
  "tags": ["tag1", "tag2"]
}
```

### DELETE /voice/:recordingId
Delete voice recording.

**Headers:** `Authorization: Bearer <token>`

### GET /voice/:recordingId/transcription
Get voice recording transcription.

**Headers:** `Authorization: Bearer <token>`

### GET /voice/:recordingId/analysis
Get voice recording analysis.

**Headers:** `Authorization: Bearer <token>`

### GET /voice/:recordingId/download
Download voice recording file.

**Headers:** `Authorization: Bearer <token>`

### GET /voice/statistics
Get voice recording statistics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `caseId` (string): Filter by case ID

## Law Library Endpoints

### GET /law-library/search
Search laws and legal provisions.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `q` (string): Search query (required, min 2 chars)
- `category` (string): Filter by category
- `act` (string): Filter by act name
- `page` (number): Page number
- `limit` (number): Items per page
- `sortBy` (string): Sort by (relevance, recent, alphabetical)

**Response:**
```json
{
  "success": true,
  "data": {
    "laws": [
      {
        "_id": "law-id",
        "title": "Section 420 - Cheating",
        "content": "Full legal text...",
        "sectionNumber": "420",
        "actName": "Indian Penal Code",
        "category": "criminal",
        "highlights": [ ... ],
        "score": 0.95
      }
    ],
    "pagination": { ... }
  }
}
```

### GET /law-library/:lawId
Get specific law details.

**Headers:** `Authorization: Bearer <token>`

### GET /law-library/:lawId/related
Get related laws.

**Headers:** `Authorization: Bearer <token>`

### GET /law-library/categories/list
Get all law categories.

**Headers:** `Authorization: Bearer <token>`

### GET /law-library/categories/:category
Get laws by category.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `act` (string): Filter by act

### GET /law-library/categories/:category/acts
Get acts in a category.

**Headers:** `Authorization: Bearer <token>`

### GET /law-library/acts/:actName/sections
Get sections of an act.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

### GET /law-library/popular/list
Get popular/recently viewed laws.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (number): Number of results
- `period` (string): Time period (week, month)

### POST /law-library/:lawId/view
Update view count for analytics.

**Headers:** `Authorization: Bearer <token>`

## User Management Endpoints (Admin Only)

### GET /users
Get all users.

**Headers:** `Authorization: Bearer <token>`

**Required Roles:** admin

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `role` (string): Filter by role
- `search` (string): Search query

### GET /users/:userId
Get user details.

**Headers:** `Authorization: Bearer <token>`

### PUT /users/:userId
Update user details.

**Headers:** `Authorization: Bearer <token>`

### DELETE /users/:userId
Delete user.

**Headers:** `Authorization: Bearer <token>`

**Required Roles:** admin

## System Endpoints (Admin Only)

### GET /health
Get system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "2.0.0",
  "database": { ... },
  "memory": { ... },
  "cpu": { ... }
}
```

### GET /system/stats
Get system statistics.

**Headers:** `Authorization: Bearer <token>`

**Required Roles:** admin

## Error Codes

| Code | Description |
|------|-------------|
| SUCCESS | Operation successful |
| VALIDATION_ERROR | Request validation failed |
| AUTH_REQUIRED | Authentication required |
| INVALID_TOKEN | Invalid or expired token |
| INSUFFICIENT_PERMISSIONS | User lacks required permissions |
| RESOURCE_NOT_FOUND | Requested resource not found |
| ACCESS_DENIED | Access to resource denied |
| RATE_LIMIT_EXCEEDED | Too many requests |
| FILE_TOO_LARGE | File size exceeds limit |
| INVALID_FILE_TYPE | Unsupported file type |
| DUPLICATE_RESOURCE | Resource already exists |
| SERVER_ERROR | Internal server error |

## Rate Limiting

- Authentication endpoints: 5 requests per 15 minutes
- General API endpoints: 100 requests per 15 minutes
- File upload endpoints: 10 requests per hour

## File Upload Limits

- Maximum file size: 50MB
- Supported formats:
  - Images: JPEG, PNG, GIF, WebP
  - Videos: MP4, AVI, MOV, WMV
  - Documents: PDF, DOC, DOCX
  - Audio: MP3, WAV, OGG, M4A

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Login
const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

const { authToken } = loginResponse.data.data;

// Get cases
const casesResponse = await axios.get('http://localhost:8080/api/cases', {
  headers: {
    'Authorization': `Bearer ${authToken}`
  }
});

console.log(casesResponse.data.data.cases);
```

### Python

```python
import requests

# Login
login_response = requests.post('http://localhost:8080/api/auth/login', json={
    'email': 'user@example.com',
    'password': 'password123'
})

auth_token = login_response.json()['data']['authToken']

# Get cases
cases_response = requests.get('http://localhost:8080/api/cases', headers={
    'Authorization': f'Bearer {auth_token}'
})

print(cases_response.json()['data']['cases'])
```

## WebSocket Events

### Connection

```javascript
const socket = io('http://localhost:8080', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

- `join-hearing`: Join hearing room for a case
- `statement`: Submit live statement for analysis
- `voice-status`: Update voice recording status
- `case-update`: Receive case notifications

## Testing

Use the provided test suite to verify API functionality:

```bash
npm test
```

## Support

For API support and questions:
- Documentation: https://docs.satyameva-jayate.ai
- Support: api-support@satyameva-jayate.ai
- Status Page: https://status.satyameva-jayate.ai
