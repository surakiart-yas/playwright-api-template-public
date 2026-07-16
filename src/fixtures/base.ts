import { test as base } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { loadApiConfig } from '@config/api-config'
import { loadEnv } from '@utils/env'
import { warmUpConnection } from '@utils/warmup'
import type { ApiConfig } from '@core/types'

loadEnv()

type TestFixtures = {
  apiConfig: ApiConfig
}

type WorkerFixtures = {
  workerRequest: APIRequestContext
  workerAuthToken: string | undefined
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerRequest: [
    async ({ playwright }, use) => {
      const config = loadApiConfig()
      const ctx = await playwright.request.newContext({
        baseURL: config.baseUrl,
        extraHTTPHeaders: { 'Content-Type': 'application/json', Accept: 'application/json' },
      })
      await warmUpConnection(ctx, config.baseUrl)
      await use(ctx)
      await ctx.dispose()
    },
    { scope: 'worker' },
  ],

  // Auth token is acquired once in global-setup.ts and shared across all workers.
  workerAuthToken: [
    async ({}, use) => {
      await use(process.env.API_AUTH_TOKEN)
    },
    { scope: 'worker' },
  ],

  apiConfig: async ({}, use) => {
    await use(loadApiConfig())
  },
})

export { expect } from '@playwright/test'
