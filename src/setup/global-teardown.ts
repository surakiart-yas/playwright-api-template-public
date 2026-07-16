import { request, type APIRequestContext } from '@playwright/test'
import { loadEnv } from '@utils/env'
import { loadApiConfig } from '@config/api-config'
import { TEST_PREFIX } from '@utils/test-data'

type ResourceItem = Record<string, unknown> & { id: string; name: string }

interface CleanupOptions {
  /** Return false to skip deletion (e.g. non-deletable states). Item is logged as skipped. */
  canDelete?: (item: ResourceItem) => boolean
}

async function cleanupResource(
  ctx: APIRequestContext,
  base: string,
  resource: string,
  options: CleanupOptions = {},
): Promise<void> {
  const pageSize = 100
  const allItems: ResourceItem[] = []

  // Pagination loop — without this, anything past page 1 leaks forever when
  // many autotest resources accumulate (CI failures, partial cleanups, etc.).
  for (let page = 1; page < 1000; page++) {
    const listRes = await ctx.get(`${base}/${resource}`, {
      params: { search: TEST_PREFIX, page: String(page), pageSize: String(pageSize) },
    })
    if (!listRes.ok()) {
      console.warn(
        `[teardown] ${resource}: list page ${page} returned ${listRes.status()} — stopping pagination`,
      )
      break
    }
    const { data } = await listRes.json()
    const items: ResourceItem[] = (data?.items ?? []).filter((i: ResourceItem) =>
      i.name?.startsWith(TEST_PREFIX),
    )
    allItems.push(...items)
    if (items.length < pageSize) break
  }

  for (const item of allItems) {
    if (options.canDelete && !options.canDelete(item)) {
      console.log(`[teardown] ${resource}/${item.id} skipped (non-deletable state)`)
      continue
    }
    const res = await ctx.delete(`${base}/${resource}/${item.id}`)
    console.log(`[teardown] ${resource}/${item.id} → ${res.status()}`)
  }
}

export default async function globalTeardown(): Promise<void> {
  loadEnv()

  const token = process.env.API_AUTH_TOKEN
  if (!token) {
    console.log('[teardown] No auth token — skipping cleanup')
    return
  }
  console.log('[teardown] Starting cleanup')

  let config: ReturnType<typeof loadApiConfig>
  try {
    config = loadApiConfig()
  } catch (err) {
    console.warn('[teardown] Skipping cleanup — API config unavailable:', (err as Error).message)
    return
  }

  const base = config.baseUrl.replace(/\/$/, '')
  const ctx = await request.newContext({
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  try {
    // ADAPT: add or replace resource cleanup blocks for each service in your project
    await cleanupResource(ctx, base, 'users')
    await cleanupResource(ctx, base, 'products', {
      canDelete: (item) => (item as { status?: string }).status === 'draft',
    })
  } finally {
    await ctx.dispose()
  }
}
