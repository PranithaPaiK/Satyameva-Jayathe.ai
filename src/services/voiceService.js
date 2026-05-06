const fs = require('fs');
const path = require('path');
const VoiceRecording = require('../models/VoiceRecording');
const { logger } = require('../utils/logger');
const { generateHash, extractTextFromFile } = require('../utils/helpers');
const config = require('../config/config');

/**
 * Voice Recording Service
 * Handles voice recording processing, transcription, and analysis
 */
class VoiceService {
  constructor() {
    this.isProcessing = false;
    this.processingQueue = [];
  }

  /**
   * Process voice recording file
   * @param {Object} recordingData - Recording metadata
   * @param {Buffer} audioBuffer - Audio file buffer
   * @returns {Promise<Object>} Processed recording data
   */
  async processRecording(recordingData, audioBuffer) {
    try {
      logger.info('Processing voice recording', { recordingId: recordingData.recordingId });

      // Generate file hash
      const fileHash = generateHash(audioBuffer);

      // Get audio duration (simplified - in production use audio analysis library)
      const duration = await this.getAudioDuration(audioBuffer);

      // Create recording record
      const recording = new VoiceRecording({
        ...recordingData,
        fileHash,
        duration,
        size: audioBuffer.length
      });

      await recording.save();

      // Start transcription process
      this.transcribeAudio(recording._id, audioBuffer);

      return recording;
    } catch (error) {
      logger.error('Error processing voice recording:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio to text
   * @param {string} recordingId - Recording ID
   * @param {Buffer} audioBuffer - Audio buffer
   */
  async transcribeAudio(recordingId, audioBuffer) {
    try {
      const recording = await VoiceRecording.findById(recordingId);
      
      if (!recording) {
        throw new Error('Recording not found');
      }

      // Update status to processing
      recording.transcription.status = 'processing';
      await recording.save();

      let transcriptionText = '';
      let confidence = 0;
      let engine = 'browser';

      // Try browser-based speech recognition first
      if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
        // This would be handled on the frontend
        // For now, we'll simulate transcription
        transcriptionText = await this.simulateTranscription(audioBuffer);
        confidence = 0.85;
        engine = 'browser';
      } else {
        // Use external API (Google Speech-to-Text, AWS Transcribe, etc.)
        transcriptionText = await this.transcribeWithExternalAPI(audioBuffer);
        confidence = 0.90;
        engine = 'external';
      }

      // Update recording with transcription
      await recording.updateTranscription(transcriptionText, confidence, engine);

      // Start analysis
      this.analyzeTranscription(recordingId, transcriptionText);

      logger.info('Audio transcription completed', {
        recordingId,
        engine,
        confidence,
        textLength: transcriptionText.length
      });

    } catch (error) {
      logger.error('Error transcribing audio:', error);
      
      // Mark transcription as failed
      const recording = await VoiceRecording.findById(recordingId);
      if (recording) {
        await recording.markTranscriptionFailed(error.message);
      }
    }
  }

  /**
   * Simulate transcription (for demo purposes)
   * @param {Buffer} audioBuffer - Audio buffer
   * @returns {Promise<string>} Transcribed text
   */
  async simulateTranscription(audioBuffer) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate sample transcription based on audio size
    const sampleTexts = [
      "Your Honor, I would like to present evidence that contradicts the defendant's testimony.",
      "The contract clearly states that payment was due on the specified date.",
      "Based on the documents submitted, there is no basis for this claim.",
      "I object to this line of questioning as it is irrelevant to the case.",
      "The witness testimony confirms our position on this matter."
    ];

    return sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
  }

  /**
   * Transcribe with external API (placeholder)
   * @param {Buffer} audioBuffer - Audio buffer
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeWithExternalAPI(audioBuffer) {
    // This would integrate with Google Speech-to-Text, AWS Transcribe, or Azure Speech
    // For now, return simulated result
    return await this.simulateTranscription(audioBuffer);
  }

  /**
   * Analyze transcribed text
   * @param {string} recordingId - Recording ID
   * @param {string} text - Transcribed text
   */
  async analyzeTranscription(recordingId, text) {
    try {
      const recording = await VoiceRecording.findById(recordingId);
      
      if (!recording) {
        throw new Error('Recording not found');
      }

      // Update analysis status
      recording.processingStatus.analysis = 'processing';
      await recording.save();

      // Perform sentiment analysis
      const sentiment = this.analyzeSentiment(text);
      
      // Extract keywords
      const keywords = this.extractKeywords(text);
      
      // Extract entities
      const entities = this.extractEntities(text);
      
      // Check for contradictions
      const contradictions = await this.checkContradictions(text, recording.caseId);

      // Update recording with analysis results
      await recording.updateAnalysis({
        sentiment,
        keywords,
        entities,
        contradictions: contradictions.map(c => c._id),
        contradictionScore: contradictions.length > 0 ? 0.7 : 0.1
      });

      logger.info('Transcription analysis completed', {
        recordingId,
        sentiment,
        keywordCount: keywords.length,
        entityCount: entities.length,
        contradictionCount: contradictions.length
      });

    } catch (error) {
      logger.error('Error analyzing transcription:', error);
      
      // Mark analysis as failed
      const recording = await VoiceRecording.findById(recordingId);
      if (recording) {
        recording.processingStatus.analysis = 'failed';
        await recording.save();
      }
    }
  }

  /**
   * Analyze sentiment of text
   * @param {string} text - Text to analyze
   * @returns {string} Sentiment (positive, negative, neutral)
   */
  analyzeSentiment(text) {
    // Simple sentiment analysis (in production, use NLP library)
    const positiveWords = ['agree', 'confirm', 'support', 'approve', 'accept'];
    const negativeWords = ['disagree', 'object', 'reject', 'deny', 'oppose'];
    
    const words = text.toLowerCase().split(' ');
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Extract keywords from text
   * @param {string} text - Text to analyze
   * @returns {Array} Keywords with confidence scores
   */
  extractKeywords(text) {
    // Simple keyword extraction (in production, use NLP library)
    const legalKeywords = ['contract', 'evidence', 'testimony', 'witness', 'document', 'court', 'judge', 'lawyer'];
    const words = text.toLowerCase().split(' ');
    
    return words
      .filter(word => legalKeywords.includes(word))
      .map((word, index) => ({
        word,
        confidence: 0.8,
        timestamp: index * 100 // Approximate timestamp
      }));
  }

  /**
   * Extract entities from text
   * @param {string} text - Text to analyze
   * @returns {Array} Entities with confidence scores
   */
  extractEntities(text) {
    // Simple entity extraction (in production, use NER library)
    const entities = [];
    
    // Look for dates
    const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}/g;
    const dates = text.match(dateRegex) || [];
    dates.forEach(date => {
      entities.push({
        text: date,
        type: 'DATE',
        confidence: 0.9,
        timestamp: text.indexOf(date)
      });
    });
    
    // Look for monetary amounts
    const moneyRegex = /\$\d+/g;
    const amounts = text.match(moneyRegex) || [];
    amounts.forEach(amount => {
      entities.push({
        text: amount,
        type: 'MONEY',
        confidence: 0.85,
        timestamp: text.indexOf(amount)
      });
    });
    
    return entities;
  }

  /**
   * Check for contradictions with existing evidence
   * @param {string} text - Transcribed text
   * @param {string} caseId - Case ID
   * @returns {Promise<Array>} Contradictory evidence
   */
  async checkContradictions(text, caseId) {
    try {
      const Evidence = require('../models/Evidence');
      
      // Get all evidence for the case
      const evidence = await Evidence.findByCase(caseId);
      
      const contradictions = [];
      
      // Simple contradiction detection
      evidence.forEach(ev => {
        if (ev.extractedText) {
          const similarity = this.calculateSimilarity(text, ev.extractedText);
          
          // If similarity is high but contains negation patterns, it might be a contradiction
          const hasNegation = /\b(not|never|no|didn't|don't|can't|won't)\b/i.test(text);
          
          if (similarity > 0.7 && hasNegation) {
            contradictions.push(ev);
          }
        }
      });
      
      return contradictions;
    } catch (error) {
      logger.error('Error checking contradictions:', error);
      return [];
    }
  }

  /**
   * Calculate text similarity
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(text1, text2) {
    // Simple similarity calculation (in production, use more sophisticated algorithms)
    const words1 = text1.toLowerCase().split(' ');
    const words2 = text2.toLowerCase().split(' ');
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  /**
   * Get audio duration (simplified)
   * @param {Buffer} audioBuffer - Audio buffer
   * @returns {Promise<number>} Duration in seconds
   */
  async getAudioDuration(audioBuffer) {
    // This would use audio analysis library like node-ffmpeg or music-metadata
    // For now, estimate based on file size (assuming 16kHz, 16-bit, mono)
    const bytesPerSecond = 32000; // 16kHz * 2 bytes * 1 channel
    return Math.floor(audioBuffer.length / bytesPerSecond);
  }

  /**
   * Get recording by ID
   * @param {string} recordingId - Recording ID
   * @param {string} userId - User ID requesting
   * @returns {Promise<Object>} Recording data
   */
  async getRecording(recordingId, userId) {
    try {
      const recording = await VoiceRecording.findById(recordingId)
        .populate('recordedBy', 'firstName lastName')
        .populate('caseId', 'caseId title');

      if (!recording) {
        throw new Error('Recording not found');
      }

      // Check access permissions
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!recording.hasAccess(user)) {
        throw new Error('Access denied');
      }

      return recording;
    } catch (error) {
      logger.error('Error getting recording:', error);
      throw error;
    }
  }

