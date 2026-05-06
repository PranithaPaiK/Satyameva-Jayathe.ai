/**
 * Voice Recording Frontend Module
 * Handles real-time voice recording, transcription, and upload
 */
class VoiceRecording {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.recordingStartTime = null;
    this.recordingDuration = 0;
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    
    // Speech recognition for real-time transcription
    this.recognition = null;
    this.transcript = '';
    this.confidence = 0;
    
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.recordButton = document.getElementById('recordButton');
    this.stopButton = document.getElementById('stopButton');
    this.pauseButton = document.getElementById('pauseButton');
    this.audioPlayer = document.getElementById('audioPlayer');
    this.transcriptDisplay = document.getElementById('transcriptDisplay');
    this.confidenceDisplay = document.getElementById('confidenceDisplay');
    this.durationDisplay = document.getElementById('durationDisplay');
    this.statusDisplay = document.getElementById('statusDisplay');
    this.uploadButton = document.getElementById('uploadButton');
    this.visualizer = document.getElementById('audioVisualizer');
    this.caseIdInput = document.getElementById('caseId');
    this.speakerTypeSelect = document.getElementById('speakerType');
    this.languageSelect = document.getElementById('language');
  }

  setupEventListeners() {
    this.recordButton.addEventListener('click', () => this.startRecording());
    this.stopButton.addEventListener('click', () => this.stopRecording());
    this.pauseButton.addEventListener('click', () => this.togglePause());
    this.uploadButton.addEventListener('click', () => this.uploadRecording());
    
    // Initialize speech recognition if available
    this.initializeSpeechRecognition();
  }

  async initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.languageSelect?.value || 'en-US';
      
      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            this.confidence = result[0].confidence;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        this.transcript = finalTranscript + interimTranscript;
        this.updateTranscriptDisplay();
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.showStatus('Speech recognition error: ' + event.error, 'error');
      };
      
      this.recognition.onend = () => {
        if (this.isRecording) {
          // Restart recognition if still recording
          this.recognition.start();
        }
      };
      
      // Update language when changed
      if (this.languageSelect) {
        this.languageSelect.addEventListener('change', (e) => {
          this.recognition.lang = e.target.value;
        });
      }
    } else {
      console.warn('Speech recognition not supported in this browser');
      this.showStatus('Speech recognition not available in this browser', 'warning');
    }
  }

  async startRecording() {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1
        } 
      });
      
      // Setup audio context for visualization
      this.setupAudioContext();
      
      // Setup media recorder
      const options = this.getRecorderOptions();
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      
      this.audioChunks = [];
      this.recordingStartTime = Date.now();
      this.isRecording = true;
      
      // Setup event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };
      
      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        this.showStatus('Recording error: ' + event.error, 'error');
        this.stopRecording();
      };
      
      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      
      // Start speech recognition
      if (this.recognition) {
        this.recognition.start();
      }
      
      // Start visualization
      this.startVisualization();
      
      // Update UI
      this.updateRecordingUI(true);
      this.showStatus('Recording...', 'recording');
      this.startDurationTimer();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      this.showStatus('Failed to start recording: ' + error.message, 'error');
    }
  }

  stopRecording() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    
    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Stop speech recognition
    if (this.recognition) {
      this.recognition.stop();
    }
    
    // Stop stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    // Stop visualization
    this.stopVisualization();
    
    // Update UI
    this.updateRecordingUI(false);
    this.showStatus('Recording stopped. Processing...', 'processing');
    this.stopDurationTimer();
  }

  togglePause() {
    if (!this.mediaRecorder) return;
    
    if (this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.pauseButton.textContent = 'Resume';
      this.showStatus('Recording paused', 'paused');
    } else if (this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.pauseButton.textContent = 'Pause';
      this.showStatus('Recording...', 'recording');
    }
  }

  async processRecording() {
    try {
      // Create audio blob
      const audioBlob = new Blob(this.audioChunks, { 
        type: this.getAudioMimeType() 
      });
      
      // Create audio URL for playback
      const audioUrl = URL.createObjectURL(audioBlob);
      this.audioPlayer.src = audioUrl;
      
      // Enable upload button
      this.uploadButton.disabled = false;
      
      this.showStatus('Recording ready for upload', 'ready');
      
      // Store blob for upload
      this.audioBlob = audioBlob;
      
    } catch (error) {
      console.error('Error processing recording:', error);
      this.showStatus('Error processing recording: ' + error.message, 'error');
    }
  }

  async uploadRecording() {
    if (!this.audioBlob) {
      this.showStatus('No recording to upload', 'error');
      return;
    }
    
    const caseId = this.caseIdInput?.value;
    const speakerType = this.speakerTypeSelect?.value;
    const language = this.languageSelect?.value;
    
    if (!caseId || !speakerType) {
      this.showStatus('Please fill in required fields', 'error');
      return;
    }
    
    try {
      this.showStatus('Uploading recording...', 'uploading');
      this.uploadButton.disabled = true;
      
      // Create form data
      const formData = new FormData();
      formData.append('audio', this.audioBlob, `recording_${Date.now()}.wav`);
      formData.append('caseId', caseId);
      formData.append('speakerType', speakerType);
      formData.append('language', language);
      formData.append('transcript', this.transcript);
      formData.append('confidence', this.confidence);
      
      // Upload to server
      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showStatus('Recording uploaded successfully!', 'success');
        this.resetRecording();
        
        // Show upload result
        if (result.data) {
          this.showUploadResult(result.data);
        }
      } else {
        throw new Error(result.message || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Error uploading recording:', error);
      this.showStatus('Upload failed: ' + error.message, 'error');
    } finally {
      this.uploadButton.disabled = false;
    }
  }

  setupAudioContext() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.microphone = this.audioContext.createMediaStreamSource(this.stream);
    
    this.analyser.fftSize = 256;
    this.microphone.connect(this.analyser);
  }

  startVisualization() {
    if (!this.visualizer || !this.analyser) return;
    
    const canvas = this.visualizer;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!this.isRecording) return;
      
      requestAnimationFrame(draw);
      
      this.analyser.getByteFrequencyData(dataArray);
      
      canvasCtx.fillStyle = 'rgb(20, 20, 30)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        
        const r = barHeight + 25 * (i / bufferLength);
        const g = 250 * (i / bufferLength);
        const b = 50;
        
        canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
  }

  stopVisualization() {
    if (this.visualizer) {
      const canvas = this.visualizer;
      const canvasCtx = canvas.getContext('2d');
      canvasCtx.fillStyle = 'rgb(20, 20, 30)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  getRecorderOptions() {
    const preferredMimeType = this.getAudioMimeType();
    
    if (MediaRecorder.isTypeSupported(preferredMimeType)) {
      return { mimeType: preferredMimeType };
    }
    
    // Fallback options
    const fallbackTypes = [
      'audio/webm',
      'audio/ogg',
      'audio/mp4'
    ];
    
    for (const type of fallbackTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return { mimeType: type };
      }
    }
    
    return {}; // Use default
  }

  getAudioMimeType() {
    // Prefer WAV for best quality
    if (MediaRecorder.isTypeSupported('audio/wav')) {
      return 'audio/wav';
    }
    
    // Fallback to WebM
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      return 'audio/webm';
    }
    
    // Final fallback
    return 'audio/mp4';
  }

  updateRecordingUI(isRecording) {
    this.recordButton.disabled = isRecording;
    this.stopButton.disabled = !isRecording;
    this.pauseButton.disabled = !isRecording;
    
    if (isRecording) {
      this.recordButton.classList.add('hidden');
      this.stopButton.classList.remove('hidden');
      this.pauseButton.classList.remove('hidden');
    } else {
      this.recordButton.classList.remove('hidden');
      this.stopButton.classList.add('hidden');
      this.pauseButton.classList.add('hidden');
    }
  }

  updateTranscriptDisplay() {
    if (this.transcriptDisplay) {
      this.transcriptDisplay.textContent = this.transcript;
    }
    
    if (this.confidenceDisplay) {
      this.confidenceDisplay.textContent = `Confidence: ${(this.confidence * 100).toFixed(1)}%`;
    }
  }

  startDurationTimer() {
    this.durationTimer = setInterval(() => {
      this.recordingDuration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      this.updateDurationDisplay();
    }, 1000);
  }

  stopDurationTimer() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  updateDurationDisplay() {
    if (this.durationDisplay) {
      const minutes = Math.floor(this.recordingDuration / 60);
      const seconds = this.recordingDuration % 60;
      this.durationDisplay.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  showStatus(message, type = 'info') {
    if (this.statusDisplay) {
      this.statusDisplay.textContent = message;
      this.statusDisplay.className = `status ${type}`;
    }
    
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  showUploadResult(data) {
    // Create result display
    const resultDiv = document.createElement('div');
    resultDiv.className = 'upload-result';
    resultDiv.innerHTML = `
      <h3>Upload Successful!</h3>
      <p><strong>Recording ID:</strong> ${data.recordingId}</p>
      <p><strong>Transcription:</strong> ${data.transcription || 'Processing...'}</p>
      <p><strong>Confidence:</strong> ${(data.confidence * 100).toFixed(1)}%</p>
      <p><strong>Duration:</strong> ${data.duration} seconds</p>
      <button onclick="this.parentElement.remove()">Close</button>
    `;
    
    document.body.appendChild(resultDiv);
  }

  resetRecording() {
    this.audioChunks = [];
    this.transcript = '';
    this.confidence = 0;
    this.recordingDuration = 0;
    this.audioBlob = null;
    
    if (this.audioPlayer) {
      this.audioPlayer.src = '';
    }
    
    if (this.transcriptDisplay) {
      this.transcriptDisplay.textContent = '';
    }
    
    if (this.confidenceDisplay) {
      this.confidenceDisplay.textContent = '';
    }
    
    if (this.durationDisplay) {
      this.durationDisplay.textContent = '00:00';
    }
    
    this.uploadButton.disabled = true;
  }

  // Cleanup method
  destroy() {
    this.stopRecording();
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    if (this.recognition) {
      this.recognition.abort();
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.voiceRecording = new VoiceRecording();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceRecording;
}
