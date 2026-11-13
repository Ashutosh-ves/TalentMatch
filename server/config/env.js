/**
 * Validates required environment variables at startup before database initialization.
 * Prints missing variable names (never their values) and exits with code 1.
 */
const validateEnv = () => {
  const missing = [];

  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    missing.push('JWT_SECRET');
  }

  if (!process.env.MONGODB_URI || !process.env.MONGODB_URI.trim()) {
    missing.push('MONGODB_URI');
  }

  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.CLIENT_URL || !process.env.CLIENT_URL.trim())
  ) {
    missing.push('CLIENT_URL');
  }

  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.warn(
      'Warning: JWT_SECRET is shorter than 32 characters. Use at least 32 characters in production.'
    );
  }
};

module.exports = validateEnv;

