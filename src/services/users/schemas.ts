import { responseSchema, listResponseSchema, emptyResponseSchema } from '@core/schemas'

const userSchema = {
  type: 'object',
  required: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
    role: { type: 'string', enum: ['admin', 'user', 'viewer'] },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  additionalProperties: false,
}

export const UserSchemas = {
  createUser: responseSchema(userSchema),
  getUser: responseSchema(userSchema),
  updateUser: responseSchema(userSchema),
  deleteUser: emptyResponseSchema,
  listUsers: listResponseSchema(userSchema),
}
