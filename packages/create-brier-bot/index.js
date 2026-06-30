#!/usr/bin/env node
'use strict'

/**
 * create-brier-bot — scaffold a working Brier prediction bot in one command.
 *
 *   npx create-brier-bot [dir] [--bot-id <id>] [--api-key <bk_live_...>]
 *
 * Generates a runnable project: the @brier/sdk wired up, an .env, and a predict()
 * example that builds a verifiable Brier track record (no capital, no vault).
 * Zero dependencies — pure Node, so `npx` is instant.
 */

const fs = require('fs')
const path = require('path')

// ── parse args ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const flags = {}
const positional = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--bot-id') flags.botId = argv[++i]
  else if (a === '--api-key') flags.apiKey = argv[++i]
  else if (a === '--base-url') flags.baseUrl = argv[++i]
  else if (a === '-h' || a === '--help') flags.help = true
  else positional.push(a)
}

if (flags.help) {
  console.log(`
create-brier-bot — scaffold a Brier prediction bot

Usage:
  npx create-brier-bot [dir] [options]

Options:
  --bot-id <id>          your bot id (from the dashboard)
  --api-key <bk_live_…>  your bot's API key (written to .env)
  --base-url <url>       Brier API base (default https://brier.world)
  -h, --help             show this help
`)
  process.exit(0)
}

const dir = positional[0] || 'my-brier-bot'
const target = path.resolve(process.cwd(), dir)
const name = path.basename(target).replace(/[^a-z0-9-]/gi, '-').toLowerCase()

// ── guard: don't clobber a non-empty dir ────────────────────────────────────
if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
  console.error(`\n  ✗ "${dir}" already exists and is not empty. Pick another directory.\n`)
  process.exit(1)
}

// ── templates ───────────────────────────────────────────────────────────────
const pkg = {
  name,
  version: '0.1.0',
  private: true,
  type: 'module',
  scripts: { start: 'node index.js' },
  dependencies: { '@brier/sdk': '^0.1.0' },
  engines: { node: '>=18' },
}

const indexJs = `import { BrierClient } from '@brier/sdk'

// The Brier client signs every request with your API key.
const brier = new BrierClient({
  baseUrl: process.env.BRIER_BASE_URL || 'https://brier.world',
  apiKey: process.env.BRIER_API_KEY,
})

// ─────────────────────────────────────────────────────────────────────────────
// Your strategy lives here. Decide a probability for a real market, then commit
// it. No capital, no vault — you're building a verifiable Brier track record.
// Resolution happens automatically when the market settles on Polymarket.
// ─────────────────────────────────────────────────────────────────────────────
async function run() {
  if (!process.env.BRIER_API_KEY || !process.env.BRIER_BOT_ID) {
    console.error('Set BRIER_API_KEY and BRIER_BOT_ID in .env first.')
    process.exit(1)
  }

  const res = await brier.predict({
    botId: process.env.BRIER_BOT_ID,
    marketId: process.env.BRIER_MARKET_ID || '0xReplaceWithAMarketConditionId',
    side: 'YES',
    probability: 0.62, // your P(YES wins), strictly between 0 and 1
  })

  console.log('Prediction committed:', res)
}

run().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
`

const envBody = [
  `# Your bot's API key — generate it in the dashboard ("Generate API key").`,
  `BRIER_API_KEY=${flags.apiKey || 'bk_live_replace_me'}`,
  ``,
  `# Your bot id (from the dashboard).`,
  `BRIER_BOT_ID=${flags.botId || 'replace_with_your_bot_id'}`,
  ``,
  `# A market conditionId you want to predict on.`,
  `BRIER_MARKET_ID=0xReplaceWithAMarketConditionId`,
  ``,
  `# The Brier API (leave as-is unless self-hosting).`,
  `BRIER_BASE_URL=${flags.baseUrl || 'https://brier.world'}`,
  ``,
].join('\n')

const readme = `# ${name}

A Brier prediction bot. Commit predictions on real markets and build a verifiable
Brier Score — no capital, no vault.

## Run

\`\`\`bash
npm install
# fill in .env (BRIER_API_KEY, BRIER_BOT_ID, BRIER_MARKET_ID)
npm start
\`\`\`

Edit \`index.js\` to add your strategy. Each \`brier.predict({...})\` commits one
prediction; the outcome is resolved independently when the market settles.

Docs: https://brier.world/developers
`

const gitignore = `node_modules/\n.env\n`
const envExampleNote = (flags.apiKey || flags.botId)
  ? '.env (filled from your flags)'
  : '.env (placeholders — edit before running)'

// ── write ───────────────────────────────────────────────────────────────────
fs.mkdirSync(target, { recursive: true })
const write = (file, contents) => fs.writeFileSync(path.join(target, file), contents)

write('package.json', JSON.stringify(pkg, null, 2) + '\n')
write('index.js', indexJs)
write('.env', envBody)
write('.gitignore', gitignore)
write('README.md', readme)

// ── done ────────────────────────────────────────────────────────────────────
console.log(`
  ✓ Created ${name} in ${dir}/
    package.json   @brier/sdk wired up
    index.js       a runnable predict() example
    ${envExampleNote}

  Next:
    cd ${dir}
    npm install
    # set BRIER_API_KEY + BRIER_BOT_ID in .env
    npm start

  Build your strategy in index.js. Docs: https://brier.world/developers
`)
