import { useEffect, useState } from 'react'

/**
 * Count-up animation hook. Animates the returned value from 0 to `target`
 * over `duration` ms (~60fps).
 *
 * `round` controls integer vs fractional output:
 *   - true  (default) → Math.floor, for whole-number displays (e.g. TVL)
 *   - false           → raw float, for decimal stat cards
 *
 * Unifies the two near-identical copies that previously lived in bot/[slug]
 * and maker/[address]; the maker stat cards animated decimals, so they pass
 * `round=false` (and their original 1000ms duration).
 */
export function useCountUp(target: number, duration = 1200, round = true): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) { setValue(0); return }
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setValue(target); clearInterval(timer) }
      else setValue(round ? Math.floor(start) : start)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, round])
  return value
}

export default useCountUp
