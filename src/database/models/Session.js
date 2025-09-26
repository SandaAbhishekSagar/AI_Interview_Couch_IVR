const { DataTypes } = require('sequelize');
const sequelize = require('../connection');

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  sessionType: {
    type: DataTypes.ENUM('mock_interview', 'coaching', 'assessment', 'practice'),
    allowNull: false
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: false
  },
  roleLevel: {
    type: DataTypes.ENUM('entry', 'mid', 'senior', 'executive'),
    allowNull: false
  },
  callSid: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'abandoned', 'failed'),
    defaultValue: 'active'
  },
  questions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  responses: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  feedback: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  scores: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      overall: 0,
      communication: 0,
      content: 0,
      confidence: 0,
      structure: 0
    }
  },
  metrics: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      speechRate: 0,
      fillerWords: 0,
      pauseCount: 0,
      averagePauseLength: 0,
      confidenceLevel: 0
    }
  },
  duration: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: true
  },
  recordingUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'sessions',
  timestamps: true
});

// Instance methods
Session.prototype.addQuestion = async function(question) {
  const questions = this.questions || [];
  questions.push({
    id: question.id,
    text: question.text,
    type: question.type,
    category: question.category,
    timestamp: new Date().toISOString()
  });
  this.questions = questions;
  await this.save();
};

Session.prototype.addResponse = async function(response) {
  const responses = this.responses || [];
  responses.push({
    questionId: response.questionId,
    text: response.text,
    timestamp: response.timestamp,
    duration: response.duration,
    transcription: response.transcription,
    metrics: response.metrics || {}
  });
  this.responses = responses;
  await this.save();
};

Session.prototype.updateFeedback = async function(feedback) {
  this.feedback = {
    ...this.feedback,
    ...feedback,
    updatedAt: new Date().toISOString()
  };
  await this.save();
};

Session.prototype.updateScores = async function(scores) {
  this.scores = {
    ...this.scores,
    ...scores,
    updatedAt: new Date().toISOString()
  };
  await this.save();
};

Session.prototype.updateMetrics = async function(metrics) {
  this.metrics = {
    ...this.metrics,
    ...metrics,
    updatedAt: new Date().toISOString()
  };
  await this.save();
};

Session.prototype.completeSession = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  await this.save();
};

// Class methods
Session.findActiveByCallSid = async function(callSid) {
  return await this.findOne({
    where: {
      callSid: callSid,
      status: 'active'
    }
  });
};

Session.findByUserId = async function(userId, limit = 10) {
  return await this.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit
  });
};

Session.getUserStats = async function(userId) {
  const sessions = await this.findAll({
    where: { userId, status: 'completed' }
  });

  const stats = {
    totalSessions: sessions.length,
    averageScore: 0,
    averageDuration: 0,
    improvementTrend: [],
    strengths: [],
    weaknesses: []
  };

  if (sessions.length > 0) {
    const totalScore = sessions.reduce((sum, session) => sum + (session.scores?.overall || 0), 0);
    const totalDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    
    stats.averageScore = totalScore / sessions.length;
    stats.averageDuration = totalDuration / sessions.length;
    
    // Calculate improvement trend (last 5 sessions)
    const recentSessions = sessions.slice(0, 5);
    stats.improvementTrend = recentSessions.map(session => ({
      date: session.completedAt,
      score: session.scores?.overall || 0
    }));
  }

  return stats;
};

module.exports = Session;
