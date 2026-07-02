-- AlterTable
-- Live telemetry columns piggy-backed on the bot heartbeat (see src/lib/heartbeat.ts).
-- Additive and nullable: safe to apply to prod (Supabase) with `prisma migrate deploy`.
ALTER TABLE "Bot" ADD COLUMN     "liveActivity" TEXT,
ADD COLUMN     "liveConstraints" TEXT;
