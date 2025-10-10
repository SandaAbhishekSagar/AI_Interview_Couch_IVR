const crypto = require('crypto');

/**
 * Generate a secure JWT secret key
 * This script generates a cryptographically secure random string
 * suitable for use as a JWT secret in production environments
 */

function generateJWTSecret(length = 64) {
  // Generate a cryptographically secure random string
  const secret = crypto.randomBytes(length).toString('hex');
  return secret;
}

function generateJWTSecretBase64(length = 48) {
  // Generate a base64 encoded secret (more compact)
  const secret = crypto.randomBytes(length).toString('base64');
  return secret;
}

function generateJWTSecretBase64URL(length = 48) {
  // Generate a base64url encoded secret (URL-safe)
  const secret = crypto.randomBytes(length).toString('base64url');
  return secret;
}

// Generate different types of secrets
console.log('🔐 JWT Secret Key Generator');
console.log('============================\n');

console.log('1. Hex Secret (64 bytes = 128 hex characters):');
console.log('JWT_SECRET=' + generateJWTSecret(64));
console.log('');

console.log('2. Base64 Secret (48 bytes):');
console.log('JWT_SECRET=' + generateJWTSecretBase64(48));
console.log('');

console.log('3. Base64URL Secret (48 bytes, URL-safe):');
console.log('JWT_SECRET=' + generateJWTSecretBase64URL(48));
console.log('');

console.log('4. Strong Production Secret (96 bytes):');
console.log('JWT_SECRET=' + generateJWTSecret(96));
console.log('');

console.log('📝 Usage Instructions:');
console.log('1. Copy one of the generated secrets above');
console.log('2. Set it as an environment variable:');
console.log('   export JWT_SECRET="your_generated_secret_here"');
console.log('3. Or add it to your .env file:');
console.log('   JWT_SECRET=your_generated_secret_here');
console.log('4. For Railway deployment:');
console.log('   railway variables set JWT_SECRET="your_generated_secret_here"');
console.log('');

console.log('⚠️  Security Notes:');
console.log('- Keep this secret secure and never commit it to version control');
console.log('- Use different secrets for different environments (dev, staging, prod)');
console.log('- Rotate secrets periodically for enhanced security');
console.log('- The recommended length is 64+ bytes for production use');
console.log('');

// Generate a specific secret for immediate use
const productionSecret = generateJWTSecret(64);
console.log('🚀 Ready-to-use Production Secret:');
console.log('JWT_SECRET=' + productionSecret);
console.log('');
console.log('Copy the above line and set it as your environment variable!');
