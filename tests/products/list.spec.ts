import { test, expect, ProductsValidator } from './fixtures'
import { testSlug } from '@utils/test-data'
import { ProductStatus } from '@services/products/types'

test.describe('GET /products', () => {
  test.describe('Positive Testing', () => {
    test('should return list with valid schema', async ({ productsClient }) => {
      const res = await productsClient.listProducts()
      await ProductsValidator.expectListProductsSuccess(res)
    })

    test('should respect page and pageSize params', async ({ productsClient }) => {
      const res = await productsClient.listProducts({ page: 1, pageSize: 1 })
      await ProductsValidator.expectListProductsSuccess(res)
      const json = await res.json()
      expect(json.data).toMatchObject({ page: 1, pageSize: 1 })
      expect(json.data.items.length).toBeLessThanOrEqual(1)
    })

    test('should filter by status', async ({ productsClient }) => {
      const slug = testSlug('filter')
      await productsClient.createProduct({ name: slug, sku: `SKU-${slug}`, price: 5 })

      const res = await productsClient.listProducts({ status: ProductStatus.DRAFT, search: slug })
      await ProductsValidator.expectListProductsSuccess(res)
      const json = await res.json()
      expect(json.data.items.length).toBeGreaterThanOrEqual(1)
      expect(json.data.items.every((p: { status: string }) => p.status === 'draft')).toBe(true)
    })

    test('should return non-overlapping pages', async ({ productsClient }) => {
      const created: string[] = []
      for (let i = 0; i < 4; i++) {
        const slug = testSlug('paging')
        const res = await productsClient.createProduct({
          name: slug,
          sku: `SKU-${slug}`,
          price: 1,
        })
        const json = await res.json()
        if (json.data?.id) created.push(json.data.id as string)
      }

      try {
        const page1 = await (await productsClient.listProducts({ page: 1, pageSize: 2 })).json()
        const page2 = await (await productsClient.listProducts({ page: 2, pageSize: 2 })).json()
        const ids1 = page1.data.items.map((p: { id: string }) => p.id)
        const ids2 = page2.data.items.map((p: { id: string }) => p.id)
        expect(ids1.filter((id: string) => ids2.includes(id))).toHaveLength(0)
      } finally {
        await Promise.all(created.map((id) => productsClient.deleteProduct(id).catch(() => {})))
      }
    })

    test('should include expected response headers', async ({ productsClient }) => {
      const res = await productsClient.listProducts()
      expect(res.headers()['content-type']).toContain('application/json')
    })
  })

  test.describe('Negative Testing', () => {
    test('should reject negative page', async ({ productsClient }) => {
      const res = await productsClient.listProducts({ page: -1 })
      await ProductsValidator.expectError(res, 400, 'page')
    })

    test('should reject zero page', async ({ productsClient }) => {
      const res = await productsClient.listProducts({ page: 0 })
      await ProductsValidator.expectError(res, 400, 'page')
    })

    test('should reject pageSize over 100', async ({ productsClient }) => {
      const res = await productsClient.listProducts({ pageSize: 9999 })
      await ProductsValidator.expectError(res, 400, 'pageSize')
    })

    test('should reject zero pageSize', async ({ productsClient }) => {
      const res = await productsClient.listProducts({ pageSize: 0 })
      await ProductsValidator.expectError(res, 400, 'pageSize')
    })

    test('should reject malformed status filter', async ({ productsClient }) => {
      // @ts-expect-error -- intentionally invalid value for negative testing
      const res = await productsClient.listProducts({ status: 'INVALID_STATUS' })
      await ProductsValidator.expectError(res, 400, 'status')
    })
  })
})
