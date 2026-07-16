import type { TestInfo } from '@playwright/test'

export interface ApiInteraction {
  request: { method: string; url: string; headers: Record<string, string>; body?: unknown }
  response: { status: number; responseMs: number; body: unknown }
}

export async function attachApiInteraction(
  testInfo: TestInfo,
  name: string,
  interaction: ApiInteraction,
): Promise<void> {
  await testInfo.attach(name, {
    contentType: 'application/json',
    body: Buffer.from(JSON.stringify(interaction, null, 2)),
  })
}
