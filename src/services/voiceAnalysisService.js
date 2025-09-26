const logger = require('../utils/logger');

class VoiceAnalysisService {
  constructor() {
    this.fillerWords = [
      'um', 'uh', 'er', 'ah', 'like', 'you know', 'so', 'well', 'actually', 'basically',
      'literally', 'honestly', 'really', 'totally', 'absolutely', 'definitely', 'sure',
      'right', 'okay', 'alright', 'kind of', 'sort of', 'pretty much', 'more or less'
    ];
    
    this.confidenceIndicators = {
      positive: ['definitely', 'certainly', 'absolutely', 'confident', 'sure', 'clear'],
      negative: ['maybe', 'perhaps', 'might', 'could be', 'not sure', 'unclear', 'think so']
    };
  }

  // Analyze speech rate from transcript and duration
  analyzeSpeechRate(transcript, durationSeconds) {
    try {
      const wordCount = transcript.split(/\s+/).filter(word => word.length > 0).length;
      const wordsPerMinute = durationSeconds > 0 ? (wordCount / durationSeconds) * 60 : 0;
      
      let rate = 'normal';
      if (wordsPerMinute < 120) {
        rate = 'slow';
      } else if (wordsPerMinute > 180) {
        rate = 'fast';
      }
      
      return {
        wordsPerMinute: Math.round(wordsPerMinute),
        rate: rate,
        score: this.calculateSpeechRateScore(wordsPerMinute)
      };
    } catch (error) {
      logger.error('Error analyzing speech rate:', error);
      return { wordsPerMinute: 0, rate: 'normal', score: 50 };
    }
  }

  // Count filler words in transcript
  analyzeFillerWords(transcript) {
    try {
      const words = transcript.toLowerCase().split(/\s+/);
      const fillerCount = {};
      let totalFillers = 0;
      
      this.fillerWords.forEach(filler => {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        const matches = transcript.match(regex);
        if (matches) {
          fillerCount[filler] = matches.length;
          totalFillers += matches.length;
        }
      });
      
      const fillerDensity = words.length > 0 ? (totalFillers / words.length) * 100 : 0;
      
      return {
        count: totalFillers,
        density: Math.round(fillerDensity * 100) / 100,
        words: fillerCount,
        score: this.calculateFillerWordScore(fillerDensity)
      };
    } catch (error) {
      logger.error('Error analyzing filler words:', error);
      return { count: 0, density: 0, words: {}, score: 100 };
    }
  }

  // Analyze pauses in speech (based on transcript analysis)
  analyzePauses(transcript, durationSeconds) {
    try {
      // Count periods, commas, and other pause indicators
      const pauseIndicators = transcript.match(/[.,;!?]/g) || [];
      const pauseCount = pauseIndicators.length;
      
      // Estimate pause duration (rough approximation)
      const estimatedPauseDuration = pauseCount * 0.5; // 0.5 seconds per pause
      const speechTime = durationSeconds - estimatedPauseDuration;
      const pauseRatio = durationSeconds > 0 ? estimatedPauseDuration / durationSeconds : 0;
      
      return {
        count: pauseCount,
        averageLength: pauseCount > 0 ? estimatedPauseDuration / pauseCount : 0,
        ratio: Math.round(pauseRatio * 100) / 100,
        effectiveness: this.assessPauseEffectiveness(pauseRatio),
        score: this.calculatePauseScore(pauseRatio)
      };
    } catch (error) {
      logger.error('Error analyzing pauses:', error);
      return { count: 0, averageLength: 0, ratio: 0, effectiveness: 'good', score: 75 };
    }
  }

