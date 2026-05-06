// Voice Recognition and Speech-to-Text Conversion
class VoiceRecognition {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.transcript = '';
        this.confidence = 0;
        this.initializeRecognition();
    }

    initializeRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        } else {
            console.warn('Speech recognition not supported');
            return;
        }

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript = result[0].transcript;
                    this.confidence = result[0].confidence;
                } else {
                    interimTranscript = result[0].transcript;
                }
            }

            this.updateTranscriptDisplay(interimTranscript, finalTranscript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.showError(`Speech recognition error: ${event.error}`);
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            this.updateRecordingButton();
        };
    }

    startRecording() {
        if (!this.recognition || this.isRecording) return;

        this.isRecording = true;
        this.transcript = '';
        this.confidence = 0;
        
        try {
            this.recognition.start();
            this.updateRecordingButton();
            this.showStatus('Listening... Speak clearly', 'info');
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showError('Failed to start voice recognition');
        }
    }

    stopRecording() {
        if (!this.recognition || !this.isRecording) return;

        this.isRecording = false;
        
        try {
            this.recognition.stop();
            this.updateRecordingButton();
            this.showStatus('Recording stopped', 'success');
        } catch (error) {
            console.error('Error stopping recording:', error);
            this.showError('Failed to stop voice recognition');
        }
    }

    updateTranscriptDisplay(interim, final) {
        const transcriptDiv = document.getElementById('voiceTranscript');
        const confidenceDiv = document.getElementById('voiceConfidence');
        
        if (final) {
            this.transcript += (this.transcript ? ' ' : '') + final;
            transcriptDiv.innerHTML = `<strong>Final:</strong> ${this.transcript}`;
            confidenceDiv.innerHTML = `Confidence: ${(this.confidence * 100).toFixed(1)}%`;
            
            // Save transcript to storage
            this.saveTranscript(final, this.confidence);
        } else if (interim) {
            transcriptDiv.innerHTML = `<strong>Interim:</strong> ${interim}`;
        }
    }

    updateRecordingButton() {
        const button = document.getElementById('voiceRecordBtn');
        if (!button) return;

        if (this.isRecording) {
            button.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Recording';
            button.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition';
        } else {
            button.innerHTML = '<i class="fas fa-microphone mr-2"></i>Start Recording';
            button.className = 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition';
        }
    }

    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('voiceStatus');
        if (!statusDiv) return;

        const bgColor = type === 'error' ? 'bg-red-100 text-red-800' : 
                       type === 'success' ? 'bg-green-100 text-green-800' : 
                       'bg-blue-100 text-blue-800';
        
        statusDiv.innerHTML = `
            <div class="${bgColor} px-4 py-2 rounded-lg">
                <i class="fas fa-info-circle mr-2"></i>${message}
            </div>
        `;
        
        // Auto-hide status after 5 seconds
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 5000);
    }

    showError(message) {
        this.showStatus(message, 'error');
    }

    saveTranscript(text, confidence) {
        const transcripts = JSON.parse(localStorage.getItem('voiceTranscripts') || '[]');
        transcripts.push({
            text: text,
            confidence: confidence,
            timestamp: new Date().toISOString(),
            duration: this.calculateDuration(text)
        });
        
        // Keep only last 50 transcripts
        if (transcripts.length > 50) {
            transcripts.shift();
        }
        
        localStorage.setItem('voiceTranscripts', JSON.stringify(transcripts));
    }

    calculateDuration(text) {
        // Estimate duration based on word count (average 150 words per minute)
        const wordCount = text.split(' ').length;
        return Math.ceil((wordCount / 150) * 60); // seconds
    }

    getTranscripts() {
        return JSON.parse(localStorage.getItem('voiceTranscripts') || '[]');
    }

    clearTranscripts() {
        localStorage.removeItem('voiceTranscripts');
        document.getElementById('voiceTranscript').innerHTML = '';
        document.getElementById('voiceConfidence').innerHTML = '';
    }
}

// Initialize voice recognition
let voiceRecognition = null;

window.addEventListener('DOMContentLoaded', () => {
    voiceRecognition = new VoiceRecognition();
});

// Export for use in other modules
window.VoiceRecognition = VoiceRecognition;
