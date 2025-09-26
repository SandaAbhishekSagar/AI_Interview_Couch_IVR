const voiceAnalysisService = require('../../services/voiceAnalysisService');

describe('VoiceAnalysisService', () => {
  describe('analyzeSpeechRate', () => {
    it('should analyze speech rate correctly', () => {
      const transcript = 'This is a test transcript with several words to analyze the speech rate properly';
      const duration = 30; // 30 seconds
      
      const result = voiceAnalysisService.analyzeSpeechRate(transcript, duration);
      
      expect(result).toHaveProperty('wordsPerMinute');
      expect(result).toHaveProperty('rate');
      expect(result).toHaveProperty('score');
      expect(result.wordsPerMinute).toBeGreaterThan(0);
      expect(['slow', 'normal', 'fast']).toContain(result.rate);
    });

    it('should handle zero duration', () => {
      const transcript = 'Test transcript';
      const duration = 0;
      
      const result = voiceAnalysisService.analyzeSpeechRate(transcript, duration);
      
      expect(result.wordsPerMinute).toBe(0);
      expect(result.rate).toBe('normal');
    });
  });

  describe('analyzeFillerWords', () => {
    it('should count filler words correctly', () => {
      const transcript = 'So, um, this is a test with uh, like, several filler words';
      
      const result = voiceAnalysisService.analyzeFillerWords(transcript);
      
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('density');
      expect(result).toHaveProperty('words');
      expect(result).toHaveProperty('score');
      expect(result.count).toBeGreaterThan(0);
      expect(result.words).toHaveProperty('um');
      expect(result.words).toHaveProperty('uh');
    });

    it('should handle transcript without filler words', () => {
      const transcript = 'This is a clean transcript without any filler words';
      
      const result = voiceAnalysisService.analyzeFillerWords(transcript);
      
      expect(result.count).toBe(0);
      expect(result.density).toBe(0);
      expect(result.score).toBe(100);
    });
  });

  describe('analyzeConfidence', () => {
    it('should analyze confidence from positive indicators', () => {
      const transcript = 'I am definitely confident about this solution and absolutely certain it will work';
      
      const result = voiceAnalysisService.analyzeConfidence(transcript);
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('indicators');
      expect(result.score).toBeGreaterThan(50);
      expect(['low', 'medium', 'high']).toContain(result.level);
    });

    it('should analyze confidence from negative indicators', () => {
      const transcript = 'Maybe this could work, perhaps, I think so, not sure though';
      
      const result = voiceAnalysisService.analyzeConfidence(transcript);
      
      expect(result.score).toBeLessThan(50);
      expect(result.indicators.negative).toBeGreaterThan(0);
    });
  });

  describe('analyzeVoice', () => {
    it('should perform comprehensive voice analysis', () => {
      const transcript = 'This is a comprehensive test transcript for voice analysis with some um filler words';
      const duration = 30;
      
      const result = voiceAnalysisService.analyzeVoice(transcript, duration);
      
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('speechRate');
      expect(result).toHaveProperty('fillerWords');
      expect(result).toHaveProperty('pauses');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('clarity');
      expect(result).toHaveProperty('recommendations');
      
      expect(result.overall).toHaveProperty('score');
      expect(result.overall).toHaveProperty('level');
      expect(['excellent', 'good', 'fair', 'poor', 'very_poor']).toContain(result.overall.level);
    });

    it('should handle empty transcript', () => {
      const transcript = '';
      const duration = 0;
      
      const result = voiceAnalysisService.analyzeVoice(transcript, duration);
      
      expect(result.overall.score).toBe(50);
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });
});
