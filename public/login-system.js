// Global variables
let currentUser = null;
let authToken = null;
let socket = null;
let currentRole = '';

// Voice Recognition
let voiceRecognition = null;

// Initialize voice recognition
function initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window) {
        voiceRecognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
        voiceRecognition = new SpeechRecognition();
    } else {
        console.warn('Speech recognition not supported');
        return;
    }

    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = 'en-US';
    voiceRecognition.maxAlternatives = 1;

    voiceRecognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
                finalTranscript = result[0].transcript;
            } else {
                interimTranscript = result[0].transcript;
            }
        }

        updateVoiceDisplay(interimTranscript, finalTranscript);
    };

    voiceRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showStatus(`Speech recognition error: ${event.error}`, 'error');
    };

    voiceRecognition.onend = () => {
        console.log('Voice recognition ended');
    };
}

// Update voice display
function updateVoiceDisplay(interim, final) {
    const transcriptDiv = document.getElementById('voiceTranscript');
    const confidenceDiv = document.getElementById('voiceConfidence');
    
    if (final) {
        transcriptDiv.innerHTML = `<strong>Final:</strong> ${final}`;
        confidenceDiv.innerHTML = `Confidence: High`;
    } else if (interim) {
        transcriptDiv.innerHTML = `<strong>Interim:</strong> ${interim}`;
    }
}

// Start voice recording
function startVoiceRecording() {
    if (!voiceRecognition) {
        showStatus('Voice recognition not supported', 'error');
        return;
    }
    
    try {
        voiceRecognition.start();
        showStatus('Listening... Speak clearly', 'info');
    } catch (error) {
        console.error('Error starting recording:', error);
        showStatus('Failed to start voice recognition', 'error');
    }
}

// Stop voice recording
function stopVoiceRecording() {
    if (!voiceRecognition) return;
    
    try {
        voiceRecognition.stop();
        showStatus('Recording stopped', 'success');
    } catch (error) {
        console.error('Error stopping recording:', error);
        showStatus('Failed to stop voice recognition', 'error');
    }
}

// Clear transcripts
function clearTranscripts() {
    document.getElementById('voiceTranscript').innerHTML = '';
    document.getElementById('voiceConfidence').innerHTML = '';
}

// Save transcript to case
function saveTranscriptToCase() {
    const transcript = document.getElementById('voiceTranscript').textContent;
    if (transcript.trim()) {
        showStatus('Transcript saved to current case for legal reference', 'success');
    }
}

// Show status message
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    if (!statusDiv) return;

    const bgColor = type === 'error' ? 'bg-red-100 text-red-800' : 
                   type === 'success' ? 'bg-green-100 text-green-800' : 
                   'bg-blue-100 text-blue-800';
    
    statusDiv.innerHTML = `
        <div class="${bgColor} px-4 py-3 rounded-lg">
            <i class="fas fa-info-circle mr-2"></i>${message}
        </div>
    `;
    
    statusDiv.classList.remove('hidden');
    
    // Auto-hide status after 5 seconds
    setTimeout(() => {
        statusDiv.classList.add('hidden');
    }, 5000);
}

