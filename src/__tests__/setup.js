// Test setup file
const { sequelize } = require('../database/models');

// Global test setup
beforeAll(async () => {
  // Setup test database connection
  if (process.env.NODE_ENV !== 'test') {
    process.env.NODE_ENV = 'test';
  }
});

afterAll(async () => {
  // Close database connections
  await sequelize.close();
});

// Mock external services for testing
jest.mock('../services/twilioService', () => ({
  generateTwiMLResponse: jest.fn(() => '<Response>Mock TwiML</Response>'),
  parseWebhookParams: jest.fn(() => ({
    callSid: 'test-call-sid',
    from: '+1234567890',
    speechResult: 'test response'
  })),
  getCallDetails: jest.fn(),
  getCallRecordings: jest.fn(),
  getTranscription: jest.fn()
}));

jest.mock('../services/openaiService', () => ({
  generateInterviewQuestions: jest.fn(() => [
    {
      id: 'test-question-1',
      text: 'Tell me about yourself',
      category: 'behavioral',
      difficulty: 'medium'
    }
  ]),
  analyzeResponse: jest.fn(() => ({
    scores: {
      overall: 85,
      content: 80,
      structure: 85,
      communication: 90
    },
    feedback: {
      strengths: ['Good communication'],
      weaknesses: ['Could be more specific'],
      suggestions: ['Use more examples']
    }
  })),
  generateCoachingRecommendations: jest.fn(() => ({
    immediateActions: [],
    longTermGoals: [],
    practicePlan: { focusAreas: ['communication'] }
  }))
}));

// Mock logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  logRequest: jest.fn(),
  logError: jest.fn(),
  logApiCall: jest.fn()
}));
