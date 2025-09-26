const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { User, Session, Progress } = require('../database/models');
const { authenticateToken } = require('../middleware/auth');
const openaiService = require('../services/openaiService');
const voiceAnalysisService = require('../services/voiceAnalysisService');
const logger = require('../utils/logger');

// Start new session
router.post('/start', authenticateToken, [
  body('sessionType')
    .isIn(['mock_interview', 'coaching', 'assessment', 'practice'])
    .withMessage('Valid session type is required'),
  body('industry')
    .optional()
    .isIn(['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'consulting', 'non-profit', 'government', 'other']),
  body('roleLevel')
    .optional()
    .isIn(['entry', 'mid', 'senior', 'executive'])
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = req.user;
    const { sessionType, industry, roleLevel, callSid } = req.body;

    // Create new session
    const session = await Session.create({
      userId: user.id,
      sessionType: sessionType,
      industry: industry || user.industry,
      roleLevel: roleLevel || user.experienceLevel,
      callSid: callSid || null,
      status: 'active'
    });

    // Generate initial questions if it's a mock interview
    let questions = [];
    if (sessionType === 'mock_interview') {
      questions = await openaiService.generateInterviewQuestions({
        industry: session.industry,
        experienceLevel: session.roleLevel,
        questionCount: 5
      });

      // Add questions to session
      for (const question of questions) {
        await session.addQuestion(question);
      }
    }

    logger.info('Session started', { sessionId: session.id, userId: user.id, sessionType });

    res.status(201).json({
      success: true,
      message: 'Session started successfully',
      data: {
        session: {
          id: session.id,
          sessionType: session.sessionType,
          industry: session.industry,
          roleLevel: session.roleLevel,
          status: session.status,
          questions: questions,
          createdAt: session.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Error starting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start session'
    });
  }
});

// Submit response to session
router.post('/:sessionId/response', authenticateToken, [
  body('questionId')
    .isUUID()
    .withMessage('Valid question ID is required'),
  body('text')
    .isLength({ min: 10 })
    .withMessage('Response must be at least 10 characters'),
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = req.user;
    const { sessionId } = req.params;
    const { questionId, text, duration = 30, transcription } = req.body;

    // Find session
    const session = await Session.findByPk(sessionId);
    if (!session || session.userId !== user.id) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Session is not active'
      });
    }

    // Find the question
    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    // Analyze voice patterns
    const voiceAnalysis = voiceAnalysisService.analyzeVoice(text, duration);

    // Analyze response content
    const analysis = await openaiService.analyzeResponse({
      question: question.text,
      userResponse: text,
      questionCategory: question.category,
      userProfile: user
    });

    // Add response to session
    await session.addResponse({
      questionId: questionId,
      text: text,
      timestamp: new Date().toISOString(),
      duration: duration,
      transcription: transcription || text,
      metrics: voiceAnalysis
    });

    // Update session scores
    await session.updateScores(analysis.scores);
    await session.updateMetrics(voiceAnalysis.metrics);
    await session.updateFeedback(analysis.feedback);

    // Update progress tracking
    await updateUserProgress(user.id, analysis.scores, voiceAnalysis);

    logger.info('Response submitted', { 
      sessionId: session.id, 
      questionId: questionId,
      scores: analysis.scores 
    });

    res.status(200).json({
      success: true,
      message: 'Response submitted successfully',
      data: {
        analysis: {
          scores: analysis.scores,
          feedback: analysis.feedback,
          voiceAnalysis: voiceAnalysis.overall
        },
        nextQuestion: getNextQuestion(session, questionId)
      }
    });
  } catch (error) {
    logger.error('Error submitting response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit response'
    });
  }
});

