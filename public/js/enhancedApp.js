/**
 * Enhanced Satyameva Jayate.ai Frontend Application
 * Handles all advanced features including voice recording, authentication, and real-time updates
 */

// Global variables
let currentUser = null;
let authToken = null;
let socket = null;
let voiceRecorder = null;
let recordingTimer = null;
let recordingStartTime = null;

// API configuration
const API_BASE_URL = '/api';

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        // Check for existing session
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('currentUser');
        
        if (token && user) {
            authToken = token;
            currentUser = JSON.parse(user);
            updateUIForAuthenticatedUser();
        }
        
        // Initialize socket connection
        initializeSocket();
        
        // Initialize voice recorder
        if (VoiceRecorder.isSupported()) {
            voiceRecorder = new VoiceRecorder({
                onStart: onRecordingStart,
                onStop: onRecordingStop,
                onPause: onRecordingPause,
                onResume: onRecordingResume,
                onDataAvailable: onRecordingDataAvailable,
                onError: onRecordingError,
                onTranscription: onTranscriptionReceived
            });
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Show dashboard by default
        showSection('dashboard');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Application initialization failed');
    }
}

/**
 * Initialize socket connection
 */
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        showSuccess('Connected to server');
    });
    
    socket.on('contradiction-alert', (data) => {
        handleContradictionAlert(data);
    });
    
    socket.on('voice-update', (data) => {
        handleVoiceUpdate(data);
    });
    
    socket.on('case-notification', (data) => {
        handleCaseNotification(data);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Voice recording controls
    const startBtn = document.getElementById('startRecording');
    const stopBtn = document.getElementById('stopRecording');
    const pauseBtn = document.getElementById('pauseRecording');
    
    if (startBtn) startBtn.addEventListener('click', startVoiceRecording);
    if (stopBtn) stopBtn.addEventListener('click', stopVoiceRecording);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseVoiceRecording);
    
    // Form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
}

/**
 * Navigation functions
 */
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('section');
    sections.forEach(section => section.classList.add('hidden'));
    
    // Show selected section
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    // Update sidebar
    updateSidebar(sectionName);
    
    // Load section-specific data
    loadSectionData(sectionName);
}

function updateSidebar(activeSection) {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.classList.remove('active');
        if (item.textContent.toLowerCase().includes(activeSection)) {
            item.classList.add('active');
        }
    });
}

function navigateToSection(sectionName) {
    showSection(sectionName);
}

/**
 * Voice Recording Functions
 */
async function startVoiceRecording() {
    try {
        if (!voiceRecorder) {
            throw new Error('Voice recording not supported');
        }
        
        const caseId = document.getElementById('caseSelect').value;
        const speakerRole = document.getElementById('speakerSelect').value;
        
        if (!caseId) {
            showError('Please select a case');
            return;
        }
        
        await voiceRecorder.start();
        
        // Update UI
        document.getElementById('startRecording').disabled = true;
        document.getElementById('stopRecording').disabled = false;
        document.getElementById('pauseRecording').disabled = false;
        document.getElementById('recordingStatus').textContent = 'Recording...';
        document.getElementById('voiceWave').style.display = 'flex';
        document.getElementById('transcriptionIndicator').style.display = 'block';
        
        // Start timer
        recordingStartTime = Date.now();
        updateRecordingTimer();
        
    } catch (error) {
        console.error('Failed to start recording:', error);
        showError('Failed to start recording: ' + error.message);
    }
}

function stopVoiceRecording() {
    try {
        if (!voiceRecorder || !voiceRecorder.isRecording) {
            return;
        }
        
        voiceRecorder.stop();
        
        // Clear timer
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        
        // Update UI
        document.getElementById('startRecording').disabled = false;
        document.getElementById('stopRecording').disabled = true;
        document.getElementById('pauseRecording').disabled = true;
        document.getElementById('recordingStatus').textContent = 'Processing...';
        document.getElementById('voiceWave').style.display = 'none';
        document.getElementById('transcriptionIndicator').style.display = 'none';
        
    } catch (error) {
        console.error('Failed to stop recording:', error);
        showError('Failed to stop recording: ' + error.message);
    }
}

function pauseVoiceRecording() {
    try {
        if (!voiceRecorder || !voiceRecorder.isRecording) {
            return;
        }
        
        if (voiceRecorder.isPaused) {
            voiceRecorder.resume();
            document.getElementById('pauseRecording').innerHTML = '<i class="fas fa-pause mr-2"></i>Pause';
            document.getElementById('recordingStatus').textContent = 'Recording...';
        } else {
            voiceRecorder.pause();
            document.getElementById('pauseRecording').innerHTML = '<i class="fas fa-play mr-2"></i>Resume';
            document.getElementById('recordingStatus').textContent = 'Paused';
        }
        
    } catch (error) {
        console.error('Failed to pause/resume recording:', error);
        showError('Failed to pause/resume recording: ' + error.message);
    }
}

function updateRecordingTimer() {
    if (!recordingStartTime) return;
    
    recordingTimer = setInterval(() => {
        const elapsed = Date.now() - recordingStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('recordingTime').textContent = timeString;
    }, 1000);
}

/**
 * Voice Recording Event Handlers
 */
function onRecordingStart() {
    console.log('Recording started');
    showSuccess('Recording started');
}

function onRecordingStop(audioBlob) {
    console.log('Recording stopped', audioBlob);
    
    // Upload recording
    uploadVoiceRecording(audioBlob);
}

