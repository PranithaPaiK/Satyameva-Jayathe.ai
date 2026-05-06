/**
 * Dashboard JavaScript Module
 * Handles all dashboard functionality and API calls
 */
class Dashboard {
  constructor() {
    this.currentUser = null;
    this.dashboardData = {};
    this.charts = {};
    
    this.initializeElements();
    this.setupEventListeners();
    this.loadUserData();
  }

  initializeElements() {
    // Navigation elements
    this.navItems = document.querySelectorAll('.nav-item');
    this.contentSections = document.querySelectorAll('.content-section');
    
    // Dashboard stats elements
    this.statsContainer = document.getElementById('dashboardStats');
    this.pendingCasesBtn = document.getElementById('pendingCasesBtn');
    this.activeCasesBtn = document.getElementById('activeCasesBtn');
    this.resolvedCasesBtn = document.getElementById('resolvedCasesBtn');
    this.hearingScheduleBtn = document.getElementById('hearingScheduleBtn');
    this.evidenceBtn = document.getElementById('evidenceBtn');
    this.voiceRecordingsBtn = document.getElementById('voiceRecordingsBtn');
    this.lawLibraryBtn = document.getElementById('lawLibraryBtn');
    
    // Content containers
    this.casesContainer = document.getElementById('casesContainer');
    this.hearingScheduleContainer = document.getElementById('hearingScheduleContainer');
    this.evidenceContainer = document.getElementById('evidenceContainer');
    this.voiceRecordingsContainer = document.getElementById('voiceRecordingsContainer');
    this.lawLibraryContainer = document.getElementById('lawLibraryContainer');
    
    // Search and filter elements
    this.searchInput = document.getElementById('searchInput');
    this.filterSelect = document.getElementById('filterSelect');
    this.paginationContainer = document.getElementById('paginationContainer');
    
    // Loading states
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.errorMessage = document.getElementById('errorMessage');
  }

