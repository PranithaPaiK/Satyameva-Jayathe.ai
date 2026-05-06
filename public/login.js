// Global variables
let currentUser = null;
let authToken = null;
let socket = null;
let currentRole = '';

// Login Modal Management
function showLoginModal(role) {
    console.log('Opening login modal for role:', role);
    currentRole = role;
    
    // Wait for DOM to be fully loaded
    setTimeout(() => {
        const modal = document.getElementById('loginModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('loginForm');
        const biometricOption = document.getElementById('biometricScanner');
        
        if (!modal || !title || !form || !biometricOption) {
            console.error('Login modal elements not found');
            // Try to create modal dynamically if elements don't exist
            createLoginModal();
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
        
        // Show debug info
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            debugInfo.textContent = `Login modal opened for ${role}`;
            debugInfo.classList.remove('hidden');
            setTimeout(() => {
                debugInfo.classList.add('hidden');
            }, 3000);
        }
    }, 100); // Small delay to ensure DOM is ready
}

// Create login modal dynamically if it doesn't exist
function createLoginModal() {
    console.log('Creating login modal dynamically');
    
    const existingModal = document.getElementById('loginModal');
    if (existingModal) {
        console.log('Login modal already exists');
        return;
    }
    
    // Create modal structure
    const modal = document.createElement('div');
    modal.id = 'loginModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50';
    
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div class="flex justify-between items-center p-6 border-b">
                <h3 id="modalTitle" class="text-2xl font-bold text-gray-800">Login</h3>
                <button onclick="hideLoginModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>

            <!-- Login Form -->
            <form id="loginForm" onsubmit="handleLogin(event)">
                <div class="space-y-4">
                    <!-- Username/Email -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <div class="relative">
                            <input type="email" id="email" required
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                   placeholder="Enter your email address">
                            <i class="fas fa-envelope absolute right-3 top-3.5 text-gray-400"></i>
                        </div>
                    </div>

                    <!-- Password -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <div class="relative">
                            <input type="password" id="password" required
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                   placeholder="Enter your password">
                            <i class="fas fa-lock absolute right-3 top-3.5 text-gray-400"></i>
                        </div>
                    </div>

                    <!-- Biometric Option -->
                    <div class="flex items-center justify-between">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="useBiometric" class="mr-2">
                            <span class="text-sm text-gray-700">Use Biometric Authentication</span>
                        </label>
                        <button type="button" onclick="startBiometric()" 
                                class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition">
                            <i class="fas fa-fingerprint mr-2"></i>Scan Biometric
                        </button>
                    </div>

                    <!-- Login Button -->
                    <button type="submit" 
                            class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition">
                        <i class="fas fa-sign-in-alt mr-2"></i>Secure Login
                    </button>

                    <!-- Forgot Password -->
                    <div class="text-center mt-4">
                        <a href="#" onclick="showForgotPassword()" class="text-purple-600 hover:text-purple-500 text-sm">
                            Forgot your password?
                        </a>
                    </div>
                </div>
            </form>

            <!-- Biometric Scanner -->
            <div id="biometricScanner" class="hidden mt-6">
                <div class="biometric-scanner p-8 text-center">
                    <div class="voice-wave w-16 h-16 mx-auto mb-4"></div>
                    <p class="text-gray-600 mb-4">Place your finger on the scanner</p>
                    <div class="flex justify-center space-x-2">
                        <button onclick="cancelBiometric()" class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition">
                            <i class="fas fa-times mr-2"></i>Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.appendChild(modal);
    
    // Initialize event listeners
    initializeModalEvents();
}

// Initialize modal event listeners
function initializeModalEvents() {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideLoginModal();
        }
    });
}

// Export functions for use in other modules
window.showLoginModal = showLoginModal;
window.hideLoginModal = hideLoginModal;
window.startBiometric = startBiometric;
window.cancelBiometric = cancelBiometric;
window.handleLogin = handleLogin;
window.createLoginModal = createLoginModal;
window.initializeModalEvents = initializeModalEvents;

function hideLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
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
            
            // Show role-specific dashboard
            showDashboard(currentRole);
            
            // Initialize socket for real-time features
            initializeSocket();
            
            // Start time updates
            updateTime();
            setInterval(updateTime, 1000);
            
        } else {
            alert(`Login failed: ${data.message || 'Invalid credentials'}`);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Forgot Password
function showForgotPassword() {
    const email = prompt('Enter your email address for password reset:');
    if (email) {
        alert(`Password reset link sent to: ${email}`);
    }
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
    
    // Disconnect socket
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

// Check for existing session on page load
window.addEventListener('DOMContentLoaded', () => {
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
        
        showDashboard(currentUser.role);
        initializeSocket();
        updateTime();
        setInterval(updateTime, 1000);
    }
});

// Export functions for use in main app
window.showLoginModal = showLoginModal;
window.hideLoginModal = hideLoginModal;
window.startBiometric = startBiometric;
window.cancelBiometric = cancelBiometric;
window.handleLogin = handleLogin;
window.logout = logout;