  // Analyze confidence level from language patterns
  analyzeConfidence(transcript) {
    try {
      const words = transcript.toLowerCase().split(/\s+/);
      let confidenceScore = 50; // Start with neutral
      
      // Check for confidence indicators
      const positiveCount = words.filter(word => 
        this.confidenceIndicators.positive.some(indicator => 
          word.includes(indicator)
        )
      ).length;
      
      const negativeCount = words.filter(word => 
        this.confidenceIndicators.negative.some(indicator => 
          word.includes(indicator)
        )
      ).length;
      
      // Adjust confidence based on indicators
      confidenceScore += (positiveCount * 5);
      confidenceScore -= (negativeCount * 3);
      
      // Check for hedging language
      const hedgingWords = ['maybe', 'perhaps', 'might', 'could', 'possibly', 'probably'];
      const hedgingCount = words.filter(word => hedgingWords.includes(word)).length;
      confidenceScore -= (hedgingCount * 2);
      
      // Check for strong statements
      const strongWords = ['definitely', 'certainly', 'absolutely', 'clearly', 'obviously'];
      const strongCount = words.filter(word => strongWords.includes(word)).length;
      confidenceScore += (strongCount * 3);
      
      // Normalize score
      confidenceScore = Math.max(0, Math.min(100, confidenceScore));
      
      let level = 'medium';
      if (confidenceScore >= 70) level = 'high';
      else if (confidenceScore <= 30) level = 'low';
      
      return {
        score: Math.round(confidenceScore),
        level: level,
        indicators: {
          positive: positiveCount,
          negative: negativeCount,
          hedging: hedgingCount,
          strong: strongCount
        }
      };
    } catch (error) {
      logger.error('Error analyzing confidence:', error);
      return { score: 50, level: 'medium', indicators: { positive: 0, negative: 0, hedging: 0, strong: 0 } };
    }
  }

  // Analyze clarity and articulation
  analyzeClarity(transcript) {
    try {
      const words = transcript.split(/\s+/).filter(word => word.length > 0);
      const totalWords = words.length;
      
      if (totalWords === 0) {
        return { score: 0, clarity: 'poor', wordLength: 0, complexity: 0 };
      }
      
      // Calculate average word length
      const totalCharacters = words.join('').length;
      const averageWordLength = totalCharacters / totalWords;
      
      // Calculate vocabulary complexity (unique words / total words)
      const uniqueWords = new Set(words.map(word => word.toLowerCase())).size;
      const vocabularyComplexity = uniqueWords / totalWords;
      
      // Calculate sentence complexity
      const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const averageSentenceLength = sentences.length > 0 ? totalWords / sentences.length : 0;
      
      // Calculate clarity score
      let clarityScore = 50;
      
      // Word length factor (optimal around 5-6 characters)
      if (averageWordLength >= 4 && averageWordLength <= 7) {
        clarityScore += 10;
      } else if (averageWordLength < 3 || averageWordLength > 10) {
        clarityScore -= 10;
      }
      
      // Vocabulary complexity factor
      if (vocabularyComplexity >= 0.7) {
        clarityScore += 15;
      } else if (vocabularyComplexity < 0.4) {
        clarityScore -= 15;
      }
      
      // Sentence length factor (optimal around 15-20 words)
      if (averageSentenceLength >= 10 && averageSentenceLength <= 25) {
        clarityScore += 10;
      } else if (averageSentenceLength < 5 || averageSentenceLength > 35) {
        clarityScore -= 10;
      }
      
      clarityScore = Math.max(0, Math.min(100, clarityScore));
      
      let clarity = 'medium';
      if (clarityScore >= 75) clarity = 'high';
      else if (clarityScore <= 40) clarity = 'low';
      
      return {
        score: Math.round(clarityScore),
        clarity: clarity,
        wordLength: Math.round(averageWordLength * 100) / 100,
        complexity: Math.round(vocabularyComplexity * 100) / 100,
        sentenceLength: Math.round(averageSentenceLength * 100) / 100
      };
    } catch (error) {
      logger.error('Error analyzing clarity:', error);
      return { score: 50, clarity: 'medium', wordLength: 5, complexity: 0.5, sentenceLength: 15 };
    }
  }

