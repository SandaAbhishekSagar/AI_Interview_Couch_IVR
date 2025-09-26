const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { User } = require('../database/models');
const { generateToken, authenticateToken, authenticatePhoneNumber } = require('../middleware/auth');
const logger = require('../utils/logger');

// Register new user
router.post('/register', [
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('industry')
    .isIn(['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'consulting', 'non-profit', 'government', 'other'])
    .withMessage('Valid industry is required'),
  body('experienceLevel')
    .isIn(['entry', 'mid', 'senior', 'executive'])
    .withMessage('Valid experience level is required')
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

    const { phoneNumber, name, industry, experienceLevel, targetRoles, email } = req.body;

    // Check if user already exists
    const existingUser = await User.findByPhoneNumber(phoneNumber);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this phone number already exists'
      });
    }

    // Create new user
    const user = await User.createUser({
      phoneNumber,
      name,
      industry,
      experienceLevel,
      targetRoles: targetRoles || [],
      email: email || null
    });

    // Generate JWT token
    const token = generateToken(user.id);

    logger.info('User registered successfully', { userId: user.id, phoneNumber });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          industry: user.industry,
          experienceLevel: user.experienceLevel,
          targetRoles: user.targetRoles,
          totalSessions: user.totalSessions,
          averageScore: user.averageScore
        },
        token
      }
    });
  } catch (error) {
    logger.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
});

// Login user
router.post('/login', [
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required')
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

    const { phoneNumber } = req.body;

    // Find user by phone number
    const user = await User.findByPhoneNumber(phoneNumber);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    // Update last active timestamp
    await user.updateLastActive();

    // Generate JWT token
    const token = generateToken(user.id);

    logger.info('User logged in successfully', { userId: user.id, phoneNumber });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          industry: user.industry,
          experienceLevel: user.experienceLevel,
          targetRoles: user.targetRoles,
          totalSessions: user.totalSessions,
          averageScore: user.averageScore,
          lastActiveAt: user.lastActiveAt
        },
        token
      }
    });
  } catch (error) {
    logger.error('Error logging in user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
});

// Verify token and get user profile
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      message: 'Token verified',
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          industry: user.industry,
          experienceLevel: user.experienceLevel,
          targetRoles: user.targetRoles,
          totalSessions: user.totalSessions,
          averageScore: user.averageScore,
          lastActiveAt: user.lastActiveAt,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify token'
    });
  }
});

// Phone number authentication (for IVR system)
router.post('/phone-auth', [
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required')
], authenticatePhoneNumber, async (req, res) => {
  try {
    const user = req.user;

    // Update last active timestamp
    await user.updateLastActive();

    // Generate JWT token
    const token = generateToken(user.id);

    logger.info('Phone authentication successful', { userId: user.id, phoneNumber: user.phoneNumber });

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          industry: user.industry,
          experienceLevel: user.experienceLevel,
          targetRoles: user.targetRoles,
          totalSessions: user.totalSessions,
          averageScore: user.averageScore
        },
        token
      }
    });
  } catch (error) {
    logger.error('Error in phone authentication:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    logger.info('User logged out', { userId: user.id });

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

module.exports = router;
