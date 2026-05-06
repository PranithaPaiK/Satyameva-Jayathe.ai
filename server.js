const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Database setup (in-memory for demo)
const db = {
  users: [],
  cases: [],
  evidence: [],
  hearings: [],
  judgments: []
};

// Evidence Vault
class AkshayaEvidenceVault {
  constructor() {
    this.vault = new Map();
  }

  async storeEvidence(fileData, metadata) {
    const hash = crypto.createHash('sha256').update(fileData).digest('hex');
    const timestamp = new Date().toISOString();
    
    const evidence = {
      id: crypto.randomUUID(),
      hash,
      timestamp,
      metadata,
      fileData,
      verified: true
    };
    
    this.vault.set(hash, evidence);
    return { id: evidence.id, hash, timestamp };
  }

  async verifyEvidence(hash) {
    return this.vault.has(hash);
  }

  async getEvidence(hash) {
    return this.vault.get(hash);
  }
}

const evidenceVault = new AkshayaEvidenceVault();

// Contradiction Radar
class ContradictionRadar {
  constructor() {
    this.statements = [];
  }

  async analyzeStatement(statement, caseId) {
    const contradictions = [];
    
    // Check against evidence in vault
    for (let [hash, evidence] of evidenceVault.vault) {
      if (evidence.metadata.caseId === caseId) {
        // Simple contradiction detection (would be enhanced with NLP)
        if (this.detectContradiction(statement, evidence.metadata.content)) {
          contradictions.push({
            evidenceId: evidence.id,
            type: 'evidence_contradiction',
            severity: 'high'
          });
        }
      }
    }
    
    return contradictions;
  }

  detectContradiction(statement, evidence) {
    // Simplified contradiction detection
    const statementLower = statement.toLowerCase();
    const evidenceLower = evidence.toLowerCase();
    
    // Look for negation patterns
    const negations = ['not', 'never', 'no', 'didn\'t', 'don\'t', 'can\'t'];
    return negations.some(neg => 
      statementLower.includes(neg) && evidenceLower.includes(statementLower.replace(neg, '').trim())
    );
  }
}

const contradictionRadar = new ContradictionRadar();

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Simplified token verification (would use JWT in production)
  const user = db.users.find(u => u.token === token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Authentication routes
app.post('/api/auth/login', (req, res) => {
  const { role, credentials } = req.body;
  
  // Demo users
  const demoUsers = {
    judge: { id: 'judge-1', name: 'Honorable Judge', role: 'judge' },
    lawyer: { id: 'lawyer-1', name: 'Senior Advocate', role: 'lawyer' },
    citizen: { id: 'citizen-1', name: 'John Citizen', role: 'citizen' }
  };
  
  const user = demoUsers[role];
  if (user) {
    user.token = crypto.randomBytes(32).toString('hex');
    db.users.push(user);
    res.json({ user, token: user.token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Evidence upload
app.post('/api/evidence/upload', authenticateToken, async (req, res) => {
  try {
    const { fileData, metadata } = req.body;
    const result = await evidenceVault.storeEvidence(Buffer.from(fileData, 'base64'), metadata);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contradiction analysis
app.post('/api/analysis/contradiction', authenticateToken, async (req, res) => {
  try {
    const { statement, caseId } = req.body;
    const contradictions = await contradictionRadar.analyzeStatement(statement, caseId);
    res.json({ contradictions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard data
app.get('/api/dashboard/:role', authenticateToken, (req, res) => {
  const { role } = req.params;
  const dashboardData = {
    judge: {
      totalCases: 45,
      pendingCases: 12,
      hearingsToday: 3,
      contradictionsDetected: 2
    },
    lawyer: {
      activeCases: 8,
      evidenceStrength: 85,
      upcomingDeadlines: 3,
      argumentScore: 92
    },
    citizen: {
      caseStatus: 'Under Review',
      nextHearing: '2024-01-15',
      documentsRequired: 2,
      outcomeProbability: 75
    }
  };
  
  res.json(dashboardData[role] || {});
});

// Socket.IO for real-time features
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-hearing', (caseId) => {
    socket.join(`hearing-${caseId}`);
  });
  
  socket.on('statement', async (data) => {
    const { statement, caseId, speaker } = data;
    
    // Analyze for contradictions
    const contradictions = await contradictionRadar.analyzeStatement(statement, caseId);
    
    // Broadcast to all in hearing room
    io.to(`hearing-${caseId}`).emit('contradiction-alert', {
      speaker,
      statement,
      contradictions,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Satyameva Jayate.ai server running on port ${PORT}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
});
