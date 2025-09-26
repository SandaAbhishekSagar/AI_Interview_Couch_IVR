const sequelize = require('../connection');
const User = require('./User');
const Session = require('./Session');
const Progress = require('./Progress');

// Define associations
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Progress, { foreignKey: 'userId', as: 'progress' });
Progress.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Session,
  Progress
};
