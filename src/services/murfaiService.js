const WebSocket = require('ws');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class MurfAIService {
  constructor() {
    this.apiKey = process.env.MURF_API_KEY;
    this.wsUrl = 'wss://api.murf.ai/v1/speech/stream-input';
    this.outputDir = path.join(__dirname, '../../temp/audio');
    this.publicAudioUrl = process.env.WEBHOOK_BASE_URL || '';
    
    if (!this.apiKey) {
      logger.warn('MurfAI API key not configured - TTS will fall back to Twilio');
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

  // Convert text to speech using MurfAI WebSocket API
  async textToSpeech(options = {}) {
    const {
      text,
      voiceId = process.env.MURF_DEFAULT_VOICE || 'en-US-natalie',
      format = 'WAV',
      sampleRate = 24000,
      pitch = 0,
      speed = 0,
      style = 'Conversational',
      useCache = true
    } = options;

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for TTS conversion');
    }

    // Check if API key is configured
    if (!this.apiKey) {
      throw new Error('MurfAI API key not configured');
    }

    const startTime = Date.now();
    
    try {
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

      // Generate audio using WebSocket
      const audioData = await this.generateAudioViaWebSocket(text, {
        voiceId,
        sampleRate,
        pitch,
        speed,
        style
      });

      const duration = Date.now() - startTime;
      logger.logApiCall('MurfAI', 'textToSpeech', duration, true);

      // Save audio file
      const audioUrl = await this.saveAudioFile(audioData, cacheKey, format);

      return {
        audioUrl: audioUrl,
        audioData: audioData,
        text: text,
        voiceId: voiceId,
        duration: duration,
        cacheKey: cacheKey
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logApiCall('MurfAI', 'textToSpeech', duration, false);
      logger.error('Failed to convert text to speech with MurfAI:', error);
      throw error;
    }
  }

  // Generate audio via WebSocket streaming
  async generateAudioViaWebSocket(text, options = {}) {
    const {
      voiceId = 'en-US-natalie',
      sampleRate = 24000,
      pitch = 0,
      speed = 0,
      style = 'Conversational'
    } = options;

    return new Promise((resolve, reject) => {
      const channelType = 'MONO';
      const format = 'WAV';
      const wsUrl = `${this.wsUrl}?api-key=${this.apiKey}&sample_rate=${sampleRate}&channel_type=${channelType}&format=${format}`;
      
      logger.info('Connecting to MurfAI WebSocket...', { voiceId, sampleRate });
      
      const ws = new WebSocket(wsUrl);
      const audioChunks = [];
      let firstChunk = true;
      let connectionTimeout;
      let receivedData = false;

      // Set connection timeout (10 seconds)
      connectionTimeout = setTimeout(() => {
        if (!receivedData) {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);

      ws.on('open', () => {
        logger.info('WebSocket connection established');
        
        try {
          // Send voice configuration
          const voiceConfig = {
            voice_config: {
              voiceId: voiceId,
              style: style,
              rate: speed,
              pitch: pitch,
              variation: 1
            }
          };
          
          logger.info('Sending voice config:', voiceConfig);
          ws.send(JSON.stringify(voiceConfig));

          // Send text message
          const textMessage = {
            text: text,
            end: true // Close context after this text
          };
          
          logger.info('Sending text message');
          ws.send(JSON.stringify(textMessage));
          
        } catch (error) {
          clearTimeout(connectionTimeout);
          ws.close();
          reject(error);
        }
      });

      ws.on('message', (data) => {
        receivedData = true;
        clearTimeout(connectionTimeout);
        
        try {
          const response = JSON.parse(data.toString());
          logger.info('Received WebSocket message:', { 
            hasAudio: !!response.audio, 
            final: response.final 
          });

          if (response.audio) {
            // Decode base64 audio
            const audioBytes = Buffer.from(response.audio, 'base64');
            
            // Skip WAV header (44 bytes) only for first chunk
            if (firstChunk && audioBytes.length > 44) {
              audioChunks.push(audioBytes.slice(44));
              firstChunk = false;
            } else {
              audioChunks.push(audioBytes);
            }
          }

          // Check if this is the final message
          if (response.final) {
            ws.close();
            
            // Combine all audio chunks
            const fullAudio = Buffer.concat(audioChunks);
            logger.info('Audio generation completed', { 
              chunks: audioChunks.length, 
              totalBytes: fullAudio.length 
            });
            
            resolve(fullAudio);
          }
        } catch (error) {
          logger.error('Error processing WebSocket message:', error);
          ws.close();
          reject(error);
        }
      });

      ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        logger.error('WebSocket error:', error);
        reject(error);
      });

      ws.on('close', (code, reason) => {
        clearTimeout(connectionTimeout);
        logger.info('WebSocket connection closed', { code, reason: reason.toString() });
        
        // If we didn't get audio data, reject
        if (audioChunks.length === 0) {
          reject(new Error('Connection closed without receiving audio data'));
        }
      });
    });
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
      
      // Process texts sequentially to avoid overwhelming WebSocket connections
      // (MurfAI allows 10x concurrency but let's be conservative)
      const concurrencyLimit = 3;
      for (let i = 0; i < textArray.length; i += concurrencyLimit) {
        const batch = textArray.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(
          batch.map(text => this.textToSpeech({ text, ...options }).catch(err => {
            logger.warn(`Failed to generate audio for: "${text.substring(0, 30)}..."`, err.message);
            return null;
          }))
        );
        results.push(...batchResults.filter(r => r !== null));
      }

      const duration = Date.now() - startTime;
      logger.info('Batch TTS completed', {
        count: textArray.length,
        successful: results.length,
        failed: textArray.length - results.length,
        duration: duration,
        averagePerText: Math.round(duration / textArray.length)
      });

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Failed to batch convert texts to speech:', error.message || error);
      logger.error(`Batch processing failed after ${duration}ms`);
      throw error;
    }
  }

  // Save audio file to temp directory and return public URL
  async saveAudioFile(audioData, cacheKey, format = 'wav') {
    try {
      const filename = `${cacheKey}.${format.toLowerCase()}`;
      const filepath = path.join(this.outputDir, filename);
      
      await fs.writeFile(filepath, audioData);
      
      // Return public URL for Twilio to access
      const publicUrl = `${this.publicAudioUrl}/audio/${filename}`;
      
      logger.info('Audio file saved', { filename, size: audioData.length, publicUrl });
      
      return publicUrl;
    } catch (error) {
      logger.error('Failed to save audio file:', error);
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
      const formats = ['wav', 'mp3'];
      
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

  // Get default voices (fallback)
  getDefaultVoices() {
    return [
      { id: 'en-US-natalie', name: 'Natalie', language: 'en-US', gender: 'female' },
      { id: 'en-US-wayne', name: 'Wayne', language: 'en-US', gender: 'male' },
      { id: 'en-US-sara', name: 'Sara', language: 'en-US', gender: 'female' },
      { id: 'en-US-noah', name: 'Noah', language: 'en-US', gender: 'male' },
      { id: 'en-US-amara', name: 'Amara', language: 'en-US', gender: 'female' },
      { id: 'en-GB-elizabeth', name: 'Elizabeth', language: 'en-GB', gender: 'female' },
      { id: 'en-GB-charles', name: 'Charles', language: 'en-GB', gender: 'male' }
    ];
  }

  // Pre-generate common messages for faster response times
  async preGenerateCommonMessages() {
    // Check if MurfAI is properly configured
    if (!this.apiKey) {
      logger.warn('MurfAI not configured, skipping pre-generation');
      return [];
    }

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
      logger.info('Common messages pre-generated successfully', { 
        total: commonMessages.length,
        successful: results.length,
        failed: commonMessages.length - results.length
      });
      return results;
    } catch (error) {
      logger.warn('Failed to pre-generate common messages (will generate on-demand):', error.message);
      return [];
    }
  }
}

module.exports = new MurfAIService();
