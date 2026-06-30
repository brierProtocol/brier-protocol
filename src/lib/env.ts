const REQUIRED_ENV_VARS = [
  'DATABASE_URL',          // pooled connection (pgbouncer) used by the app at runtime
  'DIRECT_URL',            // direct connection used by `prisma migrate deploy`
  'ENCRYPTION_SECRET',     // AES-256-GCM key for stored API credentials (lib/crypto.ts)
  'NEXT_PUBLIC_WC_PROJECT_ID', // WalletConnect project id
  'CRON_SECRET'            // auth for /api/cron/* (score, settle, status, sync)
];

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

  // Don't hard-fail during the production *build* (page-data collection) — only at runtime.
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  if (missing.length > 0) {
    const errorMsg = `❌ Missing required environment variables: ${missing.join(', ')}`;
    if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
      throw new Error(errorMsg);
    } else {
      console.error(errorMsg);
    }
  }
  
  if (process.env.ENCRYPTION_SECRET && process.env.ENCRYPTION_SECRET.length < 32) {
    console.warn('⚠️ ENCRYPTION_SECRET is less than 32 characters. It should be a 32-byte hex string for security.');
  }
}
