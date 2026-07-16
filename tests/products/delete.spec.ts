import { test, ProductsValidator } from './fixtures'
import { testSlug } from '@utils/test-data'
import { HttpStatus } from '@core/types'
import { ProductStatus } from '@services/products/types'

test.describe('DELETE /products/:id', () => {
  test.describe('Positive Testing', () => {
    test('should delete a draft product', async ({ productsClient }) => {
      const slug = testSlug()
      const createRes = await productsClient.createProduct({
        name: slug,
        sku: `SKU-${slug}`,
        price: 9.99,
      })
      const { data } = await createRes.json()
      const deleteRes = await productsClient.deleteProduct(data.id)
      await ProductsValidator.expectDeleteProductSuccess(deleteRes)
      const getRes = await productsClient.getProductById(data.id)
      await ProductsValidator.expectError(getRes, HttpStatus.NOT_FOUND)
    })
  })

  test.describe('Negative Testing', () => {
    test('should return 404 for non-existent product', async ({ productsClient }) => {
      const res = await productsClient.deleteProduct('non-existent-id-00000')
      await ProductsValidator.expectError(res, 404)
    })

    test('should return 404 on double delete', async ({ productsClient }) => {
      const slug = testSlug()
      const createRes = await productsClient.createProduct({
        name: slug,
        sku: `SKU-${slug}`,
        price: 9.99,
      })
      const { data } = await createRes.json()
      await productsClient.deleteProduct(data.id)
      const res = await productsClient.deleteProduct(data.id)
      await ProductsValidator.expectError(res, 404)
    })

    test('should reject deleting a published product', async ({ productsClient }) => {
      const slug = testSlug()
      const createRes = await productsClient.createProduct({
        name: slug,
        sku: `SKU-${slug}`,
        price: 9.99,
      })
      const { data } = await createRes.json()
      await productsClient.updateProductStatus(data.id, { status: ProductStatus.PUBLISHED })
      const res = await productsClient.deleteProduct(data.id)
      await ProductsValidator.expectError(res, 422)
    })
  })
})
