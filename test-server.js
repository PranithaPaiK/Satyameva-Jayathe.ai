const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route - serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date() });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Authentication routes - complete login system
app.post('/api/auth/login', (req, res) => {
  const { email, password, role, useBiometric, credentials } = req.body;
  
  // Validate required fields
  if (!email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, and role are required',
      code: 'MISSING_FIELDS'
    });
  }
  
  // Mock authentication for demo purposes
  const mockUser = {
    id: `user-${Date.now()}`,
    email: email,
    firstName: role === 'judge' ? 'Justice' : role === 'lawyer' ? 'Advocate' : 'Citizen',
    lastName: role === 'judge' ? 'Chandra' : role === 'lawyer' ? 'Sharma' : 'Kumar',
    role: role,
    status: 'active',
    biometricEnabled: useBiometric || false,
    lastLogin: new Date().toISOString(),
    permissions: role === 'judge' ? ['hear_cases', 'make_judgments', 'view_evidence'] : 
                role === 'lawyer' ? ['manage_cases', 'upload_evidence', 'view_laws'] : 
                ['view_cases', 'upload_documents', 'track_progress']
  };
  
  const mockToken = `mock-jwt-token-${Date.now()}-${role}`;
  
  res.json({
    success: true,
    message: 'Login successful',
    user: mockUser,
    token: mockToken,
    authToken: mockToken
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Forgot password endpoint
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }
  
  // Mock password reset
  res.json({
    success: true,
    message: 'Password reset link sent to your email'
  });
});

// Dashboard route - redirect to main dashboard
app.get('/dashboard', (req, res) => {
  res.redirect('/dashboard.html');
});

// Serve static files
app.use(express.static('public'));

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`✅ Satyameva Jayate AI Legal Platform running on port ${PORT}`);
  console.log(`🌐 Access URL: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
});
