import { test, expect, ProductsValidator } from './fixtures'
import { ProductStatus } from '@services/products/types'
import { createTestProduct } from './helpers'

test.describe('PATCH /products/:id/status', () => {
  test.describe('Valid Transitions', () => {
    test('should publish a draft product (draft → published)', async ({ productsClient }) => {
      const { id } = await createTestProduct(productsClient)
      const res = await productsClient.updateProductStatus(id, {
        status: ProductStatus.PUBLISHED,
      })
      await ProductsValidator.expectUpdateProductStatusSuccess(res, ProductStatus.PUBLISHED)
    })

    test('should unpublish back to draft (published → draft)', async ({ productsClient }) => {
      const { id } = await createTestProduct(productsClient)
      await productsClient.updateProductStatus(id, { status: ProductStatus.PUBLISHED })
      const res = await productsClient.updateProductStatus(id, { status: ProductStatus.DRAFT })
      await ProductsValidator.expectUpdateProductStatusSuccess(res, ProductStatus.DRAFT)
    })

    test('should archive a published product (published → archived)', async ({
      productsClient,
    }) => {
      const { id } = await createTestProduct(productsClient)
      await productsClient.updateProductStatus(id, { status: ProductStatus.PUBLISHED })
      const res = await productsClient.updateProductStatus(id, { status: ProductStatus.ARCHIVED })
      await ProductsValidator.expectUpdateProductStatusSuccess(res, ProductStatus.ARCHIVED)
    })

    test('should bump updatedAt on status change', async ({ productsClient }) => {
      const { id, updatedAt: before } = await createTestProduct(productsClient)
      const res = await productsClient.updateProductStatus(id, {
        status: ProductStatus.PUBLISHED,
      })
      await ProductsValidator.expectUpdateProductStatusSuccess(res, ProductStatus.PUBLISHED)
      const json = await res.json()
      // No fake delay — ISO timestamps order lexically, and the server bumps
      // on transition. If the server's clock resolution is coarse and this
      // ever flakes, switch to comparing parsed Date objects with `>`.
      expect(json.data.updatedAt > before).toBe(true)
    })
  })

  test.describe('Invalid Transitions', () => {
    test('should reject draft → archived directly', async ({ productsClient }) => {
      const { id } = await createTestProduct(productsClient)
      const res = await productsClient.updateProductStatus(id, {
        status: ProductStatus.ARCHIVED,
      })
      await ProductsValidator.expectError(res, 422)
    })

    test('should reject any transition from archived (terminal state)', async ({
      productsClient,
    }) => {
      const { id } = await createTestProduct(productsClient)
      await productsClient.updateProductStatus(id, { status: ProductStatus.PUBLISHED })
      await productsClient.updateProductStatus(id, { status: ProductStatus.ARCHIVED })

      const draftRes = await productsClient.updateProductStatus(id, {
        status: ProductStatus.DRAFT,
      })
      await ProductsValidator.expectError(draftRes, 422)

      const publishRes = await productsClient.updateProductStatus(id, {
        status: ProductStatus.PUBLISHED,
      })
      await ProductsValidator.expectError(publishRes, 422)
    })
  })

  test.describe('Negative Testing', () => {
    test('should return 404 for non-existent product', async ({ productsClient }) => {
      const res = await productsClient.updateProductStatus('non-existent-id-00000', {
        status: ProductStatus.PUBLISHED,
      })
      await ProductsValidator.expectError(res, 404)
    })
  })
})
