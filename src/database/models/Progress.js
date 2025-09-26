const { DataTypes } = require('sequelize');
const sequelize = require('../connection');

const Progress = sequelize.define('Progress', {
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
  skillArea: {
    type: DataTypes.ENUM('communication', 'content', 'confidence', 'structure', 'technical', 'behavioral'),
    allowNull: false
  },
  baselineScore: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  currentScore: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  targetScore: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  improvementPercentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  practiceCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastPracticedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  milestones: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  recommendations: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'progress',
  timestamps: true
});

// Instance methods
Progress.prototype.updateScore = async function(newScore) {
  const oldScore = this.currentScore;
  this.currentScore = newScore;
  
  if (this.baselineScore > 0) {
    this.improvementPercentage = ((newScore - this.baselineScore) / this.baselineScore) * 100;
  }
  
  this.practiceCount += 1;
  this.lastPracticedAt = new Date();
  
  // Check for milestones
  await this.checkMilestones();
  
  await this.save();
  return oldScore;
};

Progress.prototype.checkMilestones = async function() {
  const milestones = this.milestones || [];
  const improvement = this.improvementPercentage || 0;
  
  // Define milestone thresholds
  const milestoneThresholds = [10, 25, 50, 75, 100];
  
  for (const threshold of milestoneThresholds) {
    const milestoneExists = milestones.some(m => m.threshold === threshold);
    
    if (!milestoneExists && improvement >= threshold) {
      milestones.push({
        threshold,
        achievedAt: new Date().toISOString(),
        score: this.currentScore,
        description: `Achieved ${threshold}% improvement in ${this.skillArea}`
      });
    }
  }
  
  this.milestones = milestones;
};

Progress.prototype.addRecommendation = async function(recommendation) {
  const recommendations = this.recommendations || [];
  recommendations.push({
    ...recommendation,
    createdAt: new Date().toISOString()
  });
  
  // Keep only the latest 10 recommendations
  this.recommendations = recommendations.slice(-10);
  await this.save();
};

Progress.prototype.generateRecommendations = async function() {
  const recommendations = [];
  const improvement = this.improvementPercentage || 0;
  
  if (improvement < 0) {
    recommendations.push({
      type: 'warning',
      message: `Your ${this.skillArea} score has decreased. Consider reviewing recent sessions.`,
      priority: 'high'
    });
  } else if (improvement < 10) {
    recommendations.push({
      type: 'improvement',
      message: `Focus on ${this.skillArea} to see faster improvement.`,
      priority: 'medium'
    });
  } else if (improvement >= 50) {
    recommendations.push({
      type: 'achievement',
      message: `Excellent progress in ${this.skillArea}! Keep up the great work.`,
      priority: 'low'
    });
  }
  
  // Add specific recommendations based on skill area
  switch (this.skillArea) {
    case 'communication':
      if (this.currentScore < 70) {
        recommendations.push({
          type: 'practice',
          message: 'Practice speaking more clearly and reduce filler words.',
          priority: 'high'
        });
      }
      break;
    case 'content':
      if (this.currentScore < 70) {
        recommendations.push({
          type: 'study',
          message: 'Review STAR method for better structured answers.',
          priority: 'medium'
        });
      }
      break;
    case 'confidence':
      if (this.currentScore < 70) {
        recommendations.push({
          type: 'practice',
          message: 'Practice maintaining steady pace and confident tone.',
          priority: 'high'
        });
      }
      break;
  }
  
  for (const rec of recommendations) {
    await this.addRecommendation(rec);
  }
  
  return recommendations;
};

// Class methods
Progress.findByUserId = async function(userId) {
  return await this.findAll({
    where: { userId, isActive: true },
    order: [['updatedAt', 'DESC']]
  });
};

Progress.findByUserIdAndSkill = async function(userId, skillArea) {
  return await this.findOne({
    where: { userId, skillArea, isActive: true }
  });
};

Progress.createOrUpdate = async function(userId, skillArea, score) {
  let progress = await this.findByUserIdAndSkill(userId, skillArea);
  
  if (!progress) {
    progress = await this.create({
      userId,
      skillArea,
      baselineScore: score,
      currentScore: score
    });
  } else {
    await progress.updateScore(score);
  }
  
  return progress;
};

Progress.getOverallProgress = async function(userId) {
  const progresses = await this.findByUserId(userId);
  
  const overall = {
    totalSkills: progresses.length,
    averageImprovement: 0,
    topSkill: null,
    needsImprovement: [],
    recentMilestones: []
  };
  
  if (progresses.length > 0) {
    const totalImprovement = progresses.reduce((sum, p) => sum + (p.improvementPercentage || 0), 0);
    overall.averageImprovement = totalImprovement / progresses.length;
    
    // Find top performing skill
    const sortedSkills = progresses.sort((a, b) => (b.improvementPercentage || 0) - (a.improvementPercentage || 0));
    overall.topSkill = sortedSkills[0]?.skillArea;
    
    // Find skills needing improvement
    overall.needsImprovement = progresses
      .filter(p => (p.improvementPercentage || 0) < 10)
      .map(p => p.skillArea);
    
    // Collect recent milestones
    progresses.forEach(p => {
      if (p.milestones && p.milestones.length > 0) {
        const recentMilestones = p.milestones.slice(-2); // Last 2 milestones per skill
        overall.recentMilestones.push(...recentMilestones);
      }
    });
    
    // Sort milestones by date
    overall.recentMilestones.sort((a, b) => new Date(b.achievedAt) - new Date(a.achievedAt));
    overall.recentMilestones = overall.recentMilestones.slice(0, 5); // Keep only 5 most recent
  }
  
  return overall;
};

module.exports = Progress;
