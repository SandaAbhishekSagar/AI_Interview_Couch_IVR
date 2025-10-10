const axios = require('axios');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class MurfAIService {
  constructor() {
    this.apiKey = process.env.MURF_API_KEY;
    this.baseUrl = process.env.MURF_API_URL || 'https://api.murf.ai/v1';
    this.outputDir = path.join(__dirname, '../../temp/audio');
    this.publicAudioUrl = process.env.WEBHOOK_BASE_URL || '';
    
    if (!this.apiKey) {
      throw new Error('MurfAI API key not configured');
    }
    
    // Create temp audio directory if it doesn't exist
    this.ensureAudioDirectory();
  }

  // Ensure audio directory exists
  async ensureAudioDirectory() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      logger.info('Audio directory created/verified:', this.outputDir);
    } catch (error) {
      logger.error('Failed to create audio directory:', error);
    }
  }

  // Convert text to speech using MurfAI API
  async textToSpeech(options = {}) {
    const {
      text,
      voiceId = process.env.MURF_DEFAULT_VOICE || 'en-US-natalie',
      format = 'MP3',
      sampleRate = 24000,
      pitch = 0,
      speed = 0,
      useCache = true
    } = options;

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for TTS conversion');
    }

    try {
      const startTime = Date.now();
      
      // Generate cache key for reusing audio files
      const cacheKey = this.generateCacheKey(text, voiceId, pitch, speed);
      
      // Check cache if enabled
      if (useCache) {
        const cachedAudio = await this.getCachedAudio(cacheKey);
        if (cachedAudio) {
          logger.info('Using cached audio file', { cacheKey });
          return cachedAudio;
        }
      }

      // Make API request to MurfAI
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/generate`,
        {
          text: text,
          voiceId: voiceId,
          format: format,
          sampleRate: sampleRate,
          pitch: pitch,
          speed: speed,
          audioSettings: {
            format: format.toLowerCase(),
            sampleRate: sampleRate
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000 // 8 second timeout (leaves 2 seconds for other processing)
        }
      );

      const duration = Date.now() - startTime;
      logger.logApiCall('MurfAI', 'textToSpeech', duration, true);

      // Handle the response
      let audioUrl;
      let audioData;

      if (response.data.audioFile) {
        // If audio file is returned as base64 or binary data
        audioData = Buffer.from(response.data.audioFile, 'base64');
        audioUrl = await this.saveAudioFile(audioData, cacheKey, format);
      } else if (response.data.audioUrl) {
        // If audio URL is returned
        audioUrl = response.data.audioUrl;
        
        // Optionally download and cache the audio
        if (useCache) {
          audioData = await this.downloadAudio(audioUrl);
          audioUrl = await this.saveAudioFile(audioData, cacheKey, format);
        }
      } else {
        throw new Error('Invalid response from MurfAI API - no audio data or URL');
      }

      return {
        audioUrl: audioUrl,
        audioData: audioData,
        text: text,
        voiceId: voiceId,
        duration: response.data.duration || 0,
        cacheKey: cacheKey
      };

    } catch (error) {
      const duration = Date.now() - (startTime || Date.now());
      logger.logApiCall('MurfAI', 'textToSpeech', duration, false);
      logger.error('Failed to convert text to speech with MurfAI:', error);
      
      // Provide more detailed error information
      if (error.response) {
        logger.error('MurfAI API Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      throw error;
    }
  }

  // Convert text to speech and return audio URL for Twilio
  async generateAudioUrl(text, options = {}) {
    try {
      const result = await this.textToSpeech({ text, ...options });
      return result.audioUrl;
    } catch (error) {
      logger.error('Failed to generate audio URL:', error);
      throw error;
    }
  }

  // Batch convert multiple texts to speech (for pre-generating common messages)
  async batchTextToSpeech(textArray, options = {}) {
    const startTime = Date.now();
    
    try {
      const results = [];
      
      // Process texts in parallel with concurrency limit
      const concurrencyLimit = 5;
      for (let i = 0; i < textArray.length; i += concurrencyLimit) {
        const batch = textArray.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(
          batch.map(text => this.textToSpeech({ text, ...options }))
        );
        results.push(...batchResults);
      }

      const duration = Date.now() - startTime;
      logger.info('Batch TTS completed', {
        count: textArray.length,
        duration: duration,
        averagePerText: Math.round(duration / textArray.length)
      });

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to batch convert texts to speech:', error);
      logger.error('Batch processing failed after', duration, 'ms');
      throw error;
    }
  }

  // Save audio file to temp directory and return public URL
  async saveAudioFile(audioData, cacheKey, format = 'mp3') {
    try {
      const filename = `${cacheKey}.${format.toLowerCase()}`;
      const filepath = path.join(this.outputDir, filename);
      
      await fs.writeFile(filepath, audioData);
      
      // Return public URL for Twilio to access
      const publicUrl = `${this.publicAudioUrl}/audio/${filename}`;
      
      logger.info('Audio file saved', { filename, publicUrl });
      
      return publicUrl;
    } catch (error) {
      logger.error('Failed to save audio file:', error);
      throw error;
    }
  }

  // Download audio from URL
  async downloadAudio(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download audio:', error);
      throw error;
    }
  }

  // Generate cache key for audio files
  generateCacheKey(text, voiceId, pitch, speed) {
    const crypto = require('crypto');
    const hash = crypto
      .createHash('sha256')
      .update(`${text}-${voiceId}-${pitch}-${speed}`)
      .digest('hex');
    
    return hash.substring(0, 16);
  }

  // Get cached audio if exists
  async getCachedAudio(cacheKey) {
    try {
      const formats = ['mp3', 'wav'];
      
      for (const format of formats) {
        const filename = `${cacheKey}.${format}`;
        const filepath = path.join(this.outputDir, filename);
        
        try {
          await fs.access(filepath);
          const publicUrl = `${this.publicAudioUrl}/audio/${filename}`;
          const audioData = await fs.readFile(filepath);
          
          return {
            audioUrl: publicUrl,
            audioData: audioData,
            cacheKey: cacheKey,
            cached: true
          };
        } catch (err) {
          // File doesn't exist, continue to next format
          continue;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking cache:', error);
      return null;
    }
  }

  // Clear old cached audio files (older than specified days)
  async clearCache(olderThanDays = 7) {
    try {
      const files = await fs.readdir(this.outputDir);
      const now = Date.now();
      const maxAge = olderThanDays * 24 * 60 * 60 * 1000;
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filepath = path.join(this.outputDir, file);
        const stats = await fs.stat(filepath);
        const age = now - stats.mtimeMs;
        
        if (age > maxAge) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }
      
      logger.info('Cache cleared', { deletedCount, olderThanDays });
      
      return { deletedCount };
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      throw error;
    }
  }

  // Get list of available voices from MurfAI
  async getAvailableVoices() {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/voices`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const duration = Date.now() - startTime;
      logger.logApiCall('MurfAI', 'getAvailableVoices', duration, true);

      return response.data.voices || [];
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logApiCall('MurfAI', 'getAvailableVoices', duration, false);
      logger.error('Failed to get available voices:', error);
      
      // Return default voices if API fails
      return this.getDefaultVoices();
    }
  }

  // Get default voices (fallback)
  getDefaultVoices() {
    return [
      { id: 'en-US-natalie', name: 'Natalie', language: 'en-US', gender: 'female' },
      { id: 'en-US-wayne', name: 'Wayne', language: 'en-US', gender: 'male' },
      { id: 'en-US-sara', name: 'Sara', language: 'en-US', gender: 'female' },
      { id: 'en-US-noah', name: 'Noah', language: 'en-US', gender: 'male' },
      { id: 'en-GB-elizabeth', name: 'Elizabeth', language: 'en-GB', gender: 'female' },
      { id: 'en-GB-charles', name: 'Charles', language: 'en-GB', gender: 'male' }
    ];
  }

  // Pre-generate common messages for faster response times
  async preGenerateCommonMessages() {
    const commonMessages = [
      'Welcome to AI Interview Coaching. I\'m your personal interview coach.',
      'Thank you for that answer.',
      'Thank you for that answer. Please hold while I prepare your next question.',
      'Here\'s your next question.',
      'Please provide your response.',
      'Thank you for completing the mock interview.',
      'Let\'s start your mock interview.',
      'I didn\'t understand that. Let me repeat the options.',
      'No problem, let\'s continue.',
      'Thank you for your time.',
      'Have a great day!',
      'Thank you for that response. Please hold while I prepare your next question.',
      'Let me continue with your next question.'
    ];

    try {
      logger.info('Pre-generating common messages...');
      const results = await this.batchTextToSpeech(commonMessages, { useCache: true });
      logger.info('Common messages pre-generated successfully', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to pre-generate common messages:', error);
    }
  }
}

module.exports = new MurfAIService();

