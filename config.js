require('dotenv').config();
const crypto = require('crypto');

// Generate a random default password for first-time setup (more secure than hardcoded '123456')
const generateRandomPassword = () => {
  return crypto.randomBytes(8).toString('hex'); // 16 char random password
};

// Generate a random JWT secret if not provided (unique per instance)
const generateJwtSecret = () => {
  return crypto.randomBytes(32).toString('hex'); // 64 char random secret
};

// Cache generated values so they persist during runtime
const defaultPassword = generateRandomPassword();
const defaultJwtSecret = generateJwtSecret();

// Warn if using default credentials in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set in production! Using random secret (will invalidate tokens on restart)');
}
if (isProduction && !process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  WARNING: ADMIN_PASSWORD not set in production! Using random password.');
}

// Log default password on first run (only if not set via env)
if (!process.env.ADMIN_PASSWORD) {
  console.log(`🔐 Default admin password generated: ${defaultPassword}`);
  console.log('   Please change it after first login or set ADMIN_PASSWORD env variable.');
}

module.exports = {
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || defaultPassword
  },
  server: {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || defaultJwtSecret
  }
}; 