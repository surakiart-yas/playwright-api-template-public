/**
 * Cross-service flow example.
 *
 * This file demonstrates the pattern for tests that need resources from multiple
 * services as preconditions. Real-world examples:
 *   - Create an order that belongs to a user and references a product
 *   - Assign a product to a category before testing category views
 *   - Verify audit log entries are created when a user modifies a product
 *
 * Pattern:
 *   1. Fixture provides clients (tests/flows/fixtures.ts)
 *   2. Helpers create precondition resources  (tests/<service>/helpers.ts)
 *   3. test.step() names each stage clearly in the HTML report
 *   4. The test body asserts only the cross-service outcome
 */
import { test, expect, UsersValidator, ProductsValidator } from './fixtures'
import { createTestUser, createTestAdmin } from '../users/helpers'
import { createPublishedProduct } from '../products/helpers'
import { testSlug } from '@utils/test-data'
import { ProductStatus as PS } from '@services/products/types'

// ── Example 1 ─────────────────────────────────────────────────────────────────
// Isolated test that needs a resource from another service as a precondition.
// The beforeEach creates the dependency; the test body asserts only its own endpoint.

test.describe('GET /products/:id — with seeded user context', () => {
  test('should return the product created in the same test run', async ({
    usersClient,
    productsClient,
  }) => {
    // Precondition: a known user exists (different service, different client)
    const user = await createTestUser(usersClient)
    expect(user.id).toBeTruthy()

    // Precondition: a known product exists
    const product = await createPublishedProduct(productsClient, {
      name: testSlug('ctx'),
      sku: `SKU-CTX-${testSlug()}`,
      price: 19.99,
    })

    // Assertion: the endpoint under test returns the correct product
    const res = await productsClient.getProductById(product.id)
    await ProductsValidator.expectGetProductSuccess(res, product.id)
    const json = await res.json()
    expect(json.data.status).toBe(PS.PUBLISHED)
  })
})

// ── Example 2 ─────────────────────────────────────────────────────────────────
// Multi-step flow that chains users + products service calls.
// Every step is explicitly named so the report reads as a business story.

test('Cross-service flow: admin manages a product lifecycle while user accounts exist', async ({
  usersClient,
  productsClient,
}) => {
  let adminId: string
  let userId: string
  let productId: string

  await test.step('Set up user accounts (precondition)', async () => {
    const admin = await createTestAdmin(usersClient)
    const user = await createTestUser(usersClient)
    adminId = admin.id
    userId = user.id
    expect(adminId).toBeTruthy()
    expect(userId).toBeTruthy()
  })

  await test.step('Admin creates a draft product', async () => {
    const slug = testSlug('cross')
    const res = await productsClient.createProduct({
      name: slug,
      sku: `SKU-${slug}`,
      price: 49.99,
      stock: 100,
    })
    await ProductsValidator.expectCreateProductSuccess(res)
    const json = await res.json()
    productId = json.data.id
  })

  await test.step('Admin publishes the product', async () => {
    const res = await productsClient.updateProductStatus(productId, {
      status: PS.PUBLISHED,
    })
    await ProductsValidator.expectUpdateProductStatusSuccess(res, PS.PUBLISHED)
  })

  await test.step('Both users are still fetchable (unaffected by product change)', async () => {
    const adminRes = await usersClient.getUserById(adminId)
    await UsersValidator.expectGetUserSuccess(adminRes, adminId)

    const userRes = await usersClient.getUserById(userId)
    await UsersValidator.expectGetUserSuccess(userRes, userId)
  })

  await test.step('Admin archives the product (end of lifecycle)', async () => {
    const res = await productsClient.updateProductStatus(productId, {
      status: PS.ARCHIVED,
    })
    await ProductsValidator.expectUpdateProductStatusSuccess(res, PS.ARCHIVED)
  })

  await test.step('Archived product is visible in the archived filter', async () => {
    const res = await productsClient.listProducts({ status: PS.ARCHIVED })
    await ProductsValidator.expectListProductsSuccess(res)
    const json = await res.json()
    const found = json.data.items.find((p: { id: string }) => p.id === productId)
    expect(found, 'Archived product should appear in archived list').toBeDefined()
  })
})
