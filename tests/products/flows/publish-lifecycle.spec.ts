import { test, expect, ProductsValidator } from '../fixtures'
import { testSlug } from '@utils/test-data'
import { ProductStatus } from '@services/products/types'

test('Publish lifecycle flow: create → publish → update price → archive → verify terminal', async ({
  productsClient,
}) => {
  const slug = testSlug('publish')
  let productId: string

  await test.step('Create draft product', async () => {
    const res = await productsClient.createProduct({
      name: slug,
      sku: `SKU-${slug}`,
      price: 19.99,
      stock: 100,
    })
    await ProductsValidator.expectCreateProductSuccess(res)
    const json = await res.json()
    productId = json.data.id
    expect(json.data.status).toBe(ProductStatus.DRAFT)
  })

  await test.step('Publish the product', async () => {
    const res = await productsClient.updateProductStatus(productId, {
      status: ProductStatus.PUBLISHED,
    })
    await ProductsValidator.expectUpdateProductStatusSuccess(res, ProductStatus.PUBLISHED)
  })

  await test.step('Update price while published', async () => {
    const res = await productsClient.updateProduct(productId, { price: 24.99 })
    await ProductsValidator.expectUpdateProductSuccess(res)
    const json = await res.json()
    expect(json.data).toMatchObject({ price: 24.99, status: ProductStatus.PUBLISHED })
  })

  await test.step('Verify product is visible in published filter', async () => {
    const res = await productsClient.listProducts({
      status: ProductStatus.PUBLISHED,
      search: slug,
    })
    await ProductsValidator.expectListProductsSuccess(res)
    const json = await res.json()
    const found = json.data.items.find((p: { id: string }) => p.id === productId)
    expect(found, 'Product should appear in published list').toBeDefined()
  })

  await test.step('Archive the product', async () => {
    const res = await productsClient.updateProductStatus(productId, {
      status: ProductStatus.ARCHIVED,
    })
    await ProductsValidator.expectUpdateProductStatusSuccess(res, ProductStatus.ARCHIVED)
  })

  await test.step('Verify archived product cannot be re-published (terminal state)', async () => {
    const res = await productsClient.updateProductStatus(productId, {
      status: ProductStatus.PUBLISHED,
    })
    await ProductsValidator.expectError(res, 422)
  })

  await test.step('Verify archived product cannot be deleted', async () => {
    const res = await productsClient.deleteProduct(productId)
    await ProductsValidator.expectError(res, 422)
  })
})
