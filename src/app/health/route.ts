/**
 * GET /health — alias of /api/health at the path both SDKs actually call
 * (BrierClient.health()). Same public dead-man's-switch report.
 */
export { GET, dynamic } from '../api/health/route'