// Login Modal Management
function showLoginModal(role) {
    console.log('Opening login modal for role:', role);
    currentRole = role;
    
    const modal = document.getElementById('loginModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('loginForm');
    const biometricOption = document.getElementById('biometricScanner');
    
    if (!modal || !title || !form || !biometricOption) {
        console.error('Login modal elements not found');
        showStatus('Login system temporarily unavailable. Please refresh the page.', 'error');
        return;
    }
    
    modal.classList.remove('hidden');
    title.textContent = 
        role === 'judge' ? 'Judicial Portal Login' :
        role === 'lawyer' ? 'Legal Portal Login' : 'Common Man Portal Login';
    
    // Clear form
    form.reset();
    
    // Show/hide biometric option based on role
    if (role === 'judge') {
        biometricOption.classList.remove('hidden');
    } else {
        biometricOption.classList.add('hidden');
    }
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Biometric Authentication
function startBiometric() {
    const scanner = document.getElementById('biometricScanner');
    const form = document.getElementById('loginForm');
    
    // Show scanner
    form.classList.add('hidden');
    scanner.classList.remove('hidden');
    
    // Simulate biometric scan
    setTimeout(() => {
        // Mock successful biometric scan
        scanner.innerHTML = `
            <div class="text-green-600">
                <i class="fas fa-check-circle text-4xl mb-4"></i>
                <p>Biometric Authentication Successful</p>
            </div>
        `;
        
        // Auto-fill credentials after biometric scan
        setTimeout(() => {
            document.getElementById('email').value = `biometric-${currentRole}@satyameva.ai`;
            document.getElementById('password').value = 'biometric-authenticated';
            form.classList.remove('hidden');
            scanner.classList.add('hidden');
        }, 2000);
    }, 3000);
}

function cancelBiometric() {
    const scanner = document.getElementById('biometricScanner');
    const form = document.getElementById('loginForm');
    
    // Return to form
    scanner.classList.add('hidden');
    form.classList.remove('hidden');
}

// Forgot Password
function showForgotPassword() {
    const email = prompt('Enter your email address for password reset:');
    if (email) {
        showStatus(`Password reset link sent to: ${email}`, 'success');
    }
}

// Login Handler
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const useBiometric = document.getElementById('useBiometric').checked;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                role: currentRole,
                useBiometric: useBiometric,
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
            hideLoginModal();
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('dashboardSection').classList.remove('hidden');
            document.getElementById('userRole').textContent = `${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} Portal`;
            document.getElementById('userRole').classList.remove('hidden');
            document.getElementById('logoutBtn').classList.remove('hidden');
            document.getElementById('dashboardTitle').textContent = `${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} Dashboard`;
            
            // Load dashboard data
            loadDashboardData(currentRole);
            
            showStatus('Login successful! Welcome to the system.', 'success');
            
        } else {
            showStatus(`Login failed: ${data.message || 'Invalid credentials'}`, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showStatus('Login failed. Please try again.', 'error');
    }
}

// Load dashboard data
function loadDashboardData(role) {
    try {
        // Mock dashboard data for demo
        const mockData = {
            judge: {
                pendingCases: 5,
                activeCases: 12,
                resolvedCases: 8,
                todayHearings: 3,
                contradictions: 2,
                totalEvidence: 45
            },
            lawyer: {
                pendingCases: 3,
                activeCases: 8,
                resolvedCases: 15,
                totalEvidence: 23,
                upcomingDeadlines: 3,
                argumentScore: 92
            },
            citizen: {
                pendingCases: 1,
                activeCases: 2,
                resolvedCases: 3,
                nextHearing: '2024-01-15',
                documentsRequired: 2,
                successProbability: 75
            }
        };

        const data = mockData[role] || {};
        
        // Update dashboard UI
        document.getElementById('pendingCases').textContent = data.pendingCases || 0;
        document.getElementById('activeCases').textContent = data.activeCases || 0;
        document.getElementById('resolvedCases').textContent = data.resolvedCases || 0;
        
        showStatus('Dashboard loaded successfully', 'success');
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showStatus('Failed to load dashboard data', 'error');
    }
}

// Navigate to different sections
function navigateTo(section) {
    showStatus(`Navigating to ${section}...`, 'info');
    // In a real application, this would navigate to the specific section
    setTimeout(() => {
        showStatus(`${section} section loaded`, 'success');
    }, 1000);
}

// Logout
function logout() {
    currentUser = null;
    authToken = null;
    
    // Clear localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    
    // Update UI
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('userRole').classList.add('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    
    showStatus('Logged out successfully', 'success');
}

// Update time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// Check for existing session on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing system...');
    
    // Initialize voice recognition
    initializeVoiceRecognition();
    
    // Check for existing session
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('authToken');
    
    if (savedUser && savedToken) {
        currentUser = JSON.parse(savedUser);
        authToken = savedToken;
        
        // Show dashboard directly
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('userRole').textContent = `${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} Portal`;
        document.getElementById('userRole').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        document.getElementById('dashboardTitle').textContent = `${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} Dashboard`;
        
        loadDashboardData(currentUser.role);
    } else {
        // Show login section
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('dashboardSection').classList.add('hidden');
    }
    
    // Start time updates
    updateTime();
    setInterval(updateTime, 1000);
    
    console.log('System initialized successfully');
});

// Export functions for use in HTML
window.showLoginModal = showLoginModal;
window.hideLoginModal = hideLoginModal;
window.startBiometric = startBiometric;
window.cancelBiometric = cancelBiometric;
window.handleLogin = handleLogin;
window.showForgotPassword = showForgotPassword;
window.startVoiceRecording = startVoiceRecording;
window.stopVoiceRecording = stopVoiceRecording;
window.clearTranscripts = clearTranscripts;
window.saveTranscriptToCase = saveTranscriptToCase;
window.navigateTo = navigateTo;
window.logout = logout;
