const express = require('express');
const router = express.Router();
const twilioService = require('../services/twilioService');
const openaiService = require('../services/openaiService');
const voiceAnalysisService = require('../services/voiceAnalysisService');
const { User, Session } = require('../database/models');
const logger = require('../utils/logger');

// Twilio voice webhook - handles incoming calls
router.post('/voice', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    logger.info('Incoming call received', { callSid: params.callSid, from: params.from });

    // Generate welcome message and main menu
    const welcomeMessage = `Welcome to AI Interview Coaching. I'm your personal interview coach. 
      Press 1 for a mock interview, press 2 for coaching tips, or press 3 to speak to a representative. 
      What would you like to do today?`;

    const twiml = twilioService.generateTwiMLResponse({
      message: welcomeMessage,
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/menu`,
      timeout: 10
    });

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error('Error handling voice webhook:', error);
    
    const errorTwiml = twilioService.generateHangupTwiML(
      'Sorry, we are experiencing technical difficulties. Please try again later.'
    );
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// Handle menu selection
router.post('/menu', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    const userInput = params.speechResult || params.digits;
    
    logger.info('Menu selection received', { callSid: params.callSid, input: userInput });

    let response;

    if (userInput && (userInput.includes('1') || userInput.toLowerCase().includes('mock interview'))) {
      // Start mock interview
      response = await handleMockInterviewStart(params);
    } else if (userInput && (userInput.includes('2') || userInput.toLowerCase().includes('coaching'))) {
      // Provide coaching tips
      response = handleCoachingTips(params);
    } else if (userInput && (userInput.includes('3') || userInput.toLowerCase().includes('representative'))) {
      // Transfer to representative
      response = handleRepresentativeTransfer(params);
    } else {
      // Invalid selection
      response = twilioService.generateTwiMLResponse({
        message: 'I didn\'t understand that. Please press 1 for mock interview, 2 for coaching tips, or 3 for a representative.',
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/menu`,
        timeout: 10
      });
    }

    res.type('text/xml');
    res.send(response);
  } catch (error) {
    logger.error('Error handling menu selection:', error);
    
    const errorTwiml = twilioService.generateHangupTwiML(
      'Sorry, we are experiencing technical difficulties. Please try again later.'
    );
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// Start mock interview session
async function handleMockInterviewStart(params) {
  try {
    // Find or create user
    let user = await User.findByPhoneNumber(params.from);
    if (!user) {
      // Create new user
      user = await User.createUser({
        phoneNumber: params.from,
        name: 'Interview Candidate',
        industry: 'technology',
        experienceLevel: 'mid'
      });
    }

    // Create new session
    const session = await Session.create({
      userId: user.id,
      sessionType: 'mock_interview',
      industry: user.industry,
      roleLevel: user.experienceLevel,
      callSid: params.callSid,
      status: 'active'
    });

    // Generate first question
    const questions = await openaiService.generateInterviewQuestions({
      industry: user.industry,
      experienceLevel: user.experienceLevel,
      questionCount: 1
    });

    if (questions.length > 0) {
      const firstQuestion = questions[0];
      await session.addQuestion(firstQuestion);

      const message = `Great! Let's start your mock interview. Here's your first question: ${firstQuestion.text}. 
        Please take a moment to think, then provide your answer.`;

      return twilioService.generateRecordingTwiML({
        message: message,
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/response`,
        timeout: 120
      });
    } else {
      throw new Error('Failed to generate interview questions');
    }
  } catch (error) {
    logger.error('Error starting mock interview:', error);
    throw error;
  }
}

// Handle user response to interview question
router.post('/response', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    logger.info('User response received', { callSid: params.callSid });

    // Find active session
    const session = await Session.findActiveByCallSid(params.callSid);
    if (!session) {
      throw new Error('No active session found');
    }

    // Get user
    const user = await session.getUser();

    if (params.recordingUrl) {
      // Process recorded response
      await processRecordedResponse(session, user, params);
    } else if (params.transcriptionText) {
      // Process transcribed response
      await processTranscribedResponse(session, user, params);
    }

    // Generate next question or end session
    const nextQuestion = await generateNextQuestion(session, user);
    
    let twiml;
    if (nextQuestion) {
      const message = `Thank you for that answer. Here's your next question: ${nextQuestion.text}. 
        Please provide your response.`;
      
      twiml = twilioService.generateRecordingTwiML({
        message: message,
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/response`,
        timeout: 120
      });
    } else {
      // End session
      await endMockInterview(session, user);
      const message = `Thank you for completing the mock interview. Your session has been analyzed and feedback will be provided. Have a great day!`;
      twiml = twilioService.generateHangupTwiML(message);
    }

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error('Error handling user response:', error);
    
    const errorTwiml = twilioService.generateHangupTwiML(
      'Sorry, we encountered an error processing your response. Please try again later.'
    );
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// Process recorded response
async function processRecordedResponse(session, user, params) {
  try {
    // Get transcription from recording
    const recordings = await twilioService.getCallRecordings(params.callSid);
    if (recordings.length > 0) {
      const transcription = await twilioService.getTranscription(recordings[0].sid);
      
      if (transcription && transcription.transcriptionText) {
        await processTranscribedResponse(session, user, {
          ...params,
          transcriptionText: transcription.transcriptionText
        });
      }
    }
  } catch (error) {
    logger.error('Error processing recorded response:', error);
  }
}

// Process transcribed response
async function processTranscribedResponse(session, user, params) {
  try {
    const transcript = params.transcriptionText;
    const responses = session.responses || [];
    const questions = session.questions || [];
    
    if (responses.length >= questions.length) {
      logger.warn('More responses than questions - skipping processing');
      return;
    }

    const currentQuestion = questions[responses.length];
    
    // Analyze response using OpenAI
    const analysis = await openaiService.analyzeResponse({
      question: currentQuestion.text,
      userResponse: transcript,
      questionCategory: currentQuestion.category,
      userProfile: user
    });

    // Analyze voice patterns
    const voiceAnalysis = voiceAnalysisService.analyzeVoice(transcript, 30);

    // Add response to session
    await session.addResponse({
      questionId: currentQuestion.id,
      text: transcript,
      timestamp: new Date().toISOString(),
      duration: 30, // Estimated duration
      transcription: transcript,
      metrics: voiceAnalysis
    });

    // Update session scores
    await session.updateScores(analysis.scores);
    await session.updateMetrics(voiceAnalysis.metrics);
    await session.updateFeedback(analysis.feedback);

    logger.info('Response processed successfully', {
      sessionId: session.id,
      questionId: currentQuestion.id,
      scores: analysis.scores
    });
  } catch (error) {
    logger.error('Error processing transcribed response:', error);
  }
}

// Generate next question
async function generateNextQuestion(session, user) {
  try {
    const questions = session.questions || [];
    const responses = session.responses || [];
    
    // Check if we have enough questions (limit to 5 for phone interview)
    if (questions.length >= 5) {
      return null;
    }

    // Generate next question
    const newQuestions = await openaiService.generateInterviewQuestions({
      industry: user.industry,
      experienceLevel: user.experienceLevel,
      questionCount: 1,
      previousQuestions: questions.map(q => q.text),
      focusAreas: ['behavioral', 'technical']
    });

    if (newQuestions.length > 0) {
      const nextQuestion = newQuestions[0];
      await session.addQuestion(nextQuestion);
      return nextQuestion;
    }

    return null;
  } catch (error) {
    logger.error('Error generating next question:', error);
    return null;
  }
}

// End mock interview session
async function endMockInterview(session, user) {
  try {
    // Complete session
    await session.completeSession();
    
    // Update user stats
    await user.incrementSessionCount();
    
    // Calculate average score
    const overallScore = session.scores?.overall || 0;
    if (overallScore > 0) {
      await user.updateAverageScore(overallScore);
    }

    logger.info('Mock interview session completed', {
      sessionId: session.id,
      userId: user.id,
      finalScore: overallScore
    });
  } catch (error) {
    logger.error('Error ending mock interview:', error);
  }
}

// Handle coaching tips request
function handleCoachingTips(params) {
  const tipsMessage = `Here are some interview coaching tips: 
    1. Use the STAR method for behavioral questions - Situation, Task, Action, Result.
    2. Prepare specific examples from your experience.
    3. Practice speaking clearly and at a good pace.
    4. Listen carefully to the question and ask for clarification if needed.
    5. Show enthusiasm and confidence in your answers.
    Would you like to start a mock interview to practice these tips? Say yes to continue or no to return to the main menu.`;

  return twilioService.generateTwiMLResponse({
    message: tipsMessage,
    action: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-followup`,
    timeout: 15
  });
}

// Handle coaching follow-up
router.post('/coaching-followup', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    const userInput = params.speechResult || params.digits;
    
    if (userInput && (userInput.toLowerCase().includes('yes') || userInput.includes('1'))) {
      // Start mock interview
      const response = await handleMockInterviewStart(params);
      res.type('text/xml');
      res.send(response);
    } else {
      // Return to main menu
      const message = 'Returning to the main menu. Press 1 for a mock interview, 2 for coaching tips, or 3 for a representative.';
      const twiml = twilioService.generateTwiMLResponse({
        message: message,
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/menu`,
        timeout: 10
      });
      
      res.type('text/xml');
      res.send(twiml);
    }
  } catch (error) {
    logger.error('Error handling coaching follow-up:', error);
    
    const errorTwiml = twilioService.generateHangupTwiML(
      'Sorry, we are experiencing technical difficulties. Please try again later.'
    );
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// Handle representative transfer
function handleRepresentativeTransfer(params) {
  const message = 'I\'m transferring you to a representative. Please hold while I connect you.';
  
  const twiml = new (require('twilio')).twiml.VoiceResponse();
  twiml.say(message);
  // In a real implementation, you would dial a phone number here
  // twiml.dial('+1234567890');
  twiml.hangup();
  
  return twiml.toString();
}

// Handle call status updates
router.post('/status', (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    logger.info('Call status update received', {
      callSid: params.callSid,
      status: params.callStatus
    });

    // Update session status if needed
    if (params.callStatus === 'completed' || params.callStatus === 'failed') {
      // Find and update session
      Session.findActiveByCallSid(params.callSid).then(session => {
        if (session) {
          session.status = params.callStatus === 'completed' ? 'completed' : 'failed';
          session.save();
        }
      }).catch(error => {
        logger.error('Error updating session status:', error);
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error handling call status update:', error);
    res.status(500).send('Error');
  }
});

module.exports = router;