// Complete session
router.post('/:sessionId/complete', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { sessionId } = req.params;

    // Find session
    const session = await Session.findByPk(sessionId);
    if (!session || session.userId !== user.id) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Session is not active'
      });
    }

    // Complete session
    await session.completeSession();

    // Update user stats
    await user.incrementSessionCount();
    
    const overallScore = session.scores?.overall || 0;
    if (overallScore > 0) {
      await user.updateAverageScore(overallScore);
    }

    // Generate session summary
    const summary = await generateSessionSummary(session, user);

    logger.info('Session completed', { 
      sessionId: session.id, 
      userId: user.id,
      finalScore: overallScore 
    });

    res.status(200).json({
      success: true,
      message: 'Session completed successfully',
      data: {
        session: {
          id: session.id,
          status: session.status,
          completedAt: session.completedAt,
          duration: session.duration,
          scores: session.scores
        },
        summary
      }
    });
  } catch (error) {
    logger.error('Error completing session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete session'
    });
  }
});

// Get session details
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { sessionId } = req.params;

    // Find session
    const session = await Session.findByPk(sessionId);
    if (!session || session.userId !== user.id) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          sessionType: session.sessionType,
          industry: session.industry,
          roleLevel: session.roleLevel,
          status: session.status,
          questions: session.questions,
          responses: session.responses,
          scores: session.scores,
          metrics: session.metrics,
          feedback: session.feedback,
          duration: session.duration,
          createdAt: session.createdAt,
          completedAt: session.completedAt
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching session details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session details'
    });
  }
});

// Get session analytics
router.get('/:sessionId/analytics', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { sessionId } = req.params;

    // Find session
    const session = await Session.findByPk(sessionId);
    if (!session || session.userId !== user.id) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Generate analytics
    const analytics = {
      performance: {
        overallScore: session.scores?.overall || 0,
        breakdown: {
          content: session.scores?.content || 0,
          structure: session.scores?.structure || 0,
          communication: session.scores?.communication || 0,
          industryKnowledge: session.scores?.industryKnowledge || 0
        }
      },
      voiceMetrics: {
        speechRate: session.metrics?.speechRate || 0,
        fillerWords: session.metrics?.fillerWords || 0,
        confidence: session.metrics?.confidenceLevel || 0,
        clarity: session.metrics?.clarity || 0
      },
      progress: {
        questionsAnswered: session.responses?.length || 0,
        totalQuestions: session.questions?.length || 0,
        completionRate: session.questions?.length > 0 ? 
          (session.responses?.length / session.questions.length) * 100 : 0
      },
      insights: generateSessionInsights(session),
      recommendations: await generateSessionRecommendations(session, user)
    };

    res.status(200).json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    logger.error('Error fetching session analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session analytics'
    });
  }
});

// Helper functions
async function updateUserProgress(userId, scores, voiceAnalysis) {
  try {
    // Update progress for each skill area
    const skillAreas = [
      { area: 'content', score: scores.content },
      { area: 'structure', score: scores.structure },
      { area: 'communication', score: scores.communication },
      { area: 'confidence', score: voiceAnalysis.confidence.score }
    ];

    for (const { area, score } of skillAreas) {
      await Progress.createOrUpdate(userId, area, score);
    }
  } catch (error) {
    logger.error('Error updating user progress:', error);
  }
}

function getNextQuestion(session, currentQuestionId) {
  const questions = session.questions || [];
  const responses = session.responses || [];
  
  if (responses.length >= questions.length) {
    return null; // No more questions
  }

  return questions[responses.length];
}

async function generateSessionSummary(session, user) {
  try {
    const responses = session.responses || [];
    const scores = session.scores || {};
    
    return {
      totalQuestions: session.questions?.length || 0,
      questionsAnswered: responses.length,
      averageScore: scores.overall || 0,
      strengths: identifyStrengths(scores),
      areasForImprovement: identifyWeaknesses(scores),
      keyInsights: generateKeyInsights(session),
      nextSteps: await generateNextSteps(user, scores)
    };
  } catch (error) {
    logger.error('Error generating session summary:', error);
    return {
      totalQuestions: 0,
      questionsAnswered: 0,
      averageScore: 0,
      strengths: [],
      areasForImprovement: [],
      keyInsights: [],
      nextSteps: []
    };
  }
}

