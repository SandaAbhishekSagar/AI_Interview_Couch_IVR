const express = require('express');
const router = express.Router();
const { sequelize } = require('../database/models');
const logger = require('../utils/logger');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    // Check database connection
    await sequelize.authenticate();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: 'connected',
        api: 'operational'
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };

    logger.info('Health check passed');
    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    const healthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: 'disconnected',
        api: 'operational'
      }
    };

    res.status(503).json(healthStatus);
  }
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database connection and query
    await sequelize.authenticate();
    await sequelize.query('SELECT 1');
    
    // Check environment variables
    const requiredEnvVars = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'OPENAI_API_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      responseTime: `${Date.now() - startTime}ms`,
      services: {
        database: 'connected',
        api: 'operational',
        twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not_configured',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured'
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB'
      },
      issues: missingEnvVars.length > 0 ? {
        missingEnvironmentVariables: missingEnvVars
      } : null
    };

    if (missingEnvVars.length > 0) {
      healthStatus.status = 'degraded';
    }

    logger.info('Detailed health check completed', { responseTime: Date.now() - startTime });
    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    
    const healthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: 'disconnected',
        api: 'operational'
      }
    };

    res.status(503).json(healthStatus);
  }
});

// Readiness probe
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    await sequelize.authenticate();
    
    const readiness = {
      ready: true,
      timestamp: new Date().toISOString(),
      services: {
        database: 'ready',
        api: 'ready'
      }
    };

    res.status(200).json(readiness);
  } catch (error) {
    logger.error('Readiness check failed:', error);
    
    const readiness = {
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message
    };

    res.status(503).json(readiness);
  }
});

// Liveness probe
router.get('/live', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
