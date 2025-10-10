#!/usr/bin/env node
/**
 * Script to test MurfAI integration
 * Usage: node scripts/test-murfai.js
 */

require('dotenv').config();
const murfaiService = require('../src/services/murfaiService');
const logger = require('../src/utils/logger');

async function testMurfAI() {
  try {
    logger.info('Testing MurfAI integration...\n');
    
    // Test 1: Get available voices
    logger.info('Test 1: Fetching available voices...');
    const voices = await murfaiService.getAvailableVoices();
    logger.info(`✓ Found ${voices.length} voices`);
    voices.slice(0, 5).forEach(voice => {
      logger.info(`  - ${voice.id}: ${voice.name} (${voice.language})`);
    });
    
    console.log('');
    
    // Test 2: Generate a simple audio
    logger.info('Test 2: Generating test audio...');
    const testText = 'Welcome to AI Interview Coaching. This is a test message.';
    const result = await murfaiService.textToSpeech({
      text: testText,
      voiceId: process.env.MURF_DEFAULT_VOICE || 'en-US-natalie'
    });
    logger.info(`✓ Audio generated successfully`);
    logger.info(`  - URL: ${result.audioUrl}`);
    logger.info(`  - Duration: ${result.duration}s`);
    logger.info(`  - Cache Key: ${result.cacheKey}`);
    
    console.log('');
    
    // Test 3: Test caching
    logger.info('Test 3: Testing audio caching...');
    const cachedResult = await murfaiService.textToSpeech({
      text: testText,
      voiceId: process.env.MURF_DEFAULT_VOICE || 'en-US-natalie'
    });
    if (cachedResult.cached) {
      logger.info('✓ Cache working correctly');
    } else {
      logger.warn('⚠ Cache might not be working');
    }
    
    console.log('');
    
    // Test 4: Test different voice
    logger.info('Test 4: Testing different voice...');
    const result2 = await murfaiService.textToSpeech({
      text: 'This is a different voice test.',
      voiceId: 'en-US-wayne'
    });
    logger.info(`✓ Different voice generated successfully`);
    logger.info(`  - URL: ${result2.audioUrl}`);
    
    console.log('');
    logger.info('🎉 All tests passed! MurfAI integration is working correctly.\n');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Test failed:', error);
    console.error('\nError details:', error.message);
    
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    
    console.log('\nTroubleshooting:');
    console.log('1. Check your MURF_API_KEY in .env file');
    console.log('2. Verify your MurfAI account has available characters');
    console.log('3. Check your internet connection');
    console.log('4. Review the logs for more details');
    
    process.exit(1);
  }
}

testMurfAI();

