import type { APIResponse } from '@playwright/test'
import { expect } from '@playwright/test'
import { BaseValidator } from '@core/BaseValidator'
import { HttpStatus } from '@core/types'
import { ProductSchemas } from './schemas'
import { ProductStatus, type ProductStatusValue } from './types'

export class ProductsValidator extends BaseValidator {
  static async expectCreateProductSuccess(res: APIResponse): Promise<void> {
    await BaseValidator.expectSuccess(res, HttpStatus.CREATED)
    await BaseValidator.expectSchema(res, ProductSchemas.createProduct)
    const json = await res.json()
    expect(json.data.status).toBe(ProductStatus.DRAFT)
  }

  static async expectGetProductSuccess(res: APIResponse, expectedId: string): Promise<void> {
    await BaseValidator.expectSuccess(res)
    await BaseValidator.expectSchema(res, ProductSchemas.getProduct)
    const json = await res.json()
    expect(json.data.id).toBe(expectedId)
  }

  static async expectUpdateProductSuccess(res: APIResponse): Promise<void> {
    await BaseValidator.expectSuccess(res)
    await BaseValidator.expectSchema(res, ProductSchemas.updateProduct)
  }

  static async expectUpdateProductStatusSuccess(
    res: APIResponse,
    expectedStatus: ProductStatusValue,
  ): Promise<void> {
    await BaseValidator.expectSuccess(res)
    await BaseValidator.expectSchema(res, ProductSchemas.updateProductStatus)
    const json = await res.json()
    expect(json.data.status).toBe(expectedStatus)
  }

  static async expectDeleteProductSuccess(res: APIResponse): Promise<void> {
    BaseValidator.expectStatus(res, HttpStatus.NO_CONTENT)
  }

  static async expectListProductsSuccess(res: APIResponse): Promise<void> {
    await BaseValidator.expectSuccess(res)
    await BaseValidator.expectSchema(res, ProductSchemas.listProducts)
    const json = await res.json()
    expect(Array.isArray(json.data.items)).toBe(true)
    expect(typeof json.data.total).toBe('number')
  }
}
