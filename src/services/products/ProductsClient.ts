import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test'
import { BaseClient } from '@core/BaseClient'
import type { ApiConfig, ApiResponse } from '@core/types'
import type {
  CreateProductRequest,
  UpdateProductRequest,
  UpdateProductStatusRequest,
  ProductListRequest,
  Product,
  ProductListData,
} from './types'

export class ProductsClient extends BaseClient {
  constructor(config: ApiConfig, request: APIRequestContext, testInfo?: TestInfo) {
    super(config, request, testInfo)
  }

  async createProduct(data: CreateProductRequest): Promise<APIResponse> {
    return this.post<ApiResponse<Product>>('products', data, undefined, 'Create Product')
  }

  async getProductById(id: string): Promise<APIResponse> {
    return this.get<ApiResponse<Product>>(`products/${id}`, undefined, undefined, 'Get Product')
  }

  async updateProduct(id: string, data: UpdateProductRequest): Promise<APIResponse> {
    return this.patch<ApiResponse<Product>>(`products/${id}`, data, undefined, 'Update Product')
  }

  async updateProductStatus(id: string, data: UpdateProductStatusRequest): Promise<APIResponse> {
    return this.patch<ApiResponse<Product>>(
      `products/${id}/status`,
      data,
      undefined,
      'Update Product Status',
    )
  }

  async deleteProduct(id: string): Promise<APIResponse> {
    return this.del<ApiResponse<null>>(`products/${id}`, undefined, 'Delete Product')
  }

  async listProducts(params?: ProductListRequest): Promise<APIResponse> {
    return this.get<ApiResponse<ProductListData>>(
      'products',
      // Convert the typed request into the param shape sendRequest expects.
      // Safe — every field on ProductListRequest is a primitive or undefined.
      params as Record<string, string | number | boolean | undefined | null> | undefined,
      undefined,
      'List Products',
    )
  }
}
