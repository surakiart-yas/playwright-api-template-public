/**
 * Shared fixture for cross-service flow tests.
 *
 * When a test needs clients from more than one service, import `test` from here
 * instead of from the individual service fixture files.
 *
 * Rule: add a new client fixture here only when it is needed as a precondition
 * or assertion target in a multi-service flow. Single-service tests should keep
 * using their own tests/<service>/fixtures.ts.
 *
 * Usage:
 *   import { test, expect, UsersValidator, ProductsValidator } from '../flows/fixtures'
 */
import { test as base, expect } from '@fixtures/base'
import { UsersClient } from '@services/users/UsersClient'
import { ProductsClient } from '@services/products/ProductsClient'
import { UsersValidator } from '@services/users/UsersValidator'
import { ProductsValidator } from '@services/products/ProductsValidator'

export { expect, UsersValidator, ProductsValidator }

type CrossServiceFixtures = {
  usersClient: UsersClient
  productsClient: ProductsClient
  // ADAPT: add more clients here as new services are added to the project
}

const SKIP_MSG = 'No auth token — set API_AUTH_TOKEN or configure worker credentials'

export const test = base.extend<CrossServiceFixtures>({
  usersClient: async ({ apiConfig, workerRequest, workerAuthToken }, use, testInfo) => {
    if (!workerAuthToken) {
      testInfo.skip(true, SKIP_MSG)
      return
    }
    await use(
      new UsersClient({ ...apiConfig, authToken: workerAuthToken }, workerRequest, testInfo),
    )
  },

  productsClient: async ({ apiConfig, workerRequest, workerAuthToken }, use, testInfo) => {
    if (!workerAuthToken) {
      testInfo.skip(true, SKIP_MSG)
      return
    }
    await use(
      new ProductsClient({ ...apiConfig, authToken: workerAuthToken }, workerRequest, testInfo),
    )
  },
})
