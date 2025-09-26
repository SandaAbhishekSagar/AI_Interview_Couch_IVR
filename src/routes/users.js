const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { User, Session, Progress } = require('../database/models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          email: user.email,
          industry: user.industry,
          experienceLevel: user.experienceLevel,
          targetRoles: user.targetRoles,
          preferences: user.preferences,
          totalSessions: user.totalSessions,
          averageScore: user.averageScore,
          lastActiveAt: user.lastActiveAt,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email address is required'),
  body('industry')
    .optional()
    .isIn(['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'consulting', 'non-profit', 'government', 'other'])
    .withMessage('Valid industry is required'),
  body('experienceLevel')
    .optional()
    .isIn(['entry', 'mid', 'senior', 'executive'])
    .withMessage('Valid experience level is required'),
  body('targetRoles')
    .optional()
    .isArray()
    .withMessage('Target roles must be an array'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
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
    const updates = req.body;

    // Update user fields
    if (updates.name) user.name = updates.name;
    if (updates.email) user.email = updates.email;
    if (updates.industry) user.industry = updates.industry;
    if (updates.experienceLevel) user.experienceLevel = updates.experienceLevel;
    if (updates.targetRoles) user.targetRoles = updates.targetRoles;
    if (updates.preferences) user.preferences = { ...user.preferences, ...updates.preferences };

    await user.save();

    logger.info('User profile updated', { userId: user.id });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          email: user.email,
          industry: user.industry,
          experienceLevel: user.experienceLevel,
          targetRoles: user.targetRoles,
          preferences: user.preferences,
          totalSessions: user.totalSessions,
          averageScore: user.averageScore,
          lastActiveAt: user.lastActiveAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Get user sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { limit = 10, offset = 0, sessionType, status } = req.query;

    const whereClause = { userId: user.id };
    if (sessionType) whereClause.sessionType = sessionType;
    if (status) whereClause.status = status;

    const sessions = await Session.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: {
        sessions: sessions.rows,
        total: sessions.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching user sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
});

// Get user progress
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    const progress = await Progress.findByUserId(user.id);
    const overallProgress = await Progress.getOverallProgress(user.id);

    res.status(200).json({
      success: true,
      data: {
        progress: progress,
        overall: overallProgress
      }
    });
  } catch (error) {
    logger.error('Error fetching user progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress'
    });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Get session statistics
    const sessionStats = await Session.getUserStats(user.id);
    
    // Get progress data
    const overallProgress = await Progress.getOverallProgress(user.id);

    // Calculate additional stats
    const totalSessions = user.totalSessions;
    const averageScore = user.averageScore || 0;
    const improvementTrend = sessionStats.improvementTrend || [];

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalSessions,
          averageScore: Math.round(averageScore),
          currentLevel: user.experienceLevel,
          industry: user.industry
        },
        sessions: sessionStats,
        progress: overallProgress,
        trends: {
          improvement: improvementTrend,
          sessionsThisMonth: 0, // TODO: Calculate monthly sessions
          averageSessionDuration: sessionStats.averageDuration || 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Get user recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Get recent sessions for analysis
    const recentSessions = await Session.findAll({
      where: { userId: user.id, status: 'completed' },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Get progress data
    const progress = await Progress.findByUserId(user.id);

    // Identify areas needing improvement
    const weaknesses = progress
      .filter(p => (p.improvementPercentage || 0) < 10)
      .map(p => p.skillArea);

    // Generate recommendations (simplified version)
    const recommendations = {
      immediate: [
        {
          action: 'Practice behavioral questions using STAR method',
          priority: 'high',
          reason: 'Improve structured responses'
        },
        {
          action: 'Work on reducing filler words',
          priority: 'medium',
          reason: 'Enhance communication clarity'
        }
      ],
      longTerm: [
        {
          goal: 'Achieve 80+ overall interview score',
          timeline: '3 months',
          milestones: ['Complete 10 practice sessions', 'Improve confidence score']
        }
      ],
      focusAreas: weaknesses.length > 0 ? weaknesses : ['communication', 'confidence'],
      nextSession: {
        type: 'mock_interview',
        duration: 30,
        focus: weaknesses[0] || 'behavioral'
      }
    };

    res.status(200).json({
      success: true,
      data: {
        recommendations,
        basedOn: {
          totalSessions: user.totalSessions,
          averageScore: user.averageScore,
          recentPerformance: recentSessions.length > 0 ? recentSessions[0].scores : null
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendations'
    });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Deactivate user instead of deleting (for data retention)
    user.isActive = false;
    await user.save();

    logger.info('User account deactivated', { userId: user.id });

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    logger.error('Error deactivating user account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate account'
    });
  }
});

module.exports = router;
