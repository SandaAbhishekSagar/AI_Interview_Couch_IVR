# MurfAI Text-to-Speech Integration Guide

This document explains how the AI Interview Coaching IVR System integrates with MurfAI for high-quality text-to-speech conversion.

## 🎯 Overview

MurfAI provides natural-sounding text-to-speech voices that significantly enhance the user experience compared to traditional robotic TTS systems. This integration replaces Twilio's built-in text-to-speech with MurfAI's advanced voice synthesis.

## 🔧 How It Works

### Architecture

```
User Call → Twilio → Webhook → TwilioService → MurfAIService
                                      ↓
                              Generate Audio URL
                                      ↓
                              TwiML with <Play>
                                      ↓
                              User Hears Audio
```

### Flow Diagram

1. **User calls the Twilio number**
2. **Webhook receives the call** and generates a text message
3. **MurfAI Service** converts the text to speech
4. **Audio file is saved** to `temp/audio/` directory
5. **Public URL is generated** for the audio file
6. **TwiML response uses `<Play>`** instead of `<Say>` to play the audio
7. **User hears high-quality voice** instead of robotic TTS

## 📁 Key Components

### 1. MurfAI Service (`src/services/murfaiService.js`)

The main service that handles all MurfAI API interactions:

**Key Methods:**
- `textToSpeech(options)` - Convert text to speech
- `generateAudioUrl(text, options)` - Generate audio and return public URL
- `batchTextToSpeech(textArray, options)` - Convert multiple texts in parallel
- `preGenerateCommonMessages()` - Pre-generate frequently used messages
- `getAvailableVoices()` - Fetch available voice options
- `clearCache(olderThanDays)` - Remove old cached audio files

**Features:**
- ✅ Audio caching to reduce API costs
- ✅ Automatic fallback to Twilio TTS on errors
- ✅ Batch processing for efficiency
- ✅ Configurable voice options
- ✅ Error handling and retry logic

### 2. Updated Twilio Service (`src/services/twilioService.js`)

Enhanced to support MurfAI audio playback:

**Key Changes:**
- All TwiML generation methods are now `async`
- Uses `<Play>` tag for MurfAI audio
- Falls back to `<Say>` if MurfAI fails
- Controlled by `USE_MURFAI_TTS` environment variable

### 3. Audio Route (`src/routes/audio.js`)

Serves generated audio files to Twilio:

**Endpoints:**
- `GET /audio/:filename` - Serve specific audio file
- `GET /audio` - List all cached audio files (for management)

**Features:**
- ✅ Security validation (prevents directory traversal)
- ✅ Proper content-type headers
- ✅ 24-hour browser caching
- ✅ CORS support for Twilio

## 🚀 Setup Instructions

### 1. Get MurfAI API Key

