/**
 * GET /health — alias of /api/health at the path both SDKs actually call
 * (BrierClient.health()). Same public dead-man's-switch report.
 */
// `dynamic` is declared directly (not re-exported): Turbopack cannot statically
// parse a re-exported route-segment config, so `export { dynamic } from …` fails
// the build. Mirror the source value in ../api/health/route.
export { GET } from '../api/health/route'
export const dynamic = 'force-dynamic'