  setupEventListeners() {
    // Navigation
    this.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToSection(item.dataset.section);
      });
    });
    
    // Dashboard buttons
    this.pendingCasesBtn?.addEventListener('click', () => this.loadCases('pending'));
    this.activeCasesBtn?.addEventListener('click', () => this.loadCases('active'));
    this.resolvedCasesBtn?.addEventListener('click', () => this.loadCases('resolved'));
    this.hearingScheduleBtn?.addEventListener('click', () => this.loadHearingSchedule());
    this.evidenceBtn?.addEventListener('click', () => this.loadEvidence());
    this.voiceRecordingsBtn?.addEventListener('click', () => this.loadVoiceRecordings());
    this.lawLibraryBtn?.addEventListener('click', () => this.loadLawLibrary());
    
    // Search and filter
    this.searchInput?.addEventListener('input', this.debounce(() => {
      this.performSearch();
    }, 300));
    
    this.filterSelect?.addEventListener('change', () => {
      this.applyFilters();
    });
    
    // Auto-refresh
    setInterval(() => {
      this.refreshDashboardStats();
    }, 60000); // Refresh every minute
  }

  async loadUserData() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      
      // Get user data
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        this.currentUser = userData.data;
        this.updateUIForUserRole();
        await this.loadDashboardStats();
      } else {
        throw new Error('Failed to load user data');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.showError('Failed to load user data. Please login again.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    }
  }

  updateUIForUserRole() {
    if (!this.currentUser) return;
    
    const role = this.currentUser.role;
    
    // Show/hide role-specific elements
    document.querySelectorAll('[data-roles]').forEach(element => {
      const allowedRoles = element.dataset.roles.split(',');
      if (allowedRoles.includes(role)) {
        element.style.display = '';
      } else {
        element.style.display = 'none';
      }
    });
    
    // Update dashboard title
    const dashboardTitle = document.getElementById('dashboardTitle');
    if (dashboardTitle) {
      dashboardTitle.textContent = `${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard`;
    }
    
    // Update navigation
    this.updateNavigationForRole(role);
  }

  updateNavigationForRole(role) {
    const roleNavItems = {
      judge: ['dashboard', 'cases', 'hearings', 'evidence', 'voice', 'law-library'],
      lawyer: ['dashboard', 'cases', 'hearings', 'evidence', 'voice', 'law-library'],
      citizen: ['dashboard', 'my-cases', 'evidence', 'voice', 'law-library'],
      admin: ['dashboard', 'cases', 'users', 'system', 'evidence', 'voice', 'law-library']
    };
    
    this.navItems.forEach(item => {
      const section = item.dataset.section;
      if (roleNavItems[role]?.includes(section)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  async loadDashboardStats() {
    try {
      this.showLoading(true);
      
      const response = await fetch('/api/cases/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        this.dashboardData = result.data;
        this.renderDashboardStats();
      } else {
        throw new Error('Failed to load dashboard statistics');
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      this.showError('Failed to load dashboard statistics');
    } finally {
      this.showLoading(false);
    }
  }

  renderDashboardStats() {
    if (!this.statsContainer) return;
    
    const stats = this.dashboardData;
    const role = this.currentUser.role;
    
    let statsHTML = '<div class="stats-grid">';
    
    // Role-specific stats
    if (role === 'judge') {
      statsHTML += `
        <div class="stat-card">
          <h3>Pending Cases</h3>
          <div class="stat-number">${stats.pendingCases || 0}</div>
          <button onclick="dashboard.loadCases('pending')" class="stat-btn">View Cases</button>
        </div>
        <div class="stat-card">
          <h3>Active Cases</h3>
          <div class="stat-number">${stats.activeCases || 0}</div>
          <button onclick="dashboard.loadCases('active')" class="stat-btn">View Cases</button>
        </div>
        <div class="stat-card">
          <h3>Today's Hearings</h3>
          <div class="stat-number">${stats.todayHearings || 0}</div>
          <button onclick="dashboard.loadHearingSchedule()" class="stat-btn">View Schedule</button>
        </div>
        <div class="stat-card">
          <h3>Overdue Cases</h3>
          <div class="stat-number warning">${stats.overdueCases || 0}</div>
          <button onclick="dashboard.loadCases('overdue')" class="stat-btn">View Cases</button>
        </div>
      `;
    } else if (role === 'lawyer') {
      statsHTML += `
        <div class="stat-card">
          <h3>My Cases</h3>
          <div class="stat-number">${stats.totalCases || 0}</div>
          <button onclick="dashboard.loadCases('all')" class="stat-btn">View Cases</button>
        </div>
        <div class="stat-card">
          <h3>Pending Cases</h3>
          <div class="stat-number">${stats.pendingCases || 0}</div>
          <button onclick="dashboard.loadCases('pending')" class="stat-btn">View Cases</button>
        </div>
        <div class="stat-card">
          <h3>Upcoming Hearings</h3>
          <div class="stat-number">${stats.upcomingHearings || 0}</div>
          <button onclick="dashboard.loadHearingSchedule()" class="stat-btn">View Schedule</button>
        </div>
        <div class="stat-card">
          <h3>Resolved Cases</h3>
          <div class="stat-number success">${stats.resolvedCases || 0}</div>
          <button onclick="dashboard.loadCases('resolved')" class="stat-btn">View Cases</button>
        </div>
      `;
    } else if (role === 'citizen') {
      statsHTML += `
        <div class="stat-card">
          <h3>My Cases</h3>
          <div class="stat-number">${stats.totalCases || 0}</div>
          <button onclick="dashboard.loadCases('all')" class="stat-btn">View Cases</button>
        </div>
        <div class="stat-card">
          <h3>Pending Cases</h3>
          <div class="stat-number">${stats.pendingCases || 0}</div>
          <button onclick="dashboard.loadCases('pending')" class="stat-btn">View Cases</button>
        </div>
        <div class="stat-card">
          <h3>Active Cases</h3>
          <div class="stat-number">${stats.activeCases || 0}</div>
          <button onclick="dashboard.loadCases('active')" class="stat-btn">View Cases</button>
        </div>
        <div class="stat-card">
          <h3>Resolved Cases</h3>
          <div class="stat-number success">${stats.resolvedCases || 0}</div>
          <button onclick="dashboard.loadCases('resolved')" class="stat-btn">View Cases</button>
        </div>
      `;
    } else if (role === 'admin') {
      statsHTML += `
        <div class="stat-card">
          <h3>Total Cases</h3>
          <div class="stat-number">${stats.totalCases || 0}</div>
          <button onclick="dashboard.loadCases('all')" class="stat-btn">View Cases</button>
        </div>
        <div class="stat-card">
          <h3>Total Users</h3>
          <div class="stat-number">${stats.totalUsers || 0}</div>
          <button onclick="dashboard.loadUsers()" class="stat-btn">Manage Users</button>
        </div>
        <div class="stat-card">
          <h3>Active Judges</h3>
          <div class="stat-number">${stats.judges || 0}</div>
          <button onclick="dashboard.loadUsers('judges')" class="stat-btn">View Judges</button>
        </div>
        <div class="stat-card">
          <h3>Active Lawyers</h3>
          <div class="stat-number">${stats.lawyers || 0}</div>
          <button onclick="dashboard.loadUsers('lawyers')" class="stat-btn">View Lawyers</button>
        </div>
      `;
    }
    
    statsHTML += '</div>';
    this.statsContainer.innerHTML = statsHTML;
    
    // Initialize charts if needed
    this.initializeCharts();
  }

  async loadCases(status = 'all', page = 1) {
    try {
      this.showLoading(true);
      
      let url = `/api/cases?page=${page}&limit=10`;
      if (status !== 'all') {
        url += `&status=${status}`;
      }
      
      const searchQuery = this.searchInput?.value;
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        this.renderCases(result.data);
      } else {
        throw new Error('Failed to load cases');
      }
    } catch (error) {
      console.error('Error loading cases:', error);
      this.showError('Failed to load cases');
    } finally {
      this.showLoading(false);
    }
  }

  renderCases(data) {
    if (!this.casesContainer) return;
    
    const { cases, pagination } = data;
    
    let html = '<div class="cases-list">';
    
    if (cases.length === 0) {
      html += '<p class="no-data">No cases found.</p>';
    } else {
      cases.forEach(case_ => {
        html += `
          <div class="case-card" data-case-id="${case_.caseId}">
            <div class="case-header">
              <h3>${case_.title}</h3>
              <span class="case-status ${case_.status}">${case_.status}</span>
            </div>
            <div class="case-details">
              <p><strong>Case ID:</strong> ${case_.caseId}</p>
              <p><strong>Type:</strong> ${case_.caseType}</p>
              <p><strong>Filing Date:</strong> ${new Date(case_.filingDate).toLocaleDateString()}</p>
              ${case_.nextHearing ? `<p><strong>Next Hearing:</strong> ${new Date(case_.nextHearing.date).toLocaleDateString()}</p>` : ''}
            </div>
            <div class="case-actions">
              <button onclick="dashboard.viewCaseDetails('${case_.caseId}')" class="btn-primary">View Details</button>
              ${this.canManageCase(case_) ? `<button onclick="dashboard.editCase('${case_.caseId}')" class="btn-secondary">Edit</button>` : ''}
            </div>
          </div>
        `;
      });
    }
    
    html += '</div>';
    
    // Add pagination
    if (pagination && pagination.pages > 1) {
      html += this.renderPagination(pagination);
    }
    
    this.casesContainer.innerHTML = html;
  }

  async loadHearingSchedule() {
    try {
      this.showLoading(true);
      
      const response = await fetch('/api/cases/schedule/hearings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        this.renderHearingSchedule(result.data);
      } else {
        throw new Error('Failed to load hearing schedule');
      }
    } catch (error) {
      console.error('Error loading hearing schedule:', error);
      this.showError('Failed to load hearing schedule');
    } finally {
      this.showLoading(false);
    }
  }

  renderHearingSchedule(hearings) {
    if (!this.hearingScheduleContainer) return;
    
    let html = '<div class="hearing-schedule">';
    
    if (hearings.length === 0) {
      html += '<p class="no-data">No upcoming hearings scheduled.</p>';
    } else {
      // Group hearings by date
      const groupedByDate = {};
      hearings.forEach(hearing => {
        const date = new Date(hearing.nextHearing.date).toDateString();
        if (!groupedByDate[date]) {
          groupedByDate[date] = [];
        }
        groupedByDate[date].push(hearing);
      });
      
      Object.keys(groupedByDate).forEach(date => {
        html += `<div class="hearing-day">
          <h3>${date}</h3>
          <div class="hearing-list">`;
        
        groupedByDate[date].forEach(hearing => {
          const hearingTime = new Date(hearing.nextHearing.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          html += `
            <div class="hearing-item">
              <div class="hearing-time">${hearingTime}</div>
              <div class="hearing-details">
                <h4>${hearing.title}</h4>
                <p><strong>Case ID:</strong> ${hearing.caseId}</p>
                <p><strong>Court Room:</strong> ${hearing.courtRoom}</p>
                <button onclick="dashboard.viewCaseDetails('${hearing.caseId}')" class="btn-small">View Case</button>
              </div>
            </div>
          `;
        });
        
        html += '</div></div>';
      });
    }
    
    html += '</div>';
    this.hearingScheduleContainer.innerHTML = html;
  }

  async loadEvidence() {
    try {
      this.showLoading(true);
      
      // This would load evidence for cases the user has access to
      const response = await fetch('/api/evidence/case/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        this.renderEvidence(result.data);
      } else {
        throw new Error('Failed to load evidence');
      }
    } catch (error) {
      console.error('Error loading evidence:', error);
      this.showError('Failed to load evidence');
    } finally {
      this.showLoading(false);
    }
  }

  renderEvidence(evidence) {
    if (!this.evidenceContainer) return;
    
    let html = '<div class="evidence-grid">';
    
    if (evidence.length === 0) {
      html += '<p class="no-data">No evidence found.</p>';
    } else {
      evidence.forEach(item => {
        html += `
          <div class="evidence-card">
            <div class="evidence-icon">
              ${this.getEvidenceIcon(item.evidenceType)}
            </div>
            <div class="evidence-info">
              <h4>${item.title}</h4>
              <p><strong>Type:</strong> ${item.evidenceType}</p>
              <p><strong>Size:</strong> ${this.formatFileSize(item.fileSize)}</p>
              <p><strong>Uploaded:</strong> ${new Date(item.uploadedAt).toLocaleDateString()}</p>
            </div>
            <div class="evidence-actions">
              <button onclick="dashboard.viewEvidence('${item.evidenceId}')" class="btn-small">View</button>
              <button onclick="dashboard.downloadEvidence('${item.evidenceId}')" class="btn-small">Download</button>
            </div>
          </div>
        `;
      });
    }
    
    html += '</div>';
    this.evidenceContainer.innerHTML = html;
  }

  async loadVoiceRecordings() {
    try {
      this.showLoading(true);
      
      const response = await fetch('/api/voice/recordings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        this.renderVoiceRecordings(result.data);
      } else {
        throw new Error('Failed to load voice recordings');
      }
    } catch (error) {
      console.error('Error loading voice recordings:', error);
      this.showError('Failed to load voice recordings');
    } finally {
      this.showLoading(false);
    }
  }

  renderVoiceRecordings(recordings) {
    if (!this.voiceRecordingsContainer) return;
    
    let html = '<div class="voice-recordings-list">';
    
    if (recordings.length === 0) {
      html += '<p class="no-data">No voice recordings found.</p>';
    } else {
      recordings.forEach(recording => {
        html += `
          <div class="recording-card">
            <div class="recording-info">
              <h4>${recording.title}</h4>
              <p><strong>Speaker:</strong> ${recording.speakerRole}</p>
              <p><strong>Duration:</strong> ${this.formatDuration(recording.duration)}</p>
              <p><strong>Date:</strong> ${new Date(recording.recordedAt).toLocaleDateString()}</p>
              ${recording.transcription ? `<p><strong>Transcription:</strong> ${recording.transcription.substring(0, 100)}...</p>` : ''}
            </div>
            <div class="recording-actions">
              <button onclick="dashboard.playRecording('${recording.recordingId}')" class="btn-small">Play</button>
              <button onclick="dashboard.viewTranscription('${recording.recordingId}')" class="btn-small">Transcript</button>
              <button onclick="dashboard.downloadRecording('${recording.recordingId}')" class="btn-small">Download</button>
            </div>
          </div>
        `;
      });
    }
    
    html += '</div>';
    this.voiceRecordingsContainer.innerHTML = html;
  }

  async loadLawLibrary() {
    try {
      this.showLoading(true);
      
      const response = await fetch('/api/law-library/categories/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        this.renderLawLibrary(result.data);
      } else {
        throw new Error('Failed to load law library');
      }
    } catch (error) {
      console.error('Error loading law library:', error);
      this.showError('Failed to load law library');
    } finally {
      this.showLoading(false);
    }
  }

  renderLawLibrary(categories) {
    if (!this.lawLibraryContainer) return;
    
    let html = '<div class="law-library-grid">';
    
    if (categories.length === 0) {
      html += '<p class="no-data">No legal categories found.</p>';
    } else {
      categories.forEach(category => {
        html += `
          <div class="law-category-card">
            <h3>${category.category}</h3>
            <p><strong>Number of Laws:</strong> ${category.count}</p>
            <p><strong>Acts:</strong> ${category.acts.join(', ')}</p>
            <button onclick="dashboard.browseCategory('${category.category}')" class="btn-primary">Browse</button>
          </div>
        `;
      });
    }
    
    html += '</div>';
    this.lawLibraryContainer.innerHTML = html;
  }

  // Utility methods
  navigateToSection(section) {
    // Update navigation
    this.navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.section === section) {
        item.classList.add('active');
      }
    });
    
    // Update content
    this.contentSections.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${section}Section`) {
        content.classList.add('active');
      }
    });
    
    // Load section data
    this.loadSectionData(section);
  }

  async loadSectionData(section) {
    switch (section) {
      case 'dashboard':
        await this.loadDashboardStats();
        break;
      case 'cases':
        await this.loadCases();
        break;
      case 'hearings':
        await this.loadHearingSchedule();
        break;
      case 'evidence':
        await this.loadEvidence();
        break;
      case 'voice':
        await this.loadVoiceRecordings();
        break;
      case 'law-library':
        await this.loadLawLibrary();
        break;
    }
  }

  canManageCase(case_) {
    const role = this.currentUser.role;
    if (role === 'admin') return true;
    if (role === 'judge' && case_.assignedJudge?._id === this.currentUser.id) return true;
    if (role === 'lawyer') {
      return case_.plaintiff.lawyerId?._id === this.currentUser.id || 
             case_.defendant.lawyerId?._id === this.currentUser.id;
    }
    return false;
  }

  getEvidenceIcon(type) {
    const icons = {
      'document': '📄',
      'image': '🖼️',
      'video': '🎥',
      'audio': '🎵',
      'digital': '💾',
      'physical': '📦'
    };
    return icons[type] || '📄';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  renderPagination(pagination) {
    let html = '<div class="pagination">';
    
    if (pagination.current > 1) {
      html += `<button onclick="dashboard.loadCases('${this.currentStatus}', ${pagination.current - 1})" class="btn-pagination">Previous</button>`;
    }
    
    for (let i = 1; i <= pagination.pages; i++) {
      const activeClass = i === pagination.current ? 'active' : '';
      html += `<button onclick="dashboard.loadCases('${this.currentStatus}', ${i})" class="btn-pagination ${activeClass}">${i}</button>`;
    }
    
    if (pagination.current < pagination.pages) {
      html += `<button onclick="dashboard.loadCases('${this.currentStatus}', ${pagination.current + 1})" class="btn-pagination">Next</button>`;
    }
    
    html += '</div>';
    return html;
  }

  showLoading(show) {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
  }

  showError(message) {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.style.display = 'block';
      
      setTimeout(() => {
        this.errorMessage.style.display = 'none';
      }, 5000);
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async refreshDashboardStats() {
    if (document.querySelector('#dashboardSection.active')) {
      await this.loadDashboardStats();
    }
  }

  // Placeholder methods for actions
  viewCaseDetails(caseId) {
    window.location.href = `/cases/${caseId}`;
  }

  editCase(caseId) {
    window.location.href = `/cases/${caseId}/edit`;
  }

  viewEvidence(evidenceId) {
    window.location.href = `/evidence/${evidenceId}`;
  }

  downloadEvidence(evidenceId) {
    window.open(`/api/evidence/${evidenceId}/download`, '_blank');
  }

  playRecording(recordingId) {
    // Implementation for playing voice recording
    console.log('Playing recording:', recordingId);
  }

  viewTranscription(recordingId) {
    window.location.href = `/voice/${recordingId}/transcription`;
  }

  downloadRecording(recordingId) {
    window.open(`/api/voice/${recordingId}/download`, '_blank');
  }

  browseCategory(category) {
    window.location.href = `/law-library/category/${category}`;
  }

  loadUsers(filter = 'all') {
    window.location.href = `/users?filter=${filter}`;
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new Dashboard();
});
