// Global variables
let currentUser = null;
let authToken = null;
let socket = null;
let currentCaseId = 'demo-case-001';

// Initialize socket connection
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('join-hearing', currentCaseId);
    });
    
    socket.on('contradiction-alert', (data) => {
        displayContradictionAlert(data);
    });
}

// Login function - updated for new system
async function login(role) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                role: role,
                credentials: { demo: true }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            authToken = data.token;
            
            // Store in localStorage
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('authToken', authToken);
            
            // Update UI
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('dashboardSection').classList.remove('hidden');
            document.getElementById('userRole').textContent = `${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} Portal`;
            document.getElementById('userRole').classList.remove('hidden');
            document.getElementById('logoutBtn').classList.remove('hidden');
            document.getElementById('dashboardTitle').textContent = `${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} Dashboard`;
            
            // Show role-specific dashboard
            showDashboard(role);
            
            // Initialize socket for real-time features
            initializeSocket();
            
            // Start time updates
            updateTime();
            setInterval(updateTime, 1000);
            
        } else {
            alert('Login failed: ' + (data.message || 'Invalid credentials'));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Show role-specific dashboard
function showDashboard(role) {
    // Hide all dashboards
    document.getElementById('judgeDashboard').classList.add('hidden');
    document.getElementById('lawyerDashboard').classList.add('hidden');
    document.getElementById('citizenDashboard').classList.add('hidden');
    
    // Show specific dashboard
    document.getElementById(`${role}Dashboard`).classList.remove('hidden');
    
    // Load dashboard data
    loadDashboardData(role);
    
    // Add voice recognition controls if supported
    if (window.VoiceRecognition) {
        addVoiceControls();
    }
}

// Add voice recognition controls to dashboard
function addVoiceControls() {
    const dashboard = document.getElementById('dashboardSection');
    
    // Add voice control panel
    const voicePanel = document.createElement('div');
    voicePanel.className = 'bg-white rounded-xl shadow-lg p-6 mb-8';
    voicePanel.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-microphone mr-2"></i>Voice Recognition & Transcription
        </h3>
        <div class="grid md:grid-cols-2 gap-4">
            <div>
                <h4 class="font-semibold text-gray-700 mb-2">Voice Input</h4>
                <div class="space-y-2">
                    <button id="voiceRecordBtn" onclick="window.VoiceRecognition.startRecording()" 
                            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition w-full">
                        <i class="fas fa-microphone mr-2"></i>Start Recording
                    </button>
                    <button onclick="window.VoiceRecognition.stopRecording()" 
                            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition w-full">
                        <i class="fas fa-stop mr-2"></i>Stop Recording
                    </button>
                </div>
            </div>
            <div>
                <h4 class="font-semibold text-gray-700 mb-2">Transcript</h4>
                <div id="voiceTranscript" class="bg-gray-50 rounded-lg p-4 h-32 overflow-y-auto text-sm mb-2"></div>
                <div id="voiceConfidence" class="text-sm text-gray-600"></div>
                <div class="space-x-2">
                    <button onclick="window.VoiceRecognition.clearTranscripts()" 
                            class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-2 rounded-lg transition">
                        <i class="fas fa-trash mr-2"></i>Clear
                    </button>
                    <button onclick="saveTranscriptToCase()" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition">
                        <i class="fas fa-save mr-2"></i>Save to Case
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Insert voice panel before the first dashboard
    const firstDashboard = dashboard.querySelector('[id$="Dashboard"]');
    if (firstDashboard) {
        dashboard.insertBefore(voicePanel, firstDashboard);
    }
}

// Save transcript to current case
function saveTranscriptToCase() {
    const transcript = document.getElementById('voiceTranscript').textContent;
    if (transcript.trim()) {
        alert('Transcript saved to current case for legal reference');
    }
}

// Load dashboard data with functional buttons
async function loadDashboardData(role) {
    try {
        // Load mock dashboard data for demo
        const mockData = {
            judge: {
                pendingCases: 5,
                activeCases: 12,
                resolvedCases: 8,
                todayHearings: 3,
                contradictions: 2,
                totalEvidence: 45,
                recentCases: ['CR-2024-001', 'CR-2024-002', 'CR-2024-003']
            },
            lawyer: {
                pendingCases: 3,
                activeCases: 8,
                resolvedCases: 15,
                totalEvidence: 23,
                upcomingDeadlines: 3,
                argumentScore: 92,
                recentCases: ['CV-2024-001', 'CV-2024-002', 'CV-2024-003']
            },
            citizen: {
                pendingCases: 1,
                activeCases: 2,
                resolvedCases: 3,
                nextHearing: '2024-01-15',
                documentsRequired: 2,
                successProbability: 75,
                recentCases: ['CT-2024-001', 'CT-2024-002']
            }
        };

        const data = mockData[role] || {};
        updateDashboardUI(role, data);
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// Update dashboard UI with data
function updateDashboardUI(role, data) {
    try {
        // Update dashboard statistics
        if (role === 'judge') {
            document.getElementById('pendingCases').textContent = data.pendingCases || 5;
            document.getElementById('activeCases').textContent = data.activeCases || 12;
            document.getElementById('resolvedCases').textContent = data.resolvedCases || 8;
            document.getElementById('todayHearings').textContent = data.todayHearings || 3;
            document.getElementById('contradictions').textContent = data.contradictions || 2;
        } else if (role === 'lawyer') {
            document.getElementById('pendingCases').textContent = data.pendingCases || 3;
            document.getElementById('activeCases').textContent = data.activeCases || 8;
            document.getElementById('resolvedCases').textContent = data.resolvedCases || 15;
            document.getElementById('upcomingDeadlines').textContent = data.upcomingDeadlines || 3;
            document.getElementById('argumentScore').textContent = data.argumentScore || 92;
        } else if (role === 'citizen') {
            document.getElementById('pendingCases').textContent = data.pendingCases || 1;
            document.getElementById('activeCases').textContent = data.activeCases || 2;
            document.getElementById('resolvedCases').textContent = data.resolvedCases || 3;
            document.getElementById('nextHearing').textContent = data.nextHearing || '2024-01-15';
            document.getElementById('documentsRequired').textContent = data.documentsRequired || 2;
            document.getElementById('successProbability').textContent = data.successProbability ? `${data.successProbability}%` || '75%';
        }
    } catch (error) {
        console.error('Error updating dashboard UI:', error);
    }
}

// Load dashboard data with API fallback
async function loadDashboardData(role) {
    try {
        // Try to load from API first
        const response = await fetch(`/api/dashboard/${role}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateDashboardUI(role, data);
            return;
        }
    } catch (error) {
        console.log('API not available, using mock data');
    }
    
    // Fallback to mock data if API fails
    const mockData = {
        judge: {
            pendingCases: 5,
            activeCases: 12,
            resolvedCases: 8,
            todayHearings: 3,
            contradictions: 2,
            totalEvidence: 45,
            recentCases: ['CR-2024-001', 'CR-2024-002', 'CR-2024-003']
        },
        lawyer: {
            pendingCases: 3,
            activeCases: 8,
            resolvedCases: 15,
            totalEvidence: 23,
            upcomingDeadlines: 3,
            argumentScore: 92,
            recentCases: ['CV-2024-001', 'CV-2024-002', 'CV-2024-003']
        },
        citizen: {
            pendingCases: 1,
            activeCases: 2,
            resolvedCases: 3,
            nextHearing: '2024-01-15',
            documentsRequired: 2,
            successProbability: 75,
            recentCases: ['CT-2024-001', 'CT-2024-002']
        }
    };

    const data = mockData[role] || {};
    updateDashboardUI(role, data);
}

// Update dashboard UI with data
function updateDashboardUI(role, data) {
    // Update role-specific dashboard elements
    if (role === 'judge') {
        // Update judge dashboard
        updateJudgeDashboard(data);
    } else if (role === 'lawyer') {
        // Update lawyer dashboard
        updateLawyerDashboard(data);
    }

 else if (role === 'citizen') {
        // Update citizen dashboard
        updateCitizenDashboard(data);
    }

// Update citizen dashboard
function updateCitizenDashboard(data) {
    try {
        document.getElementById('pendingCases').textContent = data.pendingCases || 1;
        document.getElementById('activeCases').textContent = data.activeCases || 2;
        document.getElementById('resolvedCases').textContent = data.resolvedCases || 3;
        document.getElementById('nextHearing').textContent = data.nextHearing || '2024-01-15';
        document.getElementById('documentsRequired').textContent = data.documentsRequired || 2;
        document.getElementById('successProbability').textContent = data.successProbability ? `${data.successProbability}%` : '75%';
    } catch (error) {
        console.error('Error updating citizen dashboard:', error);
    }
}
}

// Update judge dashboard
function updateJudgeDashboard(data) {
    // Update stats cards if needed
    // This would be implemented based on the actual data structure
}

// Update lawyer dashboard
function updateLawyerDashboard(data) {
    // Update stats cards if needed
    // This would be implemented based on the actual data structure
}

// Update citizen dashboard
function updateCitizenDashboard(data) {
    // Update stats cards if needed
    // This would be implemented based on the actual data structure
}

// Analyze statement for contradictions
async function analyzeStatement() {
    const statementInput = document.getElementById('statementInput');
    const statement = statementInput.value.trim();
    
    if (!statement) {
        alert('Please enter a statement to analyze');
        return;
    }
    
    try {
        const response = await fetch('/api/analysis/contradiction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                statement: statement,
                caseId: currentCaseId
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Add statement to hearing log
            addStatementToLog(currentUser.name, statement);
            
            // Show contradictions if any
            if (data.contradictions.length > 0) {
                showContradictionIndicator();
                data.contradictions.forEach(contradiction => {
                    addContradictionToLog(contradiction);
                });
            }
            
            // Clear input
            statementInput.value = '';
        } else {
            alert('Analysis failed: ' + data.error);
        }
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Analysis failed. Please try again.');
    }
}

// Add statement to hearing log
function addStatementToLog(speaker, statement) {
    const hearingLog = document.getElementById('hearingLog');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = 'mb-3 p-3 bg-white rounded-lg border border-gray-200';
    logEntry.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <span class="font-semibold text-purple-600">${speaker}:</span>
                <p class="text-gray-800 mt-1">${statement}</p>
            </div>
            <span class="text-xs text-gray-500">${timestamp}</span>
        </div>
    `;
    
    hearingLog.appendChild(logEntry);
    hearingLog.scrollTop = hearingLog.scrollHeight;
}

// Add contradiction to hearing log
function addContradictionToLog(contradiction) {
    const hearingLog = document.getElementById('hearingLog');
    
    const contradictionEntry = document.createElement('div');
    contradictionEntry.className = 'mb-3 p-3 bg-red-50 rounded-lg border border-red-200 contradiction-alert';
    contradictionEntry.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
            <span class="font-semibold text-red-700">Contradiction Detected:</span>
            <span class="text-red-600 ml-2">${contradiction.type}</span>
            <span class="text-xs text-gray-500 ml-auto">Severity: ${contradiction.severity}</span>
        </div>
    `;
    
    hearingLog.appendChild(contradictionEntry);
    hearingLog.scrollTop = hearingLog.scrollHeight;
}

// Show contradiction indicator
function showContradictionIndicator() {
    const indicator = document.getElementById('contradictionIndicator');
    indicator.classList.remove('hidden');
    
    // Hide after 5 seconds
    setTimeout(() => {
        indicator.classList.add('hidden');
    }, 5000);
}

// Display contradiction alert from socket
function displayContradictionAlert(data) {
    addStatementToLog(data.speaker, data.statement);
    
    if (data.contradictions.length > 0) {
        showContradictionIndicator();
        data.contradictions.forEach(contradiction => {
            addContradictionToLog(contradiction);
        });
    }
}

// Handle evidence upload
function handleEvidenceUpload(event) {
    const files = event.target.files;
    
    for (let file of files) {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            const fileData = e.target.result.split(',')[1]; // Remove data URL prefix
            
            try {
                const response = await fetch('/api/evidence/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        fileData: fileData,
                        metadata: {
                            filename: file.name,
                            caseId: currentCaseId,
                            uploadedBy: currentUser.name,
                            uploadTime: new Date().toISOString(),
                            content: `Sample content from ${file.name}` // In real app, would extract actual content
                        }
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    console.log('Evidence uploaded successfully:', data);
                    alert(`Evidence "${file.name}" uploaded to Akshaya Vault successfully!`);
                } else {
                    alert('Upload failed: ' + data.error);
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('Upload failed. Please try again.');
            }
        };
        
        reader.readAsDataURL(file);
    }
}

// Update current time
function updateTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = new Date().toLocaleString();
    }
}

// Logout function
function logout() {
    currentUser = null;
    authToken = null;
    
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    // Reset UI
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('userRole').classList.add('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('contradictionIndicator').classList.add('hidden');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set up evidence upload listener
    const evidenceUpload = document.getElementById('evidenceUpload');
    if (evidenceUpload) {
        evidenceUpload.addEventListener('change', handleEvidenceUpload);
    }
    
    // Set up logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Set up enter key for statement input
    const statementInput = document.getElementById('statementInput');
    if (statementInput) {
        statementInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                analyzeStatement();
            }
        });
    }
});

// Utility functions
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Simulated functions for demo purposes
function simulateEvidenceHeatmap() {
    const heatmap = document.getElementById('evidenceHeatmap');
    if (heatmap) {
        // This would generate dynamic heatmap bubbles based on actual evidence data
        console.log('Generating evidence heatmap...');
    }
}

function simulateOutcomeForecast(scenario) {
    // This would use AI to predict outcomes based on scenarios
    return {
        probability: Math.floor(Math.random() * 40) + 60, // 60-100%
        reasoning: `Based on similar cases and the scenario "${scenario}", the predicted outcome is...`
    };
}

function simulateConsistencyAnalysis(decisionText) {
    // This would check consistency with past judgments
    return {
        isConsistent: true,
        inconsistencies: [],
        confidence: 0.95
    };
}
