import { test as base, expect } from '@fixtures/base'
import { ProductsClient } from '@services/products/ProductsClient'
import { ProductsValidator } from '@services/products/ProductsValidator'

export { expect, ProductsValidator }

type ProductsFixtures = {
  productsClient: ProductsClient
}

export const test = base.extend<ProductsFixtures>({
  productsClient: async ({ apiConfig, workerRequest, workerAuthToken }, use, testInfo) => {
    if (!workerAuthToken) {
      testInfo.skip(true, 'No auth token — set API_AUTH_TOKEN or configure worker credentials')
      return
    }
    await use(
      new ProductsClient({ ...apiConfig, authToken: workerAuthToken }, workerRequest, testInfo),
    )
  },
})
