const { User, Session, Progress } = require('./models');
const logger = require('../utils/logger');

async function seed() {
  try {
    logger.info('Starting database seeding...');

    // Check if data already exists
    const userCount = await User.count();
    if (userCount > 0) {
      logger.info('Database already has data, skipping seed');
      return;
    }

    // Create sample users
    const sampleUsers = await createSampleUsers();
    logger.info(`Created ${sampleUsers.length} sample users`);

    // Create sample sessions
    const sampleSessions = await createSampleSessions(sampleUsers);
    logger.info(`Created ${sampleSessions.length} sample sessions`);

    // Create sample progress data
    const sampleProgress = await createSampleProgress(sampleUsers);
    logger.info(`Created ${sampleProgress.length} progress records`);

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}

async function createSampleUsers() {
  const users = [
    {
      phoneNumber: '+15551234567',
      name: 'John Doe',
      email: 'john.doe@example.com',
      industry: 'technology',
      experienceLevel: 'mid',
      targetRoles: ['Software Engineer', 'Senior Developer'],
      preferences: {
        sessionDuration: 30,
        difficultyLevel: 'medium',
        focusAreas: ['behavioral', 'technical'],
        language: 'en-US'
      }
    },
    {
      phoneNumber: '+15551234568',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      industry: 'finance',
      experienceLevel: 'senior',
      targetRoles: ['Product Manager', 'VP of Product'],
      preferences: {
        sessionDuration: 45,
        difficultyLevel: 'hard',
        focusAreas: ['leadership', 'behavioral'],
        language: 'en-US'
      }
    },
    {
      phoneNumber: '+15551234569',
      name: 'Mike Johnson',
      email: 'mike.johnson@example.com',
      industry: 'healthcare',
      experienceLevel: 'entry',
      targetRoles: ['Data Analyst', 'Business Analyst'],
      preferences: {
        sessionDuration: 20,
        difficultyLevel: 'easy',
        focusAreas: ['behavioral', 'technical'],
        language: 'en-US'
      }
    }
  ];

  const createdUsers = [];
  for (const userData of users) {
    try {
      const user = await User.createUser(userData);
      createdUsers.push(user);
    } catch (error) {
      logger.error(`Error creating user ${userData.phoneNumber}:`, error);
    }
  }

  return createdUsers;
}

async function createSampleSessions(users) {
  const sessions = [];

  for (const user of users) {
    // Create 2-3 sessions per user
    const sessionCount = Math.floor(Math.random() * 2) + 2;

    for (let i = 0; i < sessionCount; i++) {
      const sessionData = {
        userId: user.id,
        sessionType: ['mock_interview', 'coaching', 'assessment'][Math.floor(Math.random() * 3)],
        industry: user.industry,
        roleLevel: user.experienceLevel,
        status: i === 0 ? 'completed' : 'completed', // All sample sessions are completed
        questions: [
          {
            id: `q1_${user.id}_${i}`,
            text: 'Tell me about yourself and your background.',
            type: 'behavioral',
            category: 'behavioral',
            timestamp: new Date().toISOString()
          },
          {
            id: `q2_${user.id}_${i}`,
            text: 'Describe a challenging project you worked on.',
            type: 'behavioral',
            category: 'behavioral',
            timestamp: new Date().toISOString()
          }
        ],
        responses: [
          {
            questionId: `q1_${user.id}_${i}`,
            text: 'I am a software engineer with 5 years of experience...',
            timestamp: new Date().toISOString(),
            duration: 45,
            transcription: 'I am a software engineer with 5 years of experience...',
            metrics: {
              speechRate: { wordsPerMinute: 150, rate: 'normal', score: 80 },
              fillerWords: { count: 2, density: 1.2, score: 85 },
              confidence: { score: 75, level: 'medium' }
            }
          },
          {
            questionId: `q2_${user.id}_${i}`,
            text: 'I worked on a complex e-commerce platform...',
            timestamp: new Date().toISOString(),
            duration: 60,
            transcription: 'I worked on a complex e-commerce platform...',
            metrics: {
              speechRate: { wordsPerMinute: 140, rate: 'normal', score: 85 },
              fillerWords: { count: 1, density: 0.8, score: 90 },
              confidence: { score: 80, level: 'high' }
            }
          }
        ],
        scores: {
          overall: Math.floor(Math.random() * 30) + 70, // 70-100
          content: Math.floor(Math.random() * 30) + 70,
          structure: Math.floor(Math.random() * 30) + 70,
          communication: Math.floor(Math.random() * 30) + 70,
          industryKnowledge: Math.floor(Math.random() * 30) + 70
        },
        metrics: {
          speechRate: Math.floor(Math.random() * 40) + 130, // 130-170
          fillerWords: Math.floor(Math.random() * 5) + 1, // 1-5
          pauseCount: Math.floor(Math.random() * 10) + 5, // 5-15
          averagePauseLength: Math.random() * 2 + 0.5, // 0.5-2.5
          confidenceLevel: Math.floor(Math.random() * 30) + 70 // 70-100
        },
        feedback: {
          strengths: ['Clear communication', 'Good examples'],
          weaknesses: ['Could use more structure', 'Reduce filler words'],
          suggestions: ['Practice STAR method', 'Speak more slowly']
        },
        duration: Math.floor(Math.random() * 20) + 10, // 10-30 minutes
        completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
      };

      try {
        const session = await Session.create(sessionData);
        sessions.push(session);
      } catch (error) {
        logger.error(`Error creating session for user ${user.id}:`, error);
      }
    }
  }

  return sessions;
}

async function createSampleProgress(users) {
  const progressRecords = [];

  for (const user of users) {
    const skillAreas = ['communication', 'content', 'structure', 'confidence', 'technical', 'behavioral'];
    
    for (const skillArea of skillAreas) {
      const baselineScore = Math.floor(Math.random() * 40) + 40; // 40-80
      const currentScore = Math.min(100, baselineScore + Math.floor(Math.random() * 20)); // Improvement
      const improvementPercentage = ((currentScore - baselineScore) / baselineScore) * 100;

      const progressData = {
        userId: user.id,
        skillArea: skillArea,
        baselineScore: baselineScore,
        currentScore: currentScore,
        targetScore: 90,
        improvementPercentage: improvementPercentage,
        practiceCount: Math.floor(Math.random() * 10) + 1,
        lastPracticedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last week
        milestones: improvementPercentage > 25 ? [
          {
            threshold: 25,
            achievedAt: new Date().toISOString(),
            score: currentScore,
            description: `Achieved 25% improvement in ${skillArea}`
          }
        ] : [],
        recommendations: [
          {
            type: 'practice',
            message: `Continue practicing ${skillArea} skills`,
            priority: 'medium',
            createdAt: new Date().toISOString()
          }
        ],
        isActive: true
      };

      try {
        const progress = await Progress.create(progressData);
        progressRecords.push(progress);
      } catch (error) {
        logger.error(`Error creating progress for user ${user.id}, skill ${skillArea}:`, error);
      }
    }
  }

  return progressRecords;
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      logger.info('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seed };
