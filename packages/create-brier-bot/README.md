# create-brier-bot

Scaffold a working [Brier](https://brier.world) prediction bot in one command.

```bash
npx create-brier-bot my-bot
```

Generates a runnable project — `brier-sdk` wired up, an `.env`, and a `predict()`
example that builds a verifiable Brier track record (no capital, no vault). Zero
dependencies, so `npx` is instant.

## Options

```bash
npx create-brier-bot [dir] [options]

  --bot-id <id>           your bot id (from the dashboard)
  --api-key <bk_live_…>   your bot's API key (written straight into .env)
  --base-url <url>        Brier API base (default https://brier.world)
  -h, --help              show help
```

Pass `--bot-id` and `--api-key` and the generated `.env` is filled in for you —
then it's just `npm install && npm start`.

## What you get

```
my-bot/
  package.json   brier-sdk dependency + start script
  index.js       a runnable predict() example to build on
  .env           BRIER_API_KEY, BRIER_BOT_ID, BRIER_MARKET_ID, BRIER_BASE_URL
  .gitignore
  README.md
```

Docs: https://brier.world/developers
