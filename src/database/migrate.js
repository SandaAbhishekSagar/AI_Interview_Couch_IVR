const { sequelize, User, Session, Progress } = require('./models');
const logger = require('../utils/logger');

async function migrate() {
  try {
    logger.info('Starting database migration...');
    
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync all models (create tables if they don't exist)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database models synchronized successfully');

    // Create indexes for better performance
    await createIndexes();
    logger.info('Database indexes created successfully');

    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Database migration failed:', error);
    throw error;
  }
}

async function createIndexes() {
  try {
    // Create indexes for better query performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
      CREATE INDEX IF NOT EXISTS idx_users_industry ON users(industry);
      CREATE INDEX IF NOT EXISTS idx_users_experience_level ON users(experience_level);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_call_sid ON sessions(call_sid);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(session_type);
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_progress_skill_area ON progress(skill_area);
      CREATE INDEX IF NOT EXISTS idx_progress_updated_at ON progress(updated_at);
    `);
  } catch (error) {
    logger.error('Error creating indexes:', error);
    // Don't throw error for index creation failures
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrate, createIndexes };
