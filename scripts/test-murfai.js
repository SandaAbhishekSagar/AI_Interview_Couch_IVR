#!/usr/bin/env node
/**
 * Script to test MurfAI WebSocket integration
 * Usage: node scripts/test-murfai.js
 */

require('dotenv').config();
const murfaiService = require('../src/services/murfaiService');
const logger = require('../src/utils/logger');

async function testMurfAI() {
  try {
    logger.info('Testing MurfAI WebSocket integration...\n');
    
    // Check API key
    if (!process.env.MURF_API_KEY) {
      console.error('❌ ERROR: MURF_API_KEY not set in environment variables');
      console.log('\nPlease set your MurfAI API key:');
      console.log('export MURF_API_KEY=your_api_key_here');
      console.log('\nOr add it to your .env file:');
      console.log('MURF_API_KEY=your_api_key_here');
      process.exit(1);
    }
    
    logger.info('✅ API key found');
    console.log('');
    
    // Test 1: Get available voices (fallback to default list)
    logger.info('Test 1: Getting available voices...');
    const voices = murfaiService.getDefaultVoices();
    logger.info(`✅ Found ${voices.length} voices`);
    voices.slice(0, 5).forEach(voice => {
      logger.info(`  - ${voice.id}: ${voice.name} (${voice.language})`);
    });
    
    console.log('');
    
    // Test 2: Generate a simple audio via WebSocket
    logger.info('Test 2: Generating test audio via WebSocket...');
    const testText = 'Welcome to AI Interview Coaching. This is a test of the WebSocket streaming API.';
    logger.info(`Text: "${testText}"`);
    
    const result = await murfaiService.textToSpeech({
      text: testText,
      voiceId: process.env.MURF_DEFAULT_VOICE || 'en-US-natalie',
      useCache: false // Don't use cache for test
    });
    
    logger.info(`✅ Audio generated successfully`);
    logger.info(`  - URL: ${result.audioUrl}`);
    logger.info(`  - Size: ${result.audioData.length} bytes`);
    logger.info(`  - Duration: ${result.duration}ms`);
    logger.info(`  - Cache Key: ${result.cacheKey}`);
    
    console.log('');
    
    // Test 3: Test caching
    logger.info('Test 3: Testing audio caching...');
    const startCache = Date.now();
    const cachedResult = await murfaiService.textToSpeech({
      text: testText,
      voiceId: process.env.MURF_DEFAULT_VOICE || 'en-US-natalie',
      useCache: true
    });
    const cacheTime = Date.now() - startCache;
    
    if (cachedResult.cached) {
      logger.info(`✅ Cache working correctly (${cacheTime}ms - instant!)`);
    } else {
      logger.warn('⚠ Cache might not be working (generated new audio)');
    }
    
    console.log('');
    
    // Test 4: Test different voice
    logger.info('Test 4: Testing different voice...');
    const result2 = await murfaiService.textToSpeech({
      text: 'This is a different voice test.',
      voiceId: 'en-US-wayne',
      useCache: false
    });
    logger.info(`✅ Different voice generated successfully`);
    logger.info(`  - URL: ${result2.audioUrl}`);
    logger.info(`  - Size: ${result2.audioData.length} bytes`);
    
    console.log('');
    
    // Test 5: Test batch processing
    logger.info('Test 5: Testing batch processing...');
    const messages = [
      'Thank you for that answer.',
      'Please provide your response.',
      'Have a great day!'
    ];
    
    const startBatch = Date.now();
    const batchResults = await murfaiService.batchTextToSpeech(messages, { useCache: false });
    const batchTime = Date.now() - startBatch;
    
    logger.info(`✅ Batch processing completed`);
    logger.info(`  - Processed: ${batchResults.length}/${messages.length} messages`);
    logger.info(`  - Total time: ${batchTime}ms`);
    logger.info(`  - Average: ${Math.round(batchTime / batchResults.length)}ms per message`);
    
    console.log('');
    logger.info('🎉 All tests passed! MurfAI WebSocket integration is working correctly.\n');
    
    console.log('Next steps:');
    console.log('1. Make a test call to your Twilio number');
    console.log('2. Start a mock interview');
    console.log('3. Listen for natural MurfAI voices');
    console.log('');
    console.log('To pre-generate common messages:');
    console.log('npm run pregenerate:audio');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Test failed:', error.message);
    console.error('\nError details:', error);
    
    if (error.message.includes('WebSocket connection timeout')) {
      console.log('\nTroubleshooting:');
      console.log('1. Check your MURF_API_KEY is correct');
      console.log('2. Verify your MurfAI account is active');
      console.log('3. Check network connectivity');
      console.log('4. Verify no firewall blocking WebSocket connections');
    } else if (error.message.includes('Connection closed')) {
      console.log('\nTroubleshooting:');
      console.log('1. Check your MurfAI account has available characters');
      console.log('2. Verify API key permissions');
      console.log('3. Check text isn\'t too long');
    } else if (error.message.includes('not configured')) {
      console.log('\nTroubleshooting:');
      console.log('1. Set MURF_API_KEY in your .env file');
      console.log('2. Or export it as an environment variable');
      console.log('3. Restart your terminal/IDE after setting the variable');
    }
    
    process.exit(1);
  }
}

testMurfAI();
