import { test, expect, ProductsValidator } from './fixtures'
import { testSlug } from '@utils/test-data'

test.describe('POST /products', () => {
  test.describe('Positive Testing', () => {
    test('should create a product with default draft status', async ({ productsClient }) => {
      const slug = testSlug()
      const res = await productsClient.createProduct({
        name: slug,
        sku: `SKU-${slug}`,
        price: 49.99,
        stock: 100,
      })
      await ProductsValidator.expectCreateProductSuccess(res)
      const json = await res.json()
      expect(json.data).toMatchObject({
        name: slug,
        price: 49.99,
        stock: 100,
        status: 'draft',
      })
    })

    test('should create a product with zero stock when stock is omitted', async ({
      productsClient,
    }) => {
      const slug = testSlug()
      const res = await productsClient.createProduct({
        name: slug,
        sku: `SKU-${slug}`,
        price: 9.99,
      })
      await ProductsValidator.expectCreateProductSuccess(res)
      const json = await res.json()
      expect(json.data.stock).toBe(0)
    })
  })

  test.describe('Negative Testing', () => {
    test('should reject missing name', async ({ productsClient }) => {
      const res = await productsClient.createProduct({ name: '', sku: 'SKU-TEST', price: 10 })
      await ProductsValidator.expectError(res, 400)
    })

    test('should reject missing sku', async ({ productsClient }) => {
      const res = await productsClient.createProduct({ name: 'Test Product', sku: '', price: 10 })
      await ProductsValidator.expectError(res, 400)
    })

    test('should reject zero or negative price', async ({ productsClient }) => {
      const slug = testSlug()
      const res = await productsClient.createProduct({
        name: slug,
        sku: `SKU-${slug}`,
        price: 0,
      })
      await ProductsValidator.expectError(res, 400)
    })

    test('should reject duplicate SKU', async ({ productsClient }) => {
      const slug = testSlug()
      const sku = `SKU-${slug}`
      await productsClient.createProduct({ name: slug, sku, price: 10 })
      const res = await productsClient.createProduct({ name: testSlug(), sku, price: 20 })
      await ProductsValidator.expectError(res, 409)
    })
  })
})