  // Comprehensive voice analysis
  analyzeVoice(transcript, durationSeconds, additionalMetrics = {}) {
    try {
      const speechRate = this.analyzeSpeechRate(transcript, durationSeconds);
      const fillerWords = this.analyzeFillerWords(transcript);
      const pauses = this.analyzePauses(transcript, durationSeconds);
      const confidence = this.analyzeConfidence(transcript);
      const clarity = this.analyzeClarity(transcript);
      
      // Calculate overall communication score
      const overallScore = Math.round(
        (speechRate.score + fillerWords.score + pauses.score + confidence.score + clarity.score) / 5
      );
      
      return {
        overall: {
          score: overallScore,
          level: this.getScoreLevel(overallScore)
        },
        speechRate,
        fillerWords,
        pauses,
        confidence,
        clarity,
        metrics: {
          wordCount: transcript.split(/\s+/).filter(w => w.length > 0).length,
          duration: durationSeconds,
          ...additionalMetrics
        },
        recommendations: this.generateVoiceRecommendations({
          speechRate,
          fillerWords,
          pauses,
          confidence,
          clarity
        })
      };
    } catch (error) {
      logger.error('Error in comprehensive voice analysis:', error);
      return this.getDefaultAnalysis();
    }
  }

  // Helper methods for scoring
  calculateSpeechRateScore(wordsPerMinute) {
    if (wordsPerMinute >= 140 && wordsPerMinute <= 160) return 100;
    if (wordsPerMinute >= 120 && wordsPerMinute <= 180) return 80;
    if (wordsPerMinute >= 100 && wordsPerMinute <= 200) return 60;
    return 40;
  }

  calculateFillerWordScore(density) {
    if (density <= 1) return 100;
    if (density <= 2) return 80;
    if (density <= 3) return 60;
    if (density <= 5) return 40;
    return 20;
  }

  calculatePauseScore(ratio) {
    if (ratio >= 0.1 && ratio <= 0.2) return 100;
    if (ratio >= 0.05 && ratio <= 0.3) return 80;
    if (ratio >= 0.02 && ratio <= 0.4) return 60;
    return 40;
  }

  assessPauseEffectiveness(ratio) {
    if (ratio >= 0.1 && ratio <= 0.2) return 'excellent';
    if (ratio >= 0.05 && ratio <= 0.3) return 'good';
    if (ratio >= 0.02 && ratio <= 0.4) return 'fair';
    return 'poor';
  }

  getScoreLevel(score) {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 35) return 'poor';
    return 'very_poor';
  }

  generateVoiceRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.speechRate.rate === 'fast') {
      recommendations.push('Try speaking more slowly for better clarity');
    } else if (analysis.speechRate.rate === 'slow') {
      recommendations.push('Consider picking up the pace slightly');
    }
    
    if (analysis.fillerWords.density > 2) {
      recommendations.push('Work on reducing filler words like "um" and "uh"');
    }
    
    if (analysis.pauses.effectiveness === 'poor') {
      recommendations.push('Use more strategic pauses for emphasis');
    }
    
    if (analysis.confidence.level === 'low') {
      recommendations.push('Practice using more confident language');
    }
    
    if (analysis.clarity.clarity === 'low') {
      recommendations.push('Focus on clearer articulation and word choice');
    }
    
    return recommendations;
  }

  getDefaultAnalysis() {
    return {
      overall: { score: 50, level: 'fair' },
      speechRate: { wordsPerMinute: 150, rate: 'normal', score: 75 },
      fillerWords: { count: 0, density: 0, words: {}, score: 100 },
      pauses: { count: 0, averageLength: 0, ratio: 0, effectiveness: 'good', score: 75 },
      confidence: { score: 50, level: 'medium', indicators: { positive: 0, negative: 0, hedging: 0, strong: 0 } },
      clarity: { score: 50, clarity: 'medium', wordLength: 5, complexity: 0.5, sentenceLength: 15 },
      metrics: { wordCount: 0, duration: 0 },
      recommendations: ['Continue practicing to improve your communication skills']
    };
  }
}

module.exports = new VoiceAnalysisService();
