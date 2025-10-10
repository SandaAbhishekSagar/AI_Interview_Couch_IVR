#!/usr/bin/env node
/**
 * Script to pre-generate common audio messages
 * Run this during deployment to speed up initial calls
 * Usage: node scripts/pregenerate-audio.js
 */

require('dotenv').config();
const murfaiService = require('../src/services/murfaiService');
const logger = require('../src/utils/logger');

async function preGenerate() {
  try {
    logger.info('Pre-generating common audio messages...');
    
    const result = await murfaiService.preGenerateCommonMessages();
    
    logger.info(`Successfully pre-generated ${result.length} audio files.`);
    
    result.forEach((item, index) => {
      logger.info(`${index + 1}. ${item.text.substring(0, 50)}... -> ${item.audioUrl}`);
    });
    
    process.exit(0);
  } catch (error) {
    logger.error('Failed to pre-generate audio:', error);
    process.exit(1);
  }
}

preGenerate();

