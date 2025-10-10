# Quick Start Guide - MurfAI Integration

This guide will help you quickly set up and test the MurfAI text-to-speech integration.

## ⚡ 5-Minute Setup

### Step 1: Get Your MurfAI API Key

1. Go to [murf.ai/api](https://murf.ai/api)
2. Sign up for a free account (100K characters free)
3. Generate and copy your API key

### Step 2: Configure Environment

Add to your `.env` file:

```env
MURF_API_KEY=your_murf_api_key_here
USE_MURFAI_TTS=true
```

### Step 3: Test the Integration

```bash
# Install dependencies (if not already done)
npm install

# Test MurfAI connection
npm run test:murfai
```

You should see:
```
✓ Found 6 voices
✓ Audio generated successfully
✓ Cache working correctly
✓ Different voice generated successfully
🎉 All tests passed!
```

### Step 4: Pre-generate Common Messages (Optional)

```bash
npm run pregenerate:audio
```

This speeds up the first calls by pre-generating frequently used messages.

### Step 5: Start the Server

```bash
npm run dev
```

### Step 6: Make a Test Call

Call your Twilio number and hear the difference! You should now hear natural MurfAI voices instead of robotic TTS.

## 🎯 Verify It's Working

### Check Logs

Look for messages like:
```
[MurfAI] textToSpeech - SUCCESS (1234ms)
[INFO] Audio file saved: abc123def456.mp3
```

### Check Generated Audio

```bash
# List generated audio files
curl http://localhost:3000/audio

# Play an audio file
curl http://localhost:3000/audio/abc123def456.mp3 --output test.mp3
```

### Test Different Voices

Update `.env`:
```env
MURF_DEFAULT_VOICE=en-US-wayne  # Male voice
# or
MURF_DEFAULT_VOICE=en-US-sara   # Friendly female voice
```

Restart the server and call again.

## 🔧 Troubleshooting

### "MurfAI API key not configured"

```bash
# Check if key is set
echo $MURF_API_KEY

# If empty, add to .env and restart
export MURF_API_KEY=your_key
npm run dev
```

### Falls Back to Twilio TTS

Check logs for errors:
```bash
# Enable detailed logging
LOG_LEVEL=debug npm run dev
```

Common issues:
- Invalid API key
- No available characters (check MurfAI dashboard)
- Network connectivity problems

### Audio Files Not Playing

```bash
# Verify webhook base URL is correct
echo $WEBHOOK_BASE_URL

# Should be your public URL
WEBHOOK_BASE_URL=https://your-app.railway.app

# Test audio endpoint
curl https://your-domain.com/audio
```

## 📊 Monitor Usage

### Check Character Usage

Log into [MurfAI Dashboard](https://murf.ai/dashboard) to see:
- Characters used
- Characters remaining
- Usage history

### Clear Old Cache

```bash
# Remove audio files older than 7 days
npm run clear:cache

# Or specify days
npm run clear:cache 14
```

## 🎨 Customize Voices

### Available Voices

Run this to see all available voices:
```bash
node -e "require('dotenv').config(); require('./src/services/murfaiService').getAvailableVoices().then(v => console.log(v))"
```

### Change Default Voice

In `.env`:
```env
MURF_DEFAULT_VOICE=en-US-natalie  # Professional female
MURF_DEFAULT_VOICE=en-US-wayne    # Professional male
MURF_DEFAULT_VOICE=en-US-sara     # Friendly female
MURF_DEFAULT_VOICE=en-US-noah     # Authoritative male
MURF_DEFAULT_VOICE=en-GB-elizabeth # British female
MURF_DEFAULT_VOICE=en-GB-charles  # British male
```

### Adjust Voice Settings

Edit `src/services/murfaiService.js`:
```javascript
const response = await this.client.text_to_speech.generate({
  text: text,
  voiceId: voiceId,
  pitch: 5,      // -50 to 50 (higher = higher pitch)
  speed: 0,      // -50 to 50 (higher = faster)
  format: 'MP3',
  sampleRate: 24000
});
```

## 🚀 Deployment

### Railway

```bash
railway variables set MURF_API_KEY=your_key
railway variables set USE_MURFAI_TTS=true
railway up
```

### Heroku

```bash
heroku config:set MURF_API_KEY=your_key
heroku config:set USE_MURFAI_TTS=true
git push heroku main
```

### Docker

```bash
docker build -t ivr-system .
docker run -e MURF_API_KEY=your_key -e USE_MURFAI_TTS=true ivr-system
```

## 💡 Tips & Best Practices

### 1. Enable Caching

Caching is enabled by default and saves API costs:
```javascript
await murfaiService.textToSpeech({
  text: 'Hello',
  useCache: true  // Default
});
```

### 2. Pre-generate Common Messages

Add your frequently used messages to `src/services/murfaiService.js`:
```javascript
const commonMessages = [
  'Welcome to AI Interview Coaching',
  'Thank you for that answer',
  'Your custom message here'
];
```

### 3. Monitor Costs

- Check MurfAI dashboard regularly
- Set up alerts for usage limits
- Use caching aggressively
- Clear old cache files weekly

### 4. Fallback Strategy

The system automatically falls back to Twilio TTS if MurfAI fails. To disable MurfAI temporarily:
```env
USE_MURFAI_TTS=false
```

### 5. Performance Optimization

```bash
# Pre-generate before deployment
npm run pregenerate:audio

# Schedule cache cleanup (cron job)
0 0 * * 0 npm run clear:cache  # Weekly at midnight Sunday
```

## 🎓 Next Steps

1. **Read Full Documentation**: Check `MURFAI_INTEGRATION.md` for detailed information
2. **Explore Voice Options**: Try different voices to find the best fit
3. **Customize Messages**: Add your own messages to pre-generation
4. **Monitor Performance**: Check logs and MurfAI dashboard
5. **Optimize Costs**: Enable caching and pre-generation

## 📞 Support

- **MurfAI Issues**: [murf.ai/support](https://murf.ai/support)
- **Integration Help**: Check logs in `temp/logs/`
- **General Questions**: See README.md and MURFAI_INTEGRATION.md

---

**🎉 You're all set! Enjoy natural-sounding voices in your IVR system!**

