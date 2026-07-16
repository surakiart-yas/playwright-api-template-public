import { defineConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

const env = process.env.TEST_ENV ?? 'local'
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Bundled mock is active for unset/local environments only.
// External environments (dev/staging/prod) must point API_BASE_URL at their own service.
const useMock = !['dev', 'staging', 'prod'].includes(env)
const mockPort = Number(process.env.MOCK_PORT ?? 4010)
const mockBaseUrl = `http://localhost:${mockPort}/api`

if (useMock) {
  process.env.API_BASE_URL = process.env.API_BASE_URL ?? mockBaseUrl
  process.env.API_ADMIN_USERNAME = process.env.API_ADMIN_USERNAME ?? 'admin@example.com'
  process.env.API_ADMIN_PASSWORD = process.env.API_ADMIN_PASSWORD ?? 'Admin@123456'
}

function discoverProjects(): { name: string; testDir: string }[] {
  const testsDir = path.resolve(__dirname, 'tests')
  if (!fs.existsSync(testsDir)) return [{ name: 'api', testDir: './tests' }]
  return fs
    .readdirSync(testsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, testDir: `./tests/${d.name}` }))
}

export default defineConfig({
  globalSetup: './src/setup/global-setup.ts',
  globalTeardown: './src/setup/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    process.env.CI ? ['github'] : ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.API_BASE_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    trace: 'on-first-retry',
  },
  webServer: useMock
    ? {
        // Use `npx tsx` instead of `pnpm mock` so VS Code's Playwright extension
        // can start the mock even when pnpm isn't on its PATH (Corepack / nvm).
        command: 'npx tsx mocks/server.ts',
        url: `${mockBaseUrl}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
        stdout: 'ignore',
        stderr: 'pipe',
      }
    : undefined,
  projects: discoverProjects(),
})
