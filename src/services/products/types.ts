export const ProductStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const

export type ProductStatusValue = (typeof ProductStatus)[keyof typeof ProductStatus]

export interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  status: ProductStatusValue
  createdAt: string
  updatedAt: string
}

export interface CreateProductRequest {
  name: string
  sku: string
  price: number
  stock?: number
}

export interface UpdateProductRequest {
  name?: string
  price?: number
  stock?: number
}

export interface UpdateProductStatusRequest {
  status: ProductStatusValue
}

export interface ProductListRequest {
  page?: number
  pageSize?: number
  search?: string
  status?: ProductStatusValue
}

export interface ProductListData {
  items: Product[]
  total: number
  page: number
  pageSize: number
}
