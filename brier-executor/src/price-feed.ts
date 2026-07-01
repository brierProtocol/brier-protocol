/**
 * Live price feed for the Risk Engine.
 *
 * Polls the Polymarket CLOB midpoint REST API and caches each price in Redis
 * with a 5-second TTL. The Risk Engine's 1-second loop calls getLivePrice(),
 * so at most one HTTP call per token every 5 seconds.
 *
 * Endpoint: GET https://clob.polymarket.com/midpoint?token_id=<id>
 * Response:  { "mid": "0.72" }
 */

import axios from 'axios'

const CLOB_URL = process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com'
const CACHE_TTL_S = 5

/**
 * Returns the current mid-price (0..1) for a Polymarket outcome token.
 * Returns null if the token isn't found or the API is unreachable.
 *
 * Caches the result in Redis so repeated calls within CACHE_TTL_S seconds
 * hit Redis instead of the CLOB.
 */
export async function getLivePrice(tokenId: string, redis: any): Promise<number | null> {
  if (!tokenId) return null

  const cacheKey = `price:${tokenId}`

  // Redis first
  const cached = await redis.get(cacheKey).catch(() => null)
  if (cached !== null && cached !== undefined) return parseFloat(cached)

  // Fetch from CLOB
  try {
    const { data } = await axios.get(`${CLOB_URL}/midpoint`, {
      params: { token_id: tokenId },
      timeout: 3000,
    })
    const mid = parseFloat(data?.mid)
    if (!isFinite(mid)) return null

    await redis.setex(cacheKey, CACHE_TTL_S, mid.toString()).catch(() => null)
    return mid
  } catch {
    return null
  }
}
