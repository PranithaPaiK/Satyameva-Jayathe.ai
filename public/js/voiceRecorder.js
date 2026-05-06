/**
 * Voice Recording Module
 * Handles browser-based voice recording with Web Audio API and Speech Recognition
 */
class VoiceRecorder {
  constructor(options = {}) {
    this.isRecording = false;
    this.isPaused = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recognition = null;
    this.stream = null;
    
    // Configuration
    this.config = {
      sampleRate: 16000,
      channelCount: 1,
      bitRate: 128000,
      mimeType: 'audio/webm',
      enableSpeechRecognition: true,
      language: 'en-US',
      ...options
    };
    
    // Event callbacks
    this.callbacks = {
      onStart: options.onStart || (() => {}),
      onStop: options.onStop || (() => {}),
      onPause: options.onPause || (() => {}),
      onResume: options.onResume || (() => {}),
      onDataAvailable: options.onDataAvailable || (() => {}),
      onError: options.onError || (() => {}),
      onTranscription: options.onTranscription || (() => {})
    };
    
    this.initializeSpeechRecognition();
  }

  /**
   * Initialize speech recognition
   */
  initializeSpeechRecognition() {
    if (!this.config.enableSpeechRecognition) return;
    
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.config.language;
      
      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        this.callbacks.onTranscription({
          final: finalTranscript.trim(),
          interim: interimTranscript.trim(),
          full: (finalTranscript + interimTranscript).trim()
        });
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.callbacks.onError({
          type: 'speech_recognition',
          error: event.error
        });
      };
      
      this.recognition.onend = () => {
        if (this.isRecording && !this.isPaused) {
          // Restart recognition if still recording
          setTimeout(() => {
            try {
              this.recognition.start();
            } catch (error) {
              console.error('Failed to restart speech recognition:', error);
            }
          }, 100);
        }
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }

  /**
   * Check if browser supports audio recording
   */
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Check if speech recognition is supported
   */
  static isSpeechRecognitionSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      return true;
    } catch (error) {
      this.callbacks.onError({
        type: 'permission',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Start recording
   */
  async start() {
    if (this.isRecording) {
      console.warn('Recording is already in progress');
      return;
    }

    try {
      // Request permissions if not already granted
      if (!this.stream) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;
      }

      // Create media recorder
      const options = this.getMimeOptions();
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.audioChunks = [];

      // Setup event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.callbacks.onDataAvailable(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.config.mimeType });
        this.callbacks.onStop(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        this.callbacks.onError({
          type: 'recording',
          error: event.error
        });
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      this.isPaused = false;

      // Start speech recognition
      if (this.recognition) {
        try {
          this.recognition.start();
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
        }
      }

      this.callbacks.onStart();
      
    } catch (error) {
      this.callbacks.onError({
        type: 'recording',
        error: error.message
      });
    }
  }

  /**
   * Stop recording
   */
  stop() {
    if (!this.isRecording) {
      console.warn('No recording in progress');
      return;
    }

    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Stop speech recognition
    if (this.recognition) {
      this.recognition.stop();
    }

    this.isRecording = false;
    this.isPaused = false;
  }

  /**
   * Pause recording
   */
  pause() {
    if (!this.isRecording || this.isPaused) {
      console.warn('Cannot pause: not recording or already paused');
      return;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPaused = true;
      
      if (this.recognition) {
        this.recognition.stop();
      }
      
      this.callbacks.onPause();
    }
  }

  /**
   * Resume recording
   */
  resume() {
    if (!this.isRecording || !this.isPaused) {
      console.warn('Cannot resume: not recording or not paused');
      return;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.isPaused = false;
      
      if (this.recognition) {
        try {
          this.recognition.start();
        } catch (error) {
          console.error('Failed to restart speech recognition:', error);
        }
      }
      
      this.callbacks.onResume();
    }
  }

  /**
   * Get recording duration
   */
  getDuration() {
    if (!this.isRecording) return 0;
    
    // This would need to be tracked separately
    // For now, return estimated duration based on chunks
    return this.audioChunks.length * 0.1; // Rough estimate
  }

  /**
   * Get audio level (for visualization)
   */
  getAudioLevel() {
    if (!this.stream) return 0;
    
    // This would require audio context and analyzer
    // For now, return simulated value
    return Math.random() * 100;
  }

  /**
   * Get supported MIME types
   */
  getMimeOptions() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return { mimeType: type };
      }
    }

    return {}; // Let browser choose
  }

  /**
   * Convert blob to different format
   */
  async convertBlob(blob, targetFormat = 'audio/wav') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // This would use audio processing library for actual conversion
        // For now, return original blob
        resolve(blob);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stop();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Get recording statistics
   */
  getStats() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration: this.getDuration(),
      audioLevel: this.getAudioLevel(),
      supported: VoiceRecorder.isSupported(),
      speechRecognitionSupported: VoiceRecorder.isSpeechRecognitionSupported(),
      mimeType: this.config.mimeType,
      sampleRate: this.config.sampleRate,
      channelCount: this.config.channelCount
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceRecorder;
}
