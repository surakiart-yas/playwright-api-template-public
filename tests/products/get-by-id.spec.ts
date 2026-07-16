import { test, ProductsValidator } from './fixtures'

// Happy path is covered in flows/get-by-id.spec.ts
// This file covers error cases only
test.describe('GET /products/:id — error cases', () => {
  test('should return 404 for non-existent product', async ({ productsClient }) => {
    const res = await productsClient.getProductById('non-existent-id-00000')
    await ProductsValidator.expectError(res, 404)
  })

  test('should return 400 for malformed id', async ({ productsClient }) => {
    const res = await productsClient.getProductById('!!invalid!!')
    await ProductsValidator.expectError(res, 400)
  })
})
