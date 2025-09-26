const twilio = require('twilio');
const logger = require('../utils/logger');

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!this.accountSid || !this.authToken || !this.phoneNumber) {
      throw new Error('Twilio credentials not properly configured');
    }
    
    this.client = twilio(this.accountSid, this.authToken);
  }

  // Generate TwiML response for voice interactions
  generateTwiMLResponse(options = {}) {
    const {
      message = 'Hello, welcome to AI Interview Coaching.',
      action = null,
      method = 'POST',
      timeout = 5,
      speechTimeout = 'auto',
      language = 'en-US',
      voice = 'alice'
    } = options;

    const twiml = new twilio.twiml.VoiceResponse();
    
    if (action) {
      twiml.gather({
        action: action,
        method: method,
        timeout: timeout,
        speechTimeout: speechTimeout,
        language: language,
        input: ['speech', 'dtmf']
      }).say({
        voice: voice,
        language: language
      }, message);
    } else {
      twiml.say({
        voice: voice,
        language: language
      }, message);
    }

    return twiml.toString();
  }

  // Generate TwiML for recording
  generateRecordingTwiML(options = {}) {
    const {
      message = 'Please speak your answer now.',
      action = null,
      method = 'POST',
      timeout = 30,
      maxLength = 60,
      finishOnKey = '#',
      language = 'en-US',
      voice = 'alice',
      timeoutAction = null
    } = options;

    const twiml = new twilio.twiml.VoiceResponse();
    
    twiml.say({
      voice: voice,
      language: language
    }, message);

    if (action) {
      const recordOptions = {
        action: action,
        method: method,
        timeout: timeout,
        maxLength: maxLength,
        finishOnKey: finishOnKey,
        transcribe: true,
        transcribeCallback: action.replace('recording', 'transcription')
      };

      // Add timeout action if provided
      if (timeoutAction) {
        recordOptions.timeoutAction = timeoutAction;
      }

      twiml.record(recordOptions);
    } else {
      const recordOptions = {
        timeout: timeout,
        maxLength: maxLength,
        finishOnKey: finishOnKey,
        transcribe: true
      };

      // Add timeout action if provided
      if (timeoutAction) {
        recordOptions.timeoutAction = timeoutAction;
      }

      twiml.record(recordOptions);
    }

    return twiml.toString();
  }

  // Generate TwiML for hangup
  generateHangupTwiML(message = 'Thank you for using AI Interview Coaching. Goodbye!') {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, message);
    twiml.hangup();
    
    return twiml.toString();
  }

  // Generate TwiML for hold music
  generateHoldTwiML(message = 'Please wait while we process your request.') {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, message);
    twiml.play('https://demo.twilio.com/docs/classic.mp3');
    
    return twiml.toString();
  }

  // Get call details
  async getCallDetails(callSid) {
    try {
      const startTime = Date.now();
      const call = await this.client.calls(callSid).fetch();
      const duration = Date.now() - startTime;
      
      logger.logApiCall('Twilio', 'getCallDetails', duration, true);
      
      return {
        sid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to,
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration,
        price: call.price,
        priceUnit: call.priceUnit
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logApiCall('Twilio', 'getCallDetails', duration, false);
      logger.error('Failed to get call details:', error);
      throw error;
    }
  }

  // Get call recordings
  async getCallRecordings(callSid) {
    try {
      const startTime = Date.now();
      const recordings = await this.client.calls(callSid).recordings.list();
      const duration = Date.now() - startTime;
      
      logger.logApiCall('Twilio', 'getCallRecordings', duration, true);
      
      return recordings.map(recording => ({
        sid: recording.sid,
        duration: recording.duration,
        status: recording.status,
        url: recording.url,
        dateCreated: recording.dateCreated
      }));
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logApiCall('Twilio', 'getCallRecordings', duration, false);
      logger.error('Failed to get call recordings:', error);
      throw error;
    }
  }

  // Get transcription
  async getTranscription(recordingSid) {
    try {
      const startTime = Date.now();
      const transcription = await this.client.recordings(recordingSid).transcriptions.list();
      const duration = Date.now() - startTime;
      
      logger.logApiCall('Twilio', 'getTranscription', duration, true);
      
      if (transcription.length > 0) {
        return {
          sid: transcription[0].sid,
          status: transcription[0].status,
          transcriptionText: transcription[0].transcriptionText,
          dateCreated: transcription[0].dateCreated
        };
      }
      
      return null;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logApiCall('Twilio', 'getTranscription', duration, false);
      logger.error('Failed to get transcription:', error);
      throw error;
    }
  }

  // Send SMS (for notifications)
  async sendSMS(to, message) {
    try {
      const startTime = Date.now();
      const sms = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: to
      });
      const duration = Date.now() - startTime;
      
      logger.logApiCall('Twilio', 'sendSMS', duration, true);
      
      return {
        sid: sms.sid,
        status: sms.status,
        to: sms.to,
        from: sms.from,
        body: sms.body
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logApiCall('Twilio', 'sendSMS', duration, false);
      logger.error('Failed to send SMS:', error);
      throw error;
    }
  }

  // Validate webhook signature
  validateWebhookSignature(signature, url, params) {
    try {
      return twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        signature,
        url,
        params
      );
    } catch (error) {
      logger.error('Webhook signature validation failed:', error);
      return false;
    }
  }

  // Parse Twilio webhook parameters
  parseWebhookParams(req) {
    return {
      callSid: req.body.CallSid,
      accountSid: req.body.AccountSid,
      from: req.body.From,
      to: req.body.To,
      callStatus: req.body.CallStatus,
      direction: req.body.Direction,
      speechResult: req.body.SpeechResult,
      confidence: req.body.Confidence,
      digits: req.body.Digits,
      recordingUrl: req.body.RecordingUrl,
      recordingDuration: req.body.RecordingDuration,
      transcriptionText: req.body.TranscriptionText,
      transcriptionStatus: req.body.TranscriptionStatus
    };
  }
}

module.exports = new TwilioService();
