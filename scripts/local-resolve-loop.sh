#!/bin/bash
# Local resolution loop: fires resolve-and-score every 3 min so predictions
# settle to HIT/MISS and reputation (LCB) advances during local testing.
# In production this is a Vercel cron; this is the dev equivalent.
URL="${BRIER_URL:-http://localhost:3000}"
echo "[resolve-loop] started against $URL"
while true; do
  R=$(curl -s "$URL/api/cron/resolve-and-score" 2>/dev/null)
  echo "[resolve-loop] $(date '+%H:%M:%S') $R"
  sleep 180
done
