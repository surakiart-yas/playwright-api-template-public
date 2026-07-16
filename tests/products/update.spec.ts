import { test, expect, ProductsValidator } from './fixtures'
import { testSlug } from '@utils/test-data'
import { createTestProduct } from './helpers'

test.describe('PATCH /products/:id', () => {
  test.describe('Positive Testing', () => {
    test('should update product name', async ({ productsClient }) => {
      const { id } = await createTestProduct(productsClient)
      const newName = testSlug('updated')
      const res = await productsClient.updateProduct(id, { name: newName })
      await ProductsValidator.expectUpdateProductSuccess(res)
      const json = await res.json()
      expect(json.data).toMatchObject({ id, name: newName })
    })

    test('should update product price', async ({ productsClient }) => {
      const { id } = await createTestProduct(productsClient)
      const res = await productsClient.updateProduct(id, { price: 99.99 })
      await ProductsValidator.expectUpdateProductSuccess(res)
      const json = await res.json()
      expect(json.data.price).toBe(99.99)
    })

    test('should update product stock', async ({ productsClient }) => {
      const { id } = await createTestProduct(productsClient)
      const res = await productsClient.updateProduct(id, { stock: 500 })
      await ProductsValidator.expectUpdateProductSuccess(res)
      const json = await res.json()
      expect(json.data.stock).toBe(500)
    })
  })

  test.describe('Negative Testing', () => {
    test('should return 404 for non-existent product', async ({ productsClient }) => {
      const res = await productsClient.updateProduct('non-existent-id-00000', { name: 'Ghost' })
      await ProductsValidator.expectError(res, 404)
    })

    test('should reject empty name', async ({ productsClient }) => {
      const { id } = await createTestProduct(productsClient)
      const res = await productsClient.updateProduct(id, { name: '' })
      await ProductsValidator.expectError(res, 400)
    })

    test('should reject zero price', async ({ productsClient }) => {
      const { id } = await createTestProduct(productsClient)
      const res = await productsClient.updateProduct(id, { price: 0 })
      await ProductsValidator.expectError(res, 400)
    })
  })
})
