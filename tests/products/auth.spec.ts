/**
 * Auth-failure contract tests for the products service.
 *
 * Mirror of tests/users/auth.spec.ts — see that file for the rationale on
 * constructing fresh clients with bad/missing tokens instead of relying on
 * the fixture's auth gating.
 */
import { test, expect, ProductsValidator } from './fixtures'
import { ProductsClient } from '@services/products/ProductsClient'

test.describe('Auth — /products', () => {
  test('should return 401 with an invalid bearer token', async ({
    apiConfig,
    workerRequest,
  }, testInfo) => {
    const client = new ProductsClient(
      { ...apiConfig, authToken: 'invalid.token.value' },
      workerRequest,
      testInfo,
    )
    const res = await client.listProducts()
    await ProductsValidator.expectError(res, 401)
  })

  test('should return 401 when no authorization header is sent', async ({
    apiConfig,
    workerRequest,
  }, testInfo) => {
    const client = new ProductsClient(
      { ...apiConfig, authToken: undefined },
      workerRequest,
      testInfo,
    )
    const res = await client.listProducts()
    await ProductsValidator.expectError(res, 401)
  })

  test.skip('should return 403 when authenticated user lacks required role', async () => {
    // See tests/users/auth.spec.ts — mock does not model roles.
    expect(true).toBe(true)
  })
})
