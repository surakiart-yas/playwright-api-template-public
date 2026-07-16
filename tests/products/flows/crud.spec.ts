import { test, expect, ProductsValidator } from '../fixtures'
import { testSlug } from '@utils/test-data'
import { HttpStatus } from '@core/types'

test('Product CRUD flow: create → list → update → get → delete', async ({ productsClient }) => {
  const slug = testSlug()
  let productId: string

  await test.step('Create product', async () => {
    const res = await productsClient.createProduct({
      name: slug,
      sku: `SKU-${slug}`,
      price: 29.99,
      stock: 50,
    })
    await ProductsValidator.expectCreateProductSuccess(res)
    const json = await res.json()
    productId = json.data.id
    expect(productId).toBeTruthy()
    expect(json.data.status).toBe('draft')
  })

  await test.step('Find product in list', async () => {
    const res = await productsClient.listProducts({ search: slug })
    await ProductsValidator.expectListProductsSuccess(res)
    const json = await res.json()
    const found = json.data.items.find((p: { id: string }) => p.id === productId)
    expect(found, 'Created product should appear in list').toBeDefined()
  })

  await test.step('Update product name and price', async () => {
    const updatedName = testSlug('updated')
    const res = await productsClient.updateProduct(productId, { name: updatedName, price: 39.99 })
    await ProductsValidator.expectUpdateProductSuccess(res)
    const json = await res.json()
    expect(json.data).toMatchObject({ name: updatedName, price: 39.99 })
  })

  await test.step('Verify update via get', async () => {
    const res = await productsClient.getProductById(productId)
    await ProductsValidator.expectGetProductSuccess(res, productId)
  })

  await test.step('Delete product', async () => {
    const res = await productsClient.deleteProduct(productId)
    await ProductsValidator.expectDeleteProductSuccess(res)
  })

  await test.step('Verify product is gone', async () => {
    const res = await productsClient.getProductById(productId)
    await ProductsValidator.expectError(res, HttpStatus.NOT_FOUND)
  })
})
