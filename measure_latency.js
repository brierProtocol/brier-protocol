const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
async function main() {
  const prisma = new PrismaClient();
  const jsonl = fs.readFileSync('/Users/benjaminfuentes/adan-pred/data/feature_log.jsonl', 'utf8').split('\n').filter(Boolean);
  
  const localTrades = new Map();
  for(const row of jsonl) {
    try {
      const d = JSON.parse(row);
      if(d.type === 'entry' && d.condition_id && d.ts) {
        localTrades.set(d.condition_id, new Date(d.ts).getTime());
      }
    } catch(e){}
  }

  const preds = await prisma.botPrediction.findMany({
    where: { bot: { slug: 'adan' } },
    select: { conditionId: true, createdAt: true }
  });

  let latencies = [];
  let found = 0;

  for(const p of preds) {
    if(localTrades.has(p.conditionId)) {
      const entryTime = localTrades.get(p.conditionId);
      const brierTime = new Date(p.createdAt).getTime();
      const diffMs = brierTime - entryTime;
      if(diffMs > -10000 && diffMs < 600000) {
        latencies.push(diffMs);
        found++;
      }
    }
  }

  if(latencies.length === 0) {
    console.log("No overlapping trades found to measure latency.");
    return;
  }

  latencies.sort((a,b) => a - b);
  const avg = latencies.reduce((a,b)=>a+b, 0) / latencies.length;
  const p50 = latencies[Math.floor(latencies.length * 0.50)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];

  console.log(`Measured Latency for ${found} trades:`);
  console.log(`Average: ${(avg / 1000).toFixed(2)}s`);
  console.log(`p50 (Median): ${(p50 / 1000).toFixed(2)}s`);
  console.log(`p95: ${(p95 / 1000).toFixed(2)}s`);

  await prisma.$disconnect();
}
main().catch(console.error);
