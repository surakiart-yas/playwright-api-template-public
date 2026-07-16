import { request, type APIRequestContext } from '@playwright/test'
import { loadEnv } from '@utils/env'
import { loadApiConfig } from '@config/api-config'
import { getCachedToken, cacheToken, loginWithCredentials } from '@utils/auth'

/**
 * Quick probe: does this token still authenticate against the API?
 * Returns true on 2xx, false on 401/403, or true on network error
 * (so we don't punish offline runs — login will fail too and surface the issue).
 */
async function isTokenLive(
  ctx: APIRequestContext,
  baseUrl: string,
  token: string,
): Promise<boolean> {
  try {
    const res = await ctx.get(`${baseUrl.replace(/\/$/, '')}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { pageSize: '1' },
    })
    return res.status() !== 401 && res.status() !== 403
  } catch {
    return true
  }
}

export default async function globalSetup(): Promise<void> {
  loadEnv()

  if (process.env.API_AUTH_TOKEN) {
    console.log('[setup] Using API_AUTH_TOKEN from env')
    return
  }

  const config = loadApiConfig()
  const ctx = await request.newContext()

  try {
    const cached = getCachedToken()
    if (cached && (await isTokenLive(ctx, config.baseUrl, cached))) {
      process.env.API_AUTH_TOKEN = cached
      console.log('[setup] Using cached token (validated)')
      return
    }
    if (cached) {
      console.log('[setup] Cached token rejected by API — refreshing')
    }

    const username = process.env.API_ADMIN_USERNAME
    const password = process.env.API_ADMIN_PASSWORD
    if (!username || !password) {
      console.warn('[setup] API_ADMIN_USERNAME/PASSWORD not set — protected tests will skip')
      return
    }

    const token = await loginWithCredentials(ctx, config.baseUrl, username, password)
    if (token) {
      cacheToken(token)
      process.env.API_AUTH_TOKEN = token
      console.log('[setup] Auth token acquired')
    } else {
      console.warn('[setup] Login failed — protected tests will skip')
    }
  } finally {
    await ctx.dispose()
  }
}
