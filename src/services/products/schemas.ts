import { responseSchema, listResponseSchema, emptyResponseSchema } from '@core/schemas'

const productSchema = {
  type: 'object',
  required: ['id', 'name', 'sku', 'price', 'stock', 'status', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    sku: { type: 'string' },
    price: { type: 'number' },
    stock: { type: 'number' },
    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  additionalProperties: false,
}

export const ProductSchemas = {
  createProduct: responseSchema(productSchema),
  getProduct: responseSchema(productSchema),
  updateProduct: responseSchema(productSchema),
  updateProductStatus: responseSchema(productSchema),
  deleteProduct: emptyResponseSchema,
  listProducts: listResponseSchema(productSchema),
}
