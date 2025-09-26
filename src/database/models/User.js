const { DataTypes } = require('sequelize');
const sequelize = require('../connection');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      is: /^\+[1-9]\d{1,14}$/ // E.164 format
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'consulting', 'non-profit', 'government', 'other']]
    }
  },
  experienceLevel: {
    type: DataTypes.ENUM('entry', 'mid', 'senior', 'executive'),
    allowNull: false
  },
  targetRoles: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  preferences: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      sessionDuration: 30, // minutes
      difficultyLevel: 'medium',
      focusAreas: ['behavioral', 'technical', 'leadership'],
      language: 'en-US'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastActiveAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalSessions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  averageScore: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      // Hash any sensitive data if needed
      if (user.phoneNumber) {
        user.phoneNumber = user.phoneNumber.replace(/\s/g, '');
      }
    },
    beforeUpdate: async (user) => {
      if (user.phoneNumber) {
        user.phoneNumber = user.phoneNumber.replace(/\s/g, '');
      }
    }
  }
});

// Instance methods
User.prototype.updateLastActive = async function() {
  this.lastActiveAt = new Date();
  await this.save();
};

User.prototype.incrementSessionCount = async function() {
  this.totalSessions += 1;
  await this.save();
};

User.prototype.updateAverageScore = async function(newScore) {
  if (this.totalSessions === 0) {
    this.averageScore = newScore;
  } else {
    this.averageScore = ((this.averageScore * (this.totalSessions - 1)) + newScore) / this.totalSessions;
  }
  await this.save();
};

// Class methods
User.findByPhoneNumber = async function(phoneNumber) {
  const normalizedPhone = phoneNumber.replace(/\s/g, '');
  return await this.findOne({ where: { phoneNumber: normalizedPhone } });
};

User.createUser = async function(userData) {
  const normalizedPhone = userData.phoneNumber.replace(/\s/g, '');
  return await this.create({
    ...userData,
    phoneNumber: normalizedPhone
  });
};

module.exports = User;