1. Visit [murf.ai/api](https://murf.ai/api)
2. Sign up for an account
3. Get 100,000 free characters to test
4. Generate your API key from the dashboard
5. **Important:** Save the key securely (it can't be retrieved later)

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# MurfAI Configuration
MURF_API_KEY=your_murf_api_key_here
MURF_API_URL=https://api.murf.ai/v1
MURF_DEFAULT_VOICE=en-US-natalie
USE_MURFAI_TTS=true
```

### 3. Available Voice Options

#### US English Voices
- `en-US-natalie` - Female, professional (default)
- `en-US-wayne` - Male, professional
- `en-US-sara` - Female, friendly
- `en-US-noah` - Male, authoritative

#### UK English Voices
- `en-GB-elizabeth` - Female, professional
- `en-GB-charles` - Male, professional

To get the complete list of voices:
```javascript
const voices = await murfaiService.getAvailableVoices();
```

### 4. Test the Integration

```bash
# Start the server
npm run dev

# Make a test call to your Twilio number
# You should hear natural-sounding MurfAI voices
```

## 💡 Usage Examples

### Basic Text-to-Speech

```javascript
const murfaiService = require('./services/murfaiService');

// Generate audio
const result = await murfaiService.textToSpeech({
  text: 'Welcome to AI Interview Coaching',
  voiceId: 'en-US-natalie'
});

console.log('Audio URL:', result.audioUrl);
```

### Custom Voice Options

```javascript
const result = await murfaiService.textToSpeech({
  text: 'Your interview performance was excellent!',
  voiceId: 'en-US-sara',
  pitch: 5,      // -50 to 50
  speed: 0,      // -50 to 50
  format: 'MP3',
  sampleRate: 24000
});
```

### Pre-generate Common Messages

```javascript
// In your startup script
const twilioService = require('./services/twilioService');
await twilioService.preGenerateCommonMessages();
```

### Batch Processing

```javascript
const messages = [
  'Welcome to the interview',
  'Thank you for your response',
  'Have a great day'
];

const results = await murfaiService.batchTextToSpeech(messages);
```

## 🎛️ Configuration Options

### MurfAI Service Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `text` | string | - | Text to convert (required) |
| `voiceId` | string | `en-US-natalie` | Voice to use |
| `format` | string | `MP3` | Audio format (MP3/WAV) |
| `sampleRate` | number | 24000 | Audio sample rate |
| `pitch` | number | 0 | Voice pitch (-50 to 50) |
| `speed` | number | 0 | Speech speed (-50 to 50) |
| `useCache` | boolean | true | Enable audio caching |

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MURF_API_KEY` | Yes | - | Your MurfAI API key |
| `MURF_API_URL` | No | https://api.murf.ai/v1 | API base URL |
| `MURF_DEFAULT_VOICE` | No | en-US-natalie | Default voice ID |
| `USE_MURFAI_TTS` | No | true | Enable/disable MurfAI |

## 📊 Performance Optimization

### 1. Audio Caching

Audio files are cached to reduce API calls and costs:

```javascript
// Cached files are stored in temp/audio/
// Cache key is generated from: text + voiceId + pitch + speed

// Clear old cache files (older than 7 days)
await murfaiService.clearCache(7);
```

### 2. Pre-generation

Common messages are pre-generated on server startup:

```javascript
// This happens automatically in server.js startup
const commonMessages = [
  'Welcome to AI Interview Coaching',
  'Thank you for that answer',
  'Please provide your response'
];

await murfaiService.batchTextToSpeech(commonMessages);
```

### 3. Batch Processing

Multiple texts are processed in parallel with concurrency control:

```javascript
// Processes 5 texts at a time to avoid rate limits
const results = await murfaiService.batchTextToSpeech(textArray, {
  voiceId: 'en-US-natalie',
  useCache: true
});
```

## 🛡️ Error Handling

### Automatic Fallback

If MurfAI fails, the system automatically falls back to Twilio's built-in TTS:

```javascript
try {
  const audioUrl = await murfaiService.generateAudioUrl(message);
  twiml.play(audioUrl);
} catch (error) {
  logger.error('MurfAI failed, falling back to Twilio TTS');
  twiml.say({ voice: 'alice' }, message);
}
```

### Manual Disable

To temporarily disable MurfAI:

```env
USE_MURFAI_TTS=false
```

This will make all calls use Twilio's built-in TTS.

## 📈 Monitoring & Logging

### API Call Logging

All MurfAI API calls are logged:

```javascript
logger.logApiCall('MurfAI', 'textToSpeech', duration, success);
```

### Check Cached Audio Files

```bash
curl http://your-domain.com/audio
```

Returns:
```json
{
  "count": 15,
  "files": [
    {
      "filename": "abc123def456.mp3",
      "size": 45678,
      "created": "2025-01-01T12:00:00Z",
      "modified": "2025-01-01T12:00:00Z"
    }
  ]
}
```

## 💰 Cost Management

### MurfAI Pricing

- **Free Tier**: 100,000 characters
- **Starter**: $19/month - 500K characters
- **Pro**: $39/month - 1M characters
- **Enterprise**: $99/month - 3M characters

### Cost Optimization Tips

1. **Enable Caching**: Reuse audio for common messages
   ```javascript
   useCache: true  // Default
   ```

2. **Pre-generate Common Messages**: Generate once, use many times
   ```javascript
   await twilioService.preGenerateCommonMessages();
   ```

3. **Batch Processing**: Process multiple texts efficiently
   ```javascript
   await murfaiService.batchTextToSpeech(messages);
   ```

4. **Monitor Usage**: Track character usage
   ```javascript
   // Each API call logs character count
   logger.info('MurfAI characters used:', text.length);
   ```

5. **Clear Old Cache**: Remove unused audio files
   ```javascript
   // Run weekly via cron job
   await murfaiService.clearCache(7);
   ```

## 🔧 Troubleshooting

### Issue: "MurfAI API key not configured"

**Solution:**
```bash
# Check your .env file
echo $MURF_API_KEY

# Set the key
export MURF_API_KEY=your_key_here
```

### Issue: "Audio file not found"

**Causes:**
1. Cache directory doesn't exist
2. File was deleted
3. Incorrect webhook base URL

**Solution:**
```bash
# Check if directory exists
ls temp/audio/

# Verify WEBHOOK_BASE_URL
echo $WEBHOOK_BASE_URL

# Should match your deployed URL
WEBHOOK_BASE_URL=https://your-app.railway.app
```

### Issue: "Twilio can't access audio files"

**Causes:**
1. Server not publicly accessible
2. Audio route not configured
3. Firewall blocking requests

**Solution:**
```bash
# Test audio endpoint
curl https://your-domain.com/audio

# Should return list of files
```

### Issue: "Rate limit exceeded"

**Solution:**
```javascript
// Reduce concurrency in batch processing
// Edit murfaiService.js line ~138
const concurrencyLimit = 3; // Reduced from 5
```

## 🧪 Testing

### Test Audio Generation

```javascript
const murfaiService = require('./src/services/murfaiService');

async function test() {
  const result = await murfaiService.textToSpeech({
    text: 'This is a test message',
    voiceId: 'en-US-natalie'
  });
  
  console.log('Success!', result.audioUrl);
}

test();
```

### Test Webhook Integration

```bash
# Use Twilio CLI to simulate webhook
twilio phone-numbers:update PHONE_SID \
  --voice-url=https://your-domain.com/webhook/voice
```

## 📚 API Reference

### MurfAI REST API

The service uses these MurfAI endpoints:

```
POST https://api.murf.ai/v1/text-to-speech/generate
GET  https://api.murf.ai/v1/voices
```

**Authentication:**
```
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "text": "Your text here",
  "voiceId": "en-US-natalie",
  "format": "MP3",
  "sampleRate": 24000,
  "pitch": 0,
  "speed": 0
}
```

**Response:**
```json
{
  "audioFile": "base64_encoded_audio",
  "audioUrl": "https://...",
  "duration": 5.2
}
```

## 🔐 Security Considerations

1. **API Key Protection**
   - Never commit API keys to git
   - Use environment variables
   - Rotate keys periodically

2. **Audio File Access**
   - Filename validation prevents directory traversal
   - Files are served with proper CORS headers
   - Old files are automatically cleaned up

3. **Rate Limiting**
   - Batch processing has concurrency limits
   - Automatic retry with exponential backoff
   - Fallback to Twilio TTS on failures

## 📞 Support

For issues with:
- **MurfAI API**: Contact [MurfAI Support](https://murf.ai/support)
- **Integration**: Check the logs in `temp/logs/`
- **Audio Quality**: Try different voice IDs or adjust pitch/speed

## 🎓 Best Practices

1. **Pre-generate static messages** during deployment
2. **Enable caching** for repeated messages
3. **Monitor character usage** to control costs
4. **Test different voices** to find the best fit
5. **Set up automatic cache cleanup** via cron job
6. **Keep fallback to Twilio TTS** for reliability
7. **Log all API calls** for debugging

---

**Integration Complete! 🎉**

Your IVR system now uses professional-quality voices from MurfAI, providing a much better user experience compared to traditional robotic text-to-speech.

