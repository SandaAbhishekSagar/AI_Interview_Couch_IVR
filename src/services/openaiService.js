const OpenAI = require('openai');
const logger = require('../utils/logger');

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Generate interview questions based on user profile and session type
  async generateInterviewQuestions(options = {}) {
    const {
      industry = 'technology',
      experienceLevel = 'mid',
      sessionType = 'mock_interview',
      questionCount = 5,
      previousQuestions = [],
      focusAreas = ['behavioral', 'technical']
    } = options;

    try {
      const startTime = Date.now();
      
      const systemPrompt = `You are an expert interview coach. Generate ${questionCount} high-quality interview questions for a ${experienceLevel}-level position in the ${industry} industry.

Requirements:
- Questions should be appropriate for ${experienceLevel} level
- Focus on: ${focusAreas.join(', ')}
- Avoid repeating: ${previousQuestions.join(', ')}
- Make questions realistic and challenging
- Include mix of behavioral and technical questions
- Format each question with category and difficulty level

Return as JSON array with this structure:
[
  {
    "id": "unique_id",
    "text": "question text",
    "category": "behavioral|technical|situational",
    "difficulty": "easy|medium|hard",
    "expectedKeywords": ["keyword1", "keyword2"],
    "evaluationCriteria": ["criteria1", "criteria2"]
  }
]`;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate questions for ${industry} ${experienceLevel} level interview focusing on ${focusAreas.join(', ')}` }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const duration = Date.now() - startTime;
      logger.logApiCall('OpenAI', 'generateInterviewQuestions', duration, true);

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logApiCall('OpenAI', 'generateInterviewQuestions', duration, false);
      logger.error('Failed to generate interview questions:', error);
      
      // Return fallback questions if OpenAI fails
      return this.getFallbackQuestions(industry, experienceLevel, questionCount);
    }
  }

  // Analyze user's response to an interview question
  async analyzeResponse(options = {}) {
    const {
      question,
      userResponse,
      questionCategory = 'behavioral',
      userProfile = {}
    } = options;

    try {
      const startTime = Date.now();
      
      const systemPrompt = `You are an expert interview coach analyzing a candidate's response. Provide detailed feedback using these criteria:

1. Content Quality (0-100): Relevance, completeness, specificity
2. Structure (0-100): Organization, STAR method usage, clarity
3. Communication (0-100): Clarity, confidence, pace
4. Industry Knowledge (0-100): Technical accuracy, terminology
5. Overall Score (0-100): Weighted average

For behavioral questions, look for STAR method (Situation, Task, Action, Result).
For technical questions, evaluate accuracy and depth of knowledge.

Return JSON with this structure:
{
  "scores": {
    "content": 85,
    "structure": 78,
    "communication": 82,
    "industryKnowledge": 90,
    "overall": 84
  },
  "feedback": {
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "suggestions": ["suggestion1", "suggestion2"]
  },
  "analysis": {
    "usesStarMethod": true,
    "keywordUsage": ["keyword1", "keyword2"],
    "confidenceLevel": "high|medium|low",
    "specificity": "high|medium|low"
  },
  "improvementTips": ["tip1", "tip2"]
}`;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Question: ${question}\n\nUser Response: ${userResponse}\n\nCategory: ${questionCategory}` 
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const duration = Date.now() - startTime;
      logger.logApiCall('OpenAI', 'analyzeResponse', duration, true);

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logApiCall('OpenAI', 'analyzeResponse', duration, false);
      logger.error('Failed to analyze response:', error);
      
      // Return basic analysis if OpenAI fails
      return this.getFallbackAnalysis(userResponse, questionCategory);
    }
  }

  // Generate personalized coaching recommendations
  async generateCoachingRecommendations(options = {}) {
    const {
      userProfile,
      sessionHistory,
      progressData,
      weaknesses = []
    } = options;

    try {
      const startTime = Date.now();
      
      const systemPrompt = `You are an expert career coach. Analyze the user's interview performance and create personalized recommendations.

User Profile: ${JSON.stringify(userProfile)}
Recent Sessions: ${JSON.stringify(sessionHistory)}
Progress Data: ${JSON.stringify(progressData)}
Identified Weaknesses: ${weaknesses.join(', ')}

Provide recommendations in this JSON format:
{
  "immediateActions": [
    {
      "action": "action description",
      "priority": "high|medium|low",
      "timeline": "1 week|2 weeks|1 month",
      "resources": ["resource1", "resource2"]
    }
  ],
  "longTermGoals": [
    {
      "goal": "goal description",
      "targetDate": "3 months",
      "milestones": ["milestone1", "milestone2"]
    }
  ],
  "practicePlan": {
    "focusAreas": ["area1", "area2"],
    "sessionFrequency": "daily|weekly|bi-weekly",
    "sessionDuration": "15|30|45 minutes",
    "nextSessionType": "mock_interview|coaching|assessment"
  },
  "resources": {
    "articles": ["url1", "url2"],
    "videos": ["url1", "url2"],
    "tools": ["tool1", "tool2"]
  }
}`;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate personalized coaching recommendations' }
        ],
        temperature: 0.6,
        max_tokens: 2000
      });

      const duration = Date.now() - startTime;
      logger.logApiCall('OpenAI', 'generateCoachingRecommendations', duration, true);

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logApiCall('OpenAI', 'generateCoachingRecommendations', duration, false);
      logger.error('Failed to generate coaching recommendations:', error);
      
      return this.getFallbackRecommendations(weaknesses);
    }
  }

  // Analyze speech patterns and confidence
  async analyzeSpeechPatterns(transcript, metrics = {}) {
    try {
      const startTime = Date.now();
      
      const systemPrompt = `Analyze the speech patterns in this interview response. Consider speech rate, filler words, confidence indicators, and communication effectiveness.

Transcript: ${transcript}
Metrics: ${JSON.stringify(metrics)}

Return analysis in JSON format:
{
  "speechAnalysis": {
    "clarity": "high|medium|low",
    "pace": "too_fast|good|too_slow",
    "confidence": "high|medium|low",
    "fillerWords": {
      "count": 5,
      "frequency": "high|medium|low",
      "words": ["um", "uh", "like"]
    },
    "pauses": {
      "count": 3,
      "averageLength": "short|medium|long",
      "effectiveness": "good|distracting|helpful"
    }
  },
  "communicationScore": 85,
  "recommendations": [
    "Reduce filler words",
    "Speak more slowly",
    "Add more pauses for emphasis"
  ]
}`;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Analyze the speech patterns' }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      const duration = Date.now() - startTime;
      logger.logApiCall('OpenAI', 'analyzeSpeechPatterns', duration, true);

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logApiCall('OpenAI', 'analyzeSpeechPatterns', duration, false);
      logger.error('Failed to analyze speech patterns:', error);
      
      return this.getFallbackSpeechAnalysis(metrics);
    }
  }

  // Fallback methods for when OpenAI is unavailable
  getFallbackQuestions(industry, experienceLevel, count) {
    const questions = {
      behavioral: [
        "Tell me about a time when you had to work with a difficult team member.",
        "Describe a situation where you had to meet a tight deadline.",
        "Give me an example of when you had to learn something new quickly.",
        "Tell me about a time you failed and what you learned from it.",
        "Describe a project you're most proud of."
      ],
      technical: [
        "Explain your approach to debugging a complex issue.",
        "How do you ensure code quality in your projects?",
        "Describe your experience with version control systems.",
        "What's your process for code review?",
        "How do you stay updated with new technologies?"
      ]
    };

    const selectedQuestions = [];
    const categories = ['behavioral', 'technical'];
    
    for (let i = 0; i < count; i++) {
      const category = categories[i % categories.length];
      const questionText = questions[category][i % questions[category].length];
      
      selectedQuestions.push({
        id: `fallback_${i}`,
        text: questionText,
        category: category,
        difficulty: 'medium',
        expectedKeywords: [],
        evaluationCriteria: ['clarity', 'specificity', 'relevance']
      });
    }

    return selectedQuestions;
  }

  getFallbackAnalysis(response, category) {
    const wordCount = response.split(' ').length;
    const hasExamples = response.toLowerCase().includes('example') || response.toLowerCase().includes('time');
    
    return {
      scores: {
        content: Math.min(90, 60 + (wordCount / 10)),
        structure: hasExamples ? 80 : 60,
        communication: 75,
        industryKnowledge: 70,
        overall: Math.min(85, 65 + (wordCount / 15))
      },
      feedback: {
        strengths: ["Provided a response", "Engaged with the question"],
        weaknesses: ["Could be more specific", "Consider adding examples"],
        suggestions: ["Use the STAR method", "Provide more concrete examples"]
      },
      analysis: {
        usesStarMethod: false,
        keywordUsage: [],
        confidenceLevel: "medium",
        specificity: "medium"
      },
      improvementTips: ["Practice with more examples", "Work on clarity"]
    };
  }

  getFallbackRecommendations(weaknesses) {
    return {
      immediateActions: [
        {
          action: "Practice common interview questions",
          priority: "high",
          timeline: "1 week",
          resources: ["Interview prep guides", "Practice sessions"]
        }
      ],
      longTermGoals: [
        {
          goal: "Improve overall interview performance",
          targetDate: "3 months",
          milestones: ["Complete 10 practice sessions", "Improve confidence score"]
        }
      ],
      practicePlan: {
        focusAreas: weaknesses.length > 0 ? weaknesses : ["communication", "confidence"],
        sessionFrequency: "weekly",
        sessionDuration: "30 minutes",
        nextSessionType: "mock_interview"
      },
      resources: {
        articles: [],
        videos: [],
        tools: ["Interview practice app", "Recording device for self-review"]
      }
    };
  }

  getFallbackSpeechAnalysis(metrics) {
    return {
      speechAnalysis: {
        clarity: "medium",
        pace: "good",
        confidence: "medium",
        fillerWords: {
          count: metrics.fillerWords || 0,
          frequency: "medium",
          words: []
        },
        pauses: {
          count: metrics.pauseCount || 0,
          averageLength: "medium",
          effectiveness: "good"
        }
      },
      communicationScore: 75,
      recommendations: ["Continue practicing", "Focus on clarity"]
    };
  }
}

module.exports = new OpenAIService();
