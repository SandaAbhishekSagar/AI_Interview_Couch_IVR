const express = require('express');
const router = express.Router();
const path = require('path');
const logger = require('../utils/logger');

// Serve audio files for Twilio to play
router.get('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal attacks
    if (!filename.match(/^[a-zA-Z0-9-_]+\.(mp3|wav)$/)) {
      logger.warn('Invalid audio filename requested:', filename);
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const audioDir = path.join(__dirname, '../../temp/audio');
    const filepath = path.join(audioDir, filename);
    
    // Set appropriate content type based on extension
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.mp3' ? 'audio/mpeg' : 'audio/wav';
    
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*'
    });
    
    logger.info('Serving audio file:', filename);
    res.sendFile(filepath, (err) => {
      if (err) {
        logger.error('Error serving audio file:', err);
        if (!res.headersSent) {
          res.status(404).json({ error: 'Audio file not found' });
        }
      }
    });
    
  } catch (error) {
    logger.error('Error handling audio request:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// List available audio files (for debugging/management)
router.get('/', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const audioDir = path.join(__dirname, '../../temp/audio');
    
    const files = await fs.readdir(audioDir);
    const audioFiles = files.filter(f => f.match(/\.(mp3|wav)$/));
    
    const fileDetails = await Promise.all(
      audioFiles.map(async (file) => {
        const filepath = path.join(audioDir, file);
        const stats = await fs.stat(filepath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
    );
    
    res.json({
      count: audioFiles.length,
      files: fileDetails
    });
    
  } catch (error) {
    logger.error('Error listing audio files:', error);
    res.status(500).json({ error: 'Failed to list audio files' });
  }
});

module.exports = router;

