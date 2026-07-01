# Reputation scoring — backtest & validation

Validates the Brier reputation scoring design **before** we freeze it as protocol
core. Answers five questions that decide the design:

1. Is the ranking of good agents stable month over month?
2. How much variance does **Brier Skill Score (BSS)** have vs **Log Skill**?
3. What happens in low-liquidity markets?
4. How do wide spreads / mis-calibrated markets affect it?
5. Which produces fewer **false positives of "skill"** under real conditions?

## The two scoring candidates

Both are built on *proper* scoring rules and both measure skill **relative to the
market** (so copying the market scores ~0, which kills the main exploit):

- **BSS** = `mean[ (p_market − o)² − (p_bot − o)² ]` — bounded, robust, communicable.
- **Log Skill** = `mean[ log-score(p_bot) − log-score(p_market) ]` — information added
  over the market, in nats (log Bayes factor). Theoretically cleaner, but unbounded.

`p_market` is captured **at commit time** and is exogenous to the bot's report, so
the skill-relative form inherits propriety from its base rule.

## Findings so far (adversarial simulation — real markets still pending)

Run on a synthetic universe that models the real pathologies (fat tails, 35%
illiquid markets, wide spreads, 25% mis-calibrated markets, 2% UMA mis-resolution):

| | BSS | Log Skill |
|---|---|---|
| Q1 month-over-month rank stability (Spearman) | **0.76** | 0.49 |
| Q5 false-skill, liquid markets | 0% | 0% |
| Q5 false-skill, **illiquid markets** (point estimate) | **0%** | **38%** |
| Q5 illiquid, with lower-confidence-bound | 0% | 0% |

Plus a key structural finding: **almost all apparent edge comes from illiquid
markets** (beating a noisy baseline), not from beating sharp liquid markets. On
liquid markets even a genuinely skilled agent barely beats the crowd.

**Conclusions (to confirm on real data):**
- **BSS as the public headline score** — more stable rank, robust to illiquidity even
  on the point estimate.
- **Log Skill as an analytical/dataset metric** — spikier, needs the LCB crutch, more
  false positives on illiquid markets.
- **A liquidity filter is mandatory**, not optional — otherwise skill is dominated by
  noise from bad baselines.
- **Rank by a lower-confidence-bound** (empirical-Bayes shrinkage), never the raw point.
- **Builder-level aggregation** is the anti-Sybil defense (a separate sim shows
  cherry-picking the best of 200 zero-skill bots looks skilled 100% of the time, but
  the builder aggregate is correctly ~0).

> These are from synthetic-but-adversarial data. They are **not** real Polymarket
> data yet — Polymarket's API is network-blocked in our CI sandbox. Run the harness
> below where it is reachable to confirm on real markets.

## Run on real data

```bash
python3 scripts/research/backtest_reputation.py --markets 400 --commit-offset-hours 24
```

Fetches real resolved markets + price histories from Polymarket, injects synthetic
agents of known skill, and prints the five answers. When Brier is live, pass real
agent prediction logs with `--predictions <file.json>` to validate with real agents.

No API key needed. Pure standard library.
