#!/bin/bash
# Local stand-in for the Vercel crons while developing.
# Hits /api/cron/sync (wallet indexer) and /api/cron/score (Brier recompute)
# against the local dev server every 10 minutes.

BASE="${BRIER_URL:-http://localhost:3000}"

echo "[CRON] local cron loop started against $BASE (every 10m)"
while true; do
  TS=$(date '+%H:%M:%S')
  SYNC=$(curl -s -m 60 "$BASE/api/cron/sync" | head -c 120)
  SCORE=$(curl -s -m 120 "$BASE/api/cron/score" | head -c 200)
  echo "[CRON] $TS sync: $SYNC"
  echo "[CRON] $TS score: $SCORE"
  sleep 600
done
