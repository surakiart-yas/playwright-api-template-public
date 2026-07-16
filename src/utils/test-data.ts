import { randomAlphanumericCode } from './random'

/**
 * Prefix applied to every resource created by automation. The global teardown
 * (`src/setup/global-teardown.ts`) deletes any resource whose name starts with
 * this value, so it must be distinctive enough to never collide with real data.
 */
export const TEST_PREFIX = 'test-'

/**
 * Generate a unique slug for test resources. Always starts with `TEST_PREFIX`.
 *
 * @example
 *   testSlug()          // "test-aBc12XyZ"
 *   testSlug('paging')  // "test-paging-aBc12XyZ"
 */
export function testSlug(descriptor?: string): string {
  const code = randomAlphanumericCode(8)
  return descriptor ? `${TEST_PREFIX}${descriptor}-${code}` : `${TEST_PREFIX}${code}`
}
