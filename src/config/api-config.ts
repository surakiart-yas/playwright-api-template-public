import type { ApiConfig } from '@core/types'

/**
 * Loads infrastructure config from environment variables.
 *
 * Auth-token precedence (highest wins):
 *   1. `workerAuthToken` fixture override in service fixtures (worker-pool login)
 *   2. `API_AUTH_TOKEN` env var (read here into `authToken`)
 *   3. `undefined` — test will be skipped by service fixtures (see `tests/<svc>/fixtures.ts`)
 *
 * NEVER consume `apiConfig.authToken` directly from a test fixture without first
 * checking `workerAuthToken` — see `tests/users/fixtures.ts` for the correct pattern.
 */
// ADAPT: add/remove required env vars for your project
export function loadApiConfig(): ApiConfig {
  const required: Record<string, string | undefined> = {
    API_BASE_URL: process.env.API_BASE_URL,
  }

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k)

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  return {
    baseUrl: required.API_BASE_URL!.replace(/\/$/, ''),
    maxResponseMs: parseInt(process.env.API_MAX_RESPONSE_MS ?? '5000', 10),
    authToken: process.env.API_AUTH_TOKEN,
  }
}
