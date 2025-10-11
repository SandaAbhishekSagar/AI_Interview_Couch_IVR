const express = require('express');
const router = express.Router();
const twilioService = require('../services/twilioService');
const openaiService = require('../services/openaiService');
const voiceAnalysisService = require('../services/voiceAnalysisService');
const { User, Session } = require('../database/models');
const logger = require('../utils/logger');

// GET handler for testing (browser access)
router.get('/voice', (req, res) => {
  res.json({
    message: 'Voice webhook is working!',
    note: 'This endpoint accepts POST requests from Twilio',
    test: 'Make a call to your Twilio number to test the actual functionality',
    configured_url: `${process.env.WEBHOOK_BASE_URL}/webhook/voice`,
    method: 'POST',
    status: 'Ready to receive calls'
  });
});

// Twilio voice webhook - handles incoming calls
router.post('/voice', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    logger.info('Incoming call received', { callSid: params.callSid, from: params.from });

    // Generate welcome message and main menu
    const welcomeMessage = `Welcome to AI Interview Coaching. I'm your personal interview coach. 
      Press 1 for a mock interview, press 2 for coaching tips, or press 3 to speak to a representative. 
      What would you like to do today?`;

    const twiml = await twilioService.generateTwiMLResponse({
      message: welcomeMessage,
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/menu`,
      timeout: 10
    });

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error('Error handling voice webhook:', error);
    
    const errorTwiml = await twilioService.generateHangupTwiML(
      'Sorry, we are experiencing technical difficulties. Please try again later.'
    );
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// GET handler for menu endpoint (testing)
router.get('/menu', (req, res) => {
  res.json({
    message: 'Menu webhook is working!',
    note: 'This endpoint accepts POST requests from Twilio after voice webhook',
    method: 'POST'
  });
});

// Handle menu selection
router.post('/menu', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    const userInput = params.speechResult || params.digits;
    
    logger.info('Menu selection received', { callSid: params.callSid, input: userInput });

    // Set timeout to respond within 8 seconds
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.error('Menu processing timeout - responding with default');
        const defaultTwiml = new (require('twilio')).twiml.VoiceResponse();
        defaultTwiml.say('Please hold.');
        res.type('text/xml');
        res.send(defaultTwiml.toString());
      }
    }, 8000);

    let response;

    if (userInput && (userInput.includes('1') || userInput.toLowerCase().includes('mock interview'))) {
      // Start mock interview - RESPOND IMMEDIATELY with redirect
      response = await twilioService.generateTwiMLResponse({
        message: 'Great! Let me start your mock interview. Please hold while I prepare your first question.',
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/start-interview?from=${params.from}&callSid=${params.callSid}`,
        timeout: 1,
        redirect: true // Use redirect instead of gather
      });
      
      // Process setup in background (don't await)
      setupMockInterviewAsync(params).catch(err => {
        logger.error('Failed to setup mock interview:', err);
      });
      
    } else if (userInput && (userInput.includes('2') || userInput.toLowerCase().includes('coaching'))) {
      // Start coaching session - RESPOND IMMEDIATELY with redirect
      response = await twilioService.generateTwiMLResponse({
        message: 'Great! Let me start your coaching session. Please hold while I prepare.',
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/start-coaching?from=${params.from}&callSid=${params.callSid}`,
        timeout: 1,
        redirect: true // Use redirect instead of gather
      });
      
      // Process setup in background
      setupCoachingAsync(params).catch(err => {
        logger.error('Failed to setup coaching:', err);
      });
      
    } else if (userInput && (userInput.includes('3') || userInput.toLowerCase().includes('representative'))) {
      // Transfer to representative
      response = handleRepresentativeTransfer(params);
    } else {
      // Invalid selection or timeout - repeat menu
      const twiml = new (require('twilio')).twiml.VoiceResponse();
      twiml.say({ voice: 'alice' }, 'I didn\'t understand that. Let me repeat the options. Press 1 for a mock interview, press 2 for coaching tips, or press 3 to speak to a representative.');
      twiml.gather({
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/menu`,
        timeout: 15,
        input: ['speech', 'dtmf']
      });
      response = twiml.toString();
    }

    clearTimeout(timeout);
    if (!res.headersSent) {
      res.type('text/xml');
      res.send(response);
    }
  } catch (error) {
    logger.error('Error handling menu selection:', error);
    
    // Quick response - don't hang up
    if (!res.headersSent) {
      const errorTwiml = await twilioService.generateTwiMLResponse({
        message: 'Let me start your mock interview.',
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/menu`,
        timeout: 1
      });
      
      res.type('text/xml');
      res.send(errorTwiml);
    }
  }
});

// Setup mock interview in background (async)
async function setupMockInterviewAsync(params) {
  try {
    logger.info('Setting up mock interview in background');
    
    // Find or create user
    let user = await User.findByPhoneNumber(params.from);
    if (!user) {
      user = await User.createUser({
        phoneNumber: params.from,
        name: 'Interview Candidate',
        industry: 'technology',
        experienceLevel: 'mid'
      });
    }

    // Create new session
    await Session.create({
      userId: user.id,
      sessionType: 'mock_interview',
      industry: user.industry,
      roleLevel: user.experienceLevel,
      callSid: params.callSid,
      status: 'active'
    });
    
    logger.info('Mock interview setup complete');
  } catch (error) {
    logger.error('Error in background mock interview setup:', error);
  }
}

// Setup coaching in background (async)
async function setupCoachingAsync(params) {
  try {
    logger.info('Setting up coaching session in background');
    
    // Find or create user
    let user = await User.findByPhoneNumber(params.from);
    if (!user) {
      user = await User.createUser({
        phoneNumber: params.from,
        name: 'Interview Candidate',
        industry: 'technology',
        experienceLevel: 'mid'
      });
    }

    // Create coaching session
    await Session.create({
      userId: user.id,
      sessionType: 'coaching',
      industry: user.industry,
      roleLevel: user.experienceLevel,
      callSid: params.callSid,
      status: 'active'
    });
    
    logger.info('Coaching setup complete');
  } catch (error) {
    logger.error('Error in background coaching setup:', error);
  }
}

// New endpoint to start interview after setup
router.post('/start-interview', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    const callSid = params.callSid || req.query.callSid;
    const from = params.from || req.query.from;
    
    logger.info('Starting interview', { callSid, from });

    // Find or create user
    let user = await User.findByPhoneNumber(from);
    if (!user) {
      user = await User.createUser({
        phoneNumber: from,
        name: 'Interview Candidate',
        industry: 'technology',
        experienceLevel: 'mid'
      });
    }

    // Find or create session
    let session = await Session.findActiveByCallSid(callSid);
    if (!session) {
      session = await Session.create({
        userId: user.id,
        sessionType: 'mock_interview',
        industry: user.industry,
        roleLevel: user.experienceLevel,
        callSid: callSid,
        status: 'active'
      });
    }

    // Generate first question
    const questions = await openaiService.generateInterviewQuestions({
      industry: user.industry,
      experienceLevel: user.experienceLevel,
      questionCount: 1
    });

    if (questions.length > 0) {
      const firstQuestion = questions[0];
      await session.addQuestion(firstQuestion);

      const message = `Here's your first question: ${firstQuestion.text}. Please take a moment to think, then provide your answer.`;

      const twiml = await twilioService.generateRecordingTwiML({
        message: message,
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/response`,
        timeout: 120,
        finishOnKey: '#',
        timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/response-timeout`
      });
      
      res.type('text/xml');
      res.send(twiml);
    } else {
      throw new Error('Failed to generate interview questions');
    }
  } catch (error) {
    logger.error('Error starting interview:', error);
    
    const errorTwiml = await twilioService.generateRecordingTwiML({
      message: 'Here\'s your first question: Tell me about yourself. Please provide your response.',
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/response`,
      timeout: 120,
      finishOnKey: '#'
    });
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// New endpoint to start coaching after setup
router.post('/start-coaching', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    const callSid = params.callSid || req.query.callSid;
    const from = params.from || req.query.from;
    
    logger.info('Starting coaching session', { callSid, from });

    // Find or create user
    let user = await User.findByPhoneNumber(from);
    if (!user) {
      user = await User.createUser({
        phoneNumber: from,
        name: 'Interview Candidate',
        industry: 'technology',
        experienceLevel: 'mid'
      });
    }

    // Find or create session
    let session = await Session.findActiveByCallSid(callSid);
    if (!session) {
      session = await Session.create({
        userId: user.id,
        sessionType: 'coaching',
        industry: user.industry,
        roleLevel: user.experienceLevel,
        callSid: callSid,
        status: 'active'
      });
    }

    // Generate coaching questions
    const coachingQuestions = await generateCoachingQuestions(user);
    if (coachingQuestions.length > 0) {
      const firstQuestion = coachingQuestions[0];
      await session.addQuestion(firstQuestion);

      const message = `Here's your first question: ${firstQuestion.text}. Please provide your response.`;

      const twiml = await twilioService.generateRecordingTwiML({
        message: message,
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-response`,
        timeout: 120,
        finishOnKey: '#',
        timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-timeout`
      });
      
      res.type('text/xml');
      res.send(twiml);
    } else {
      throw new Error('Failed to generate coaching questions');
    }
  } catch (error) {
    logger.error('Error starting coaching:', error);
    
    const errorTwiml = await twilioService.generateRecordingTwiML({
      message: 'Here\'s your first question: Tell me about yourself. Please provide your response.',
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-response`,
      timeout: 120,
      finishOnKey: '#'
    });
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

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

    // IMPORTANT: Respond to Twilio immediately to avoid timeout
    // Use redirect to continue after processing
    const processingMessage = 'Thank you for that answer. Please hold while I prepare your next question.';
    const twiml = await twilioService.generateTwiMLResponse({
      message: processingMessage,
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/continue-interview?callSid=${params.callSid}`,
      timeout: 1 // Very short timeout to immediately redirect
    });

    res.type('text/xml');
    res.send(twiml);

    // Process response asynchronously (don't await)
    processResponseAsync(session, user, params).catch(error => {
      logger.error('Async response processing failed:', error);
    });

  } catch (error) {
    logger.error('Error handling user response:', error);
    
    // Quick error response
    const errorTwiml = await twilioService.generateTwiMLResponse({
      message: 'Let me continue with your next question.',
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/continue-interview?callSid=${req.body.CallSid}`,
      timeout: 1
    });
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// New endpoint to continue interview after processing
router.post('/continue-interview', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const params = twilioService.parseWebhookParams(req);
    const callSid = params.callSid || req.query.callSid;
    
    logger.info('Continuing interview', { callSid });

    // Find active session
    const session = await Session.findActiveByCallSid(callSid);
    if (!session) {
      throw new Error('No active session found');
    }

    // Get user
    const user = await session.getUser();

    // Check how many questions we have
    const questions = session.questions || [];
    const responses = session.responses || [];
    
    logger.info('Session state:', { 
      totalQuestions: questions.length, 
      totalResponses: responses.length 
    });

    // Generate next question or end session
    let twiml;
    
    if (questions.length >= 5) {
      // End session - we have enough questions
      await endMockInterview(session, user);
      const message = `Thank you for completing the mock interview. Your session has been analyzed and feedback will be provided. Have a great day!`;
      twiml = await twilioService.generateHangupTwiML(message);
    } else {
      // Generate next question using fallback (fast) if OpenAI is slow
      let nextQuestion;
      
      try {
        // Try to generate with OpenAI with short timeout
        const questionPromise = generateNextQuestion(session, user);
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve(null), 8000) // 8 second timeout
        );
        
        nextQuestion = await Promise.race([questionPromise, timeoutPromise]);
      } catch (err) {
        logger.warn('Question generation slow, using fallback');
        nextQuestion = null;
      }
      
      if (nextQuestion) {
        const message = `Here's your next question: ${nextQuestion.text}. Please provide your response.`;
        
        twiml = await twilioService.generateRecordingTwiML({
          message: message,
          action: `${process.env.WEBHOOK_BASE_URL}/webhook/response`,
          timeout: 120,
          finishOnKey: '#',
          timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/response-timeout`
        });
      } else {
        // Use fallback question
        const fallbackMessage = `Here's your next question: Tell me about a time when you demonstrated leadership. Please provide your response.`;
        
        twiml = await twilioService.generateRecordingTwiML({
          message: fallbackMessage,
          action: `${process.env.WEBHOOK_BASE_URL}/webhook/response`,
          timeout: 120,
          finishOnKey: '#',
          timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/response-timeout`
        });
        
        // Generate real question in background
        generateNextQuestion(session, user).catch(err => {
          logger.error('Background question generation failed:', err);
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`Continue-interview completed in ${duration}ms`);
    
    res.type('text/xml');
    res.send(twiml);

  } catch (error) {
    logger.error('Error continuing interview:', error);
    
    // Don't hang up on errors, use fast fallback
    const twiml = new (require('twilio')).twiml.VoiceResponse();
    twiml.say({ voice: 'alice' }, 'Here\'s your next question: Tell me about a time when you had to work under pressure. Please provide your response.');
    twiml.record({
      timeout: 120,
      maxLength: 60,
      finishOnKey: '#',
      transcribe: true,
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/response`,
      method: 'POST',
      timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/response-timeout`
    });
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Async function to process response in background
async function processResponseAsync(session, user, params) {
  try {
    logger.info('Starting async response processing', { sessionId: session.id });
    
    // Process response and AI analysis
    if (params.recordingUrl) {
      await processRecordedResponse(session, user, params);
    } else if (params.transcriptionText) {
      await processTranscribedResponse(session, user, params);
    }
    
    logger.info('Async response processing completed', { sessionId: session.id });
  } catch (error) {
    logger.error('Error in async response processing:', error);
    // Continue anyway - the continue endpoint will handle it
  }
}

// Handle response timeout (when user doesn't provide response within time limit)
router.post('/response-timeout', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    logger.info('Response timeout received', { callSid: params.callSid });

    // Find active session
    const session = await Session.findActiveByCallSid(params.callSid);
    if (!session) {
      throw new Error('No active session found');
    }

    // Get user
    const user = await session.getUser();

    // Continue with next question instead of hanging up
    const responses = session.responses || [];
    const questions = session.questions || [];
    
    if (responses.length < questions.length) {
      // Still have questions, continue with next one
      const nextQuestion = questions[responses.length];
      const message = `No problem, let's continue. Here's your next question: ${nextQuestion.text}. Please provide your response.`;
      
      const twiml = await twilioService.generateRecordingTwiML({
        message: message,
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/response`,
        timeout: 120,
        finishOnKey: '#',
        timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/response-timeout`
      });
      
      res.type('text/xml');
      res.send(twiml);
    } else {
      // End session gracefully
      await endMockInterview(session, user);
      const message = `Thank you for your time. Your mock interview session has ended. Have a great day!`;
      const twiml = await twilioService.generateHangupTwiML(message);
      
      res.type('text/xml');
      res.send(twiml);
    }
  } catch (error) {
    logger.error('Error handling response timeout:', error);
    
    // Continue with a fallback question
    const twiml = await twilioService.generateRecordingTwiML({
      message: 'Let\'s continue with your interview. Here\'s your next question: Tell me about yourself. Please provide your response.',
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/response`,
      timeout: 120,
      finishOnKey: '#',
      timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/response-timeout`
    });
    
    res.type('text/xml');
    res.send(twiml);
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
    
    // PARALLEL PROCESSING: Run analysis simultaneously
    const [analysis, voiceAnalysis] = await Promise.all([
      openaiService.analyzeResponse({
        question: currentQuestion.text,
        userResponse: transcript,
        questionCategory: currentQuestion.category,
        userProfile: user
      }),
      Promise.resolve(voiceAnalysisService.analyzeVoice(transcript, 30)) // Voice analysis is synchronous
    ]);

    // BATCH DATABASE OPERATIONS: Update everything at once
    const responseData = {
      questionId: currentQuestion.id,
      text: transcript,
      timestamp: new Date().toISOString(),
      duration: 30, // Estimated duration
      transcription: transcript,
      metrics: voiceAnalysis
    };

    // Update session with all data in one operation
    await session.update({
      responses: [...(session.responses || []), responseData],
      scores: { ...session.scores, ...analysis.scores },
      metrics: { ...session.metrics, ...voiceAnalysis.metrics },
      feedback: { ...session.feedback, ...analysis.feedback }
    });

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
async function handleCoachingTips(params) {
  try {
    // Find or create user
    let user = await User.findByPhoneNumber(params.from);
    if (!user) {
      user = await User.createUser({
        phoneNumber: params.from,
        name: 'Interview Candidate',
        industry: 'technology',
        experienceLevel: 'mid'
      });
    }

    // Create coaching session
    const session = await Session.create({
      userId: user.id,
      sessionType: 'coaching',
      industry: user.industry,
      roleLevel: user.experienceLevel,
      callSid: params.callSid,
      status: 'active'
    });

    // Generate coaching questions
    const coachingQuestions = await generateCoachingQuestions(user);
    if (coachingQuestions.length > 0) {
      const firstQuestion = coachingQuestions[0];
      await session.addQuestion(firstQuestion);

      const message = `Great! Let's start your coaching session. I'll ask you questions and provide feedback to help you improve. Here's your first question: ${firstQuestion.text}. Please provide your response.`;

      return await twilioService.generateRecordingTwiML({
        message: message,
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-response`,
        timeout: 120,
        finishOnKey: '#',
        timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-timeout`
      });
    } else {
      throw new Error('Failed to generate coaching questions');
    }
  } catch (error) {
    logger.error('Error starting coaching session:', error);
    throw error;
  }
}

// Handle coaching response
router.post('/coaching-response', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    logger.info('Coaching response received', { callSid: params.callSid });

    // Find active coaching session
    const session = await Session.findActiveByCallSid(params.callSid);
    if (!session || session.sessionType !== 'coaching') {
      throw new Error('No active coaching session found');
    }

    // Get user
    const user = await session.getUser();

    // IMPORTANT: Respond to Twilio immediately to avoid timeout
    const processingMessage = 'Thank you for that response. Please hold while I prepare your next question.';
    const twiml = await twilioService.generateTwiMLResponse({
      message: processingMessage,
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/continue-coaching?callSid=${params.callSid}`,
      timeout: 1
    });

    res.type('text/xml');
    res.send(twiml);

    // Process response asynchronously
    processResponseAsync(session, user, params).catch(error => {
      logger.error('Async coaching response processing failed:', error);
    });

  } catch (error) {
    logger.error('Error handling coaching response:', error);
    
    // Quick error response
    const errorTwiml = await twilioService.generateTwiMLResponse({
      message: 'Let me continue with your next question.',
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/continue-coaching?callSid=${req.body.CallSid}`,
      timeout: 1
    });
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// New endpoint to continue coaching after processing
router.post('/continue-coaching', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    const callSid = params.callSid || req.query.callSid;
    
    logger.info('Continuing coaching session', { callSid });

    // Find active coaching session
    const session = await Session.findActiveByCallSid(callSid);
    if (!session || session.sessionType !== 'coaching') {
      throw new Error('No active coaching session found');
    }

    // Get user
    const user = await session.getUser();

    // Generate next coaching question or end session
    const nextQuestion = await generateNextCoachingQuestion(session, user);
    
    let twiml;
    if (nextQuestion) {
      const message = `Here's your next coaching question: ${nextQuestion.text}. Please provide your response.`;
      
      twiml = await twilioService.generateRecordingTwiML({
        message: message,
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-response`,
        timeout: 120,
        finishOnKey: '#',
        timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-timeout`
      });
    } else {
      // End coaching session
      await endCoachingSession(session, user);
      const message = `Thank you for completing the coaching session. You've received personalized feedback to help improve your interview skills. Have a great day!`;
      twiml = await twilioService.generateHangupTwiML(message);
    }

    res.type('text/xml');
    res.send(twiml);

  } catch (error) {
    logger.error('Error continuing coaching session:', error);
    
    // Don't hang up on errors, continue with next question
    const errorTwiml = await twilioService.generateRecordingTwiML({
      message: 'Here\'s your next coaching question: Tell me about a time when you had to work under pressure. Please provide your response.',
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-response`,
      timeout: 120,
      finishOnKey: '#',
      timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-timeout`
    });
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

// Handle coaching timeout
router.post('/coaching-timeout', async (req, res) => {
  try {
    const params = twilioService.parseWebhookParams(req);
    logger.info('Coaching timeout received', { callSid: params.callSid });

    // Find active coaching session
    const session = await Session.findActiveByCallSid(params.callSid);
    if (!session) {
      throw new Error('No active coaching session found');
    }

    // Get user
    const user = await session.getUser();

    // Continue with next question instead of hanging up
    const responses = session.responses || [];
    const questions = session.questions || [];
    
    if (responses.length < questions.length) {
      // Still have questions, continue with next one
      const nextQuestion = questions[responses.length];
      const message = `No problem, let's continue. Here's your next coaching question: ${nextQuestion.text}. Please provide your response.`;
      
      const twiml = await twilioService.generateRecordingTwiML({
        message: message,
        action: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-response`,
        timeout: 120,
        finishOnKey: '#',
        timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-timeout`
      });
      
      res.type('text/xml');
      res.send(twiml);
    } else {
      // End session gracefully
      await endCoachingSession(session, user);
      const message = `Thank you for your time. Your coaching session has ended. Have a great day!`;
      const twiml = await twilioService.generateHangupTwiML(message);
      
      res.type('text/xml');
      res.send(twiml);
    }
  } catch (error) {
    logger.error('Error handling coaching timeout:', error);
    
    // Continue with a fallback question
    const twiml = await twilioService.generateRecordingTwiML({
      message: 'Let\'s continue with your coaching session. Here\'s your next question: Tell me about yourself. Please provide your response.',
      action: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-response`,
      timeout: 120,
      finishOnKey: '#',
      timeoutAction: `${process.env.WEBHOOK_BASE_URL}/webhook/coaching-timeout`
    });
    
    res.type('text/xml');
    res.send(twiml);
  }
});

// Generate coaching questions
async function generateCoachingQuestions(user) {
  try {
    const coachingQuestions = await openaiService.generateInterviewQuestions({
      industry: user.industry,
      experienceLevel: user.experienceLevel,
      questionCount: 3, // Fewer questions for coaching session
      focusAreas: ['behavioral', 'communication']
    });

    return coachingQuestions;
  } catch (error) {
    logger.error('Error generating coaching questions:', error);
    
    // Return fallback coaching questions
    return [
      {
        id: 'coaching_1',
        text: 'Tell me about yourself and your background.',
        category: 'behavioral',
        difficulty: 'medium'
      },
      {
        id: 'coaching_2',
        text: 'Describe a time when you had to work under pressure.',
        category: 'behavioral',
        difficulty: 'medium'
      },
      {
        id: 'coaching_3',
        text: 'What are your greatest strengths and how do they apply to this role?',
        category: 'behavioral',
        difficulty: 'medium'
      }
    ];
  }
}

// Generate next coaching question
async function generateNextCoachingQuestion(session, user) {
  try {
    const questions = session.questions || [];
    const responses = session.responses || [];
    
    // Check if we have enough questions (limit to 3 for coaching session)
    if (questions.length >= 3) {
      return null;
    }

    // Generate next coaching question
    const newQuestions = await openaiService.generateInterviewQuestions({
      industry: user.industry,
      experienceLevel: user.experienceLevel,
      questionCount: 1,
      previousQuestions: questions.map(q => q.text),
      focusAreas: ['behavioral', 'communication']
    });

    if (newQuestions.length > 0) {
      const nextQuestion = newQuestions[0];
      await session.addQuestion(nextQuestion);
      return nextQuestion;
    }

    return null;
  } catch (error) {
    logger.error('Error generating next coaching question:', error);
    return null;
  }
}

// End coaching session
async function endCoachingSession(session, user) {
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

    logger.info('Coaching session completed', {
      sessionId: session.id,
      userId: user.id,
      finalScore: overallScore
    });
  } catch (error) {
    logger.error('Error ending coaching session:', error);
  }
}

// Handle representative transfer
function handleRepresentativeTransfer(params) {
  const message = 'I\'m transferring you to a representative. Please hold while I connect you.';
  
  const twiml = new (require('twilio')).twiml.VoiceResponse();
  twiml.say(message);
  
  // Option 1: Transfer to a real phone number (uncomment and add your number)
  // twiml.dial('+1234567890'); // Replace with your support number
  
  // Option 2: Transfer to another Twilio number
  // twiml.dial('+15551234567'); // Replace with your support Twilio number
  
  // Option 3: For now, provide contact information instead of hanging up
  twiml.say('For immediate assistance, please call our support line at 1-800-123-4567 or email us at support@yourcompany.com. Thank you for using AI Interview Coaching.');
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
