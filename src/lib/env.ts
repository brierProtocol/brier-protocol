const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'ENCRYPTION_SECRET',
  'ALCHEMY_API_KEY',
  'NEXT_PUBLIC_WC_PROJECT_ID',
  'CRON_SECRET'
];

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    const errorMsg = `❌ Missing required environment variables: ${missing.join(', ')}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    } else {
      console.error(errorMsg);
    }
  }
  
  if (process.env.ENCRYPTION_SECRET && process.env.ENCRYPTION_SECRET.length < 32) {
    console.warn('⚠️ ENCRYPTION_SECRET is less than 32 characters. It should be a 32-byte hex string for security.');
  }
}
