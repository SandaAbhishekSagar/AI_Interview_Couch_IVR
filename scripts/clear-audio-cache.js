#!/usr/bin/env node
/**
 * Script to clear old cached audio files from MurfAI TTS
 * Usage: node scripts/clear-audio-cache.js [days]
 */

require('dotenv').config();
const murfaiService = require('../src/services/murfaiService');
const logger = require('../src/utils/logger');

const days = parseInt(process.argv[2]) || 7;

async function clearCache() {
  try {
    logger.info(`Clearing audio cache older than ${days} days...`);
    
    const result = await murfaiService.clearCache(days);
    
    logger.info(`Cache cleared successfully. Deleted ${result.deletedCount} files.`);
    process.exit(0);
  } catch (error) {
    logger.error('Failed to clear cache:', error);
    process.exit(1);
  }
}

clearCache();

