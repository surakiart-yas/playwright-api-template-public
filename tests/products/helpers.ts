import type { ProductsClient } from '@services/products/ProductsClient'
import type { Product, CreateProductRequest } from '@services/products/types'
import { ProductStatus } from '@services/products/types'
import { testSlug } from '@utils/test-data'

/**
 * Creates a draft product and returns the resolved Product object.
 *
 * Use this as a precondition in tests that need an existing product.
 * Throws if the API call fails — a failing precondition is a test failure, not a skip.
 *
 * @example
 * const product = await createTestProduct(productsClient)
 * const expensive = await createTestProduct(productsClient, { price: 999 })
 */
export async function createTestProduct(
  client: ProductsClient,
  overrides: Partial<CreateProductRequest> = {},
): Promise<Product> {
  const slug = testSlug()
  const res = await client.createProduct({
    name: slug,
    sku: `SKU-${slug}`,
    price: 9.99,
    stock: 10,
    ...overrides,
  })
  if (!res.ok()) {
    throw new Error(`[createTestProduct] setup failed: ${res.status()} ${await res.text()}`)
  }
  const json = await res.json()
  return json.data as Product
}

/**
 * Creates a product and immediately publishes it.
 * Use when the test requires a product in PUBLISHED state as a precondition.
 */
export async function createPublishedProduct(
  client: ProductsClient,
  overrides: Partial<CreateProductRequest> = {},
): Promise<Product> {
  const product = await createTestProduct(client, overrides)
  const res = await client.updateProductStatus(product.id, { status: ProductStatus.PUBLISHED })
  if (!res.ok()) {
    throw new Error(
      `[createPublishedProduct] status transition failed: ${res.status()} ${await res.text()}`,
    )
  }
  const json = await res.json()
  return json.data as Product
}