function identifyStrengths(scores) {
  const strengths = [];
  const scoreThreshold = 80;

  if (scores.content >= scoreThreshold) strengths.push('Content Quality');
  if (scores.structure >= scoreThreshold) strengths.push('Answer Structure');
  if (scores.communication >= scoreThreshold) strengths.push('Communication');
  if (scores.industryKnowledge >= scoreThreshold) strengths.push('Industry Knowledge');

  return strengths;
}

function identifyWeaknesses(scores) {
  const weaknesses = [];
  const improvementThreshold = 70;

  if (scores.content < improvementThreshold) weaknesses.push('Content Quality');
  if (scores.structure < improvementThreshold) weaknesses.push('Answer Structure');
  if (scores.communication < improvementThreshold) weaknesses.push('Communication');
  if (scores.industryKnowledge < improvementThreshold) weaknesses.push('Industry Knowledge');

  return weaknesses;
}

function generateKeyInsights(session) {
  const insights = [];
  const scores = session.scores || {};
  const metrics = session.metrics || {};

  if (scores.overall >= 80) {
    insights.push('Excellent overall performance');
  } else if (scores.overall >= 60) {
    insights.push('Good performance with room for improvement');
  } else {
    insights.push('Focus on fundamental interview skills');
  }

  if (metrics.fillerWords > 5) {
    insights.push('Consider reducing filler words for better clarity');
  }

  if (metrics.confidenceLevel < 70) {
    insights.push('Work on building confidence in responses');
  }

  return insights;
}

async function generateNextSteps(user, scores) {
  const nextSteps = [];

  if (scores.content < 70) {
    nextSteps.push('Practice using the STAR method for behavioral questions');
  }

  if (scores.structure < 70) {
    nextSteps.push('Focus on organizing answers with clear beginning, middle, and end');
  }

  if (scores.communication < 70) {
    nextSteps.push('Practice speaking clearly and at an appropriate pace');
  }

  if (scores.industryKnowledge < 70) {
    nextSteps.push('Review industry-specific knowledge and terminology');
  }

  return nextSteps;
}

function generateSessionInsights(session) {
  const insights = [];
  const scores = session.scores || {};
  const metrics = session.metrics || {};

  // Performance insights
  if (scores.overall >= 85) {
    insights.push({ type: 'success', message: 'Outstanding performance!' });
  } else if (scores.overall >= 70) {
    insights.push({ type: 'good', message: 'Good performance with room for growth' });
  } else {
    insights.push({ type: 'improvement', message: 'Focus on core interview skills' });
  }

  // Voice insights
  if (metrics.speechRate > 180) {
    insights.push({ type: 'tip', message: 'Consider speaking more slowly for clarity' });
  } else if (metrics.speechRate < 120) {
    insights.push({ type: 'tip', message: 'Try to increase your speaking pace slightly' });
  }

  if (metrics.fillerWords > 5) {
    insights.push({ type: 'improvement', message: 'Work on reducing filler words like "um" and "uh"' });
  }

  return insights;
}

async function generateSessionRecommendations(session, user) {
  try {
    const scores = session.scores || {};
    const weaknesses = [];

    if (scores.content < 70) weaknesses.push('content');
    if (scores.structure < 70) weaknesses.push('structure');
    if (scores.communication < 70) weaknesses.push('communication');
    if (scores.industryKnowledge < 70) weaknesses.push('industry knowledge');

    if (weaknesses.length > 0) {
      return await openaiService.generateCoachingRecommendations({
        userProfile: user,
        sessionHistory: [session],
        weaknesses
      });
    }

    return {
      immediateActions: [],
      longTermGoals: [],
      practicePlan: {
        focusAreas: ['maintenance'],
        sessionFrequency: 'weekly',
        sessionDuration: '30 minutes'
      },
      resources: {
        articles: [],
        videos: [],
        tools: []
      }
    };
  } catch (error) {
    logger.error('Error generating session recommendations:', error);
    return {
      immediateActions: [{ action: 'Continue practicing regularly', priority: 'medium', timeline: 'ongoing' }],
      longTermGoals: [],
      practicePlan: { focusAreas: ['general'], sessionFrequency: 'weekly', sessionDuration: '30 minutes' },
      resources: { articles: [], videos: [], tools: [] }
    };
  }
}

module.exports = router;