  /**
   * Get recordings for a case
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID requesting
   * @returns {Promise<Array>} Recordings
   */
  async getRecordingsByCase(caseId, userId) {
    try {
      const recordings = await VoiceRecording.findByCase(caseId)
        .populate('recordedBy', 'firstName lastName')
        .sort({ recordedAt: -1 });

      // Filter based on access permissions
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      return recordings.filter(recording => recording.hasAccess(user));
    } catch (error) {
      logger.error('Error getting recordings by case:', error);
      throw error;
    }
  }

  /**
   * Delete recording
   * @param {string} recordingId - Recording ID
   * @param {string} userId - User ID requesting deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteRecording(recordingId, userId) {
    try {
      const recording = await VoiceRecording.findById(recordingId);
      
      if (!recording) {
        throw new Error('Recording not found');
      }

      // Check if user can delete (only uploader or admin)
      if (recording.recordedBy.toString() !== userId) {
        const User = require('../models/User');
        const user = await User.findById(userId);
        
        if (user.role !== 'admin') {
          throw new Error('Access denied');
        }
      }

      // Delete file from storage
      if (fs.existsSync(recording.storagePath)) {
        fs.unlinkSync(recording.storagePath);
      }

      // Delete record from database
      await VoiceRecording.findByIdAndDelete(recordingId);

      logger.info('Recording deleted', { recordingId, deletedBy: userId });

      return true;
    } catch (error) {
      logger.error('Error deleting recording:', error);
      throw error;
    }
  }
}

module.exports = new VoiceService();