function onRecordingPause() {
    console.log('Recording paused');
}

function onRecordingResume() {
    console.log('Recording resumed');
}

function onRecordingDataAvailable(data) {
    // Handle recording data chunks if needed
    console.log('Recording data available:', data.size);
}

function onRecordingError(error) {
    console.error('Recording error:', error);
    showError('Recording error: ' + error.error);
}

function onTranscriptionReceived(transcription) {
    const transcriptionArea = document.getElementById('transcriptionArea');
    
    if (transcription.final) {
        // Add final transcription
        const finalText = document.createElement('p');
        finalText.className = 'text-gray-800 mb-2';
        finalText.textContent = transcription.final;
        transcriptionArea.appendChild(finalText);
        
        // Scroll to bottom
        transcriptionArea.scrollTop = transcriptionArea.scrollHeight;
    }
    
    // Update interim text
    let interimElement = document.getElementById('interimTranscription');
    if (!interimElement) {
        interimElement = document.createElement('p');
        interimElement.id = 'interimTranscription';
        interimElement.className = 'text-gray-500 italic';
        transcriptionArea.appendChild(interimElement);
    }
    
    if (transcription.interim) {
        interimElement.textContent = transcription.interim;
    } else {
        interimElement.textContent = '';
    }
}

/**
 * Upload voice recording to server
 */
async function uploadVoiceRecording(audioBlob) {
    try {
        const caseId = document.getElementById('caseSelect').value;
        const speakerRole = document.getElementById('speakerSelect').value;
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('caseId', caseId);
        formData.append('title', `Recording_${Date.now()}`);
        formData.append('speakerRole', speakerRole);
        
        const response = await fetch(`${API_BASE_URL}/voice/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const result = await response.json();
        console.log('Upload successful:', result);
        
        showSuccess('Voice recording uploaded successfully');
        document.getElementById('recordingStatus').textContent = 'Uploaded';
        
        // Reload recordings list
        loadRecordings();
        
    } catch (error) {
        console.error('Upload failed:', error);
        showError('Failed to upload recording: ' + error.message);
        document.getElementById('recordingStatus').textContent = 'Upload failed';
    }
}

/**
 * Clear transcription area
 */
function clearTranscription() {
    const transcriptionArea = document.getElementById('transcriptionArea');
    transcriptionArea.innerHTML = '<p class="text-gray-500 text-center">Transcription will appear here...</p>';
}

/**
 * Load section-specific data
 */
async function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'voice':
            loadRecordings();
            break;
        case 'cases':
            loadCases();
            break;
        case 'evidence':
            loadEvidence();
            break;
        // Add more cases as needed
    }
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        // Simulate API call
        const dashboardData = {
            totalCases: 47,
            todayHearings: 3,
            evidenceFiles: 234,
            voiceRecordings: 89,
            recentActivity: [
                { type: 'case-admitted', text: 'Case #2024/00123 - Admitted', time: '2 hours ago' },
                { type: 'evidence-uploaded', text: 'New evidence uploaded in Case #2024/00120', time: '4 hours ago' },
                { type: 'voice-transcribed', text: 'Voice recording transcribed for Hearing #45', time: '6 hours ago' },
                { type: 'judgment-submitted', text: 'Judgment submitted for Case #2024/00115', time: '1 day ago' }
            ]
        };
        
        // Update UI with dashboard data
        updateDashboardUI(dashboardData);
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

/**
 * Load recordings list
 */
async function loadRecordings() {
    try {
        const response = await fetch(`${API_BASE_URL}/voice/statistics`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Recordings loaded:', data);
            // Update recordings table
        }
        
    } catch (error) {
        console.error('Failed to load recordings:', error);
    }
}

/**
 * Handle socket events
 */
function handleContradictionAlert(data) {
    console.log('Contradiction alert:', data);
    showWarning(`Contradiction detected: ${data.contradictions[0]?.description || 'Unknown contradiction'}`);
}

function handleVoiceUpdate(data) {
    console.log('Voice update:', data);
    // Update voice recording status in UI
}

function handleCaseNotification(data) {
    console.log('Case notification:', data);
    showSuccess(`Case update: ${data.update.message}`);
}

/**
 * Authentication functions
 */
function logout() {
    try {
        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        
        // Reset global variables
        currentUser = null;
        authToken = null;
        
        // Disconnect socket
        if (socket) {
            socket.disconnect();
        }
        
        // Redirect to login page or show login section
        window.location.href = '/standalone.html';
        
    } catch (error) {
        console.error('Logout error:', error);
    }
}

/**
 * Update UI for authenticated user
 */
function updateUIForAuthenticatedUser() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.fullName || currentUser.name;
        document.getElementById('userRole').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    }
}

/**
 * Utility functions
 */
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showWarning(message) {
    showNotification(message, 'warning');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 fade-in ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                type === 'warning' ? 'fa-exclamation-triangle' :
                'fa-info-circle'
            } mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function handleFormSubmit(event) {
    event.preventDefault();
    // Handle form submission based on form ID or class
    console.log('Form submitted:', event.target);
}

/**
 * API helper functions
 */
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Export functions for global access
window.startVoiceRecording = startVoiceRecording;
window.stopVoiceRecording = stopVoiceRecording;
window.pauseVoiceRecording = pauseVoiceRecording;
window.clearTranscription = clearTranscription;
window.showSection = showSection;
window.navigateToSection = navigateToSection;
