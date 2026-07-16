// Envelope schemas use `additionalProperties: true` so the API can add fields
// like `traceId`, `version`, `requestId` without breaking every contract test.
// Resource shapes (userSchema, productSchema) should use `false` to catch
// typos and unintended drift in the data payload.
// ADAPT: update required/properties to match your ApiResponse envelope fields
export function responseSchema(dataSchema: object): object {
  return {
    type: 'object',
    required: ['data', 'message', 'success'],
    properties: {
      data: dataSchema,
      message: { type: 'string' },
      success: { type: 'boolean', const: true },
    },
    additionalProperties: true,
  }
}

export function listResponseSchema(itemSchema: object): object {
  return responseSchema({
    type: 'object',
    required: ['items', 'total'],
    properties: {
      items: { type: 'array', items: itemSchema },
      total: { type: 'number' },
      page: { type: 'number' },
      pageSize: { type: 'number' },
    },
    // Pagination envelope — allow future fields like `hasMore`, `nextCursor`
    additionalProperties: true,
  })
}

export const emptyResponseSchema: object = {
  type: 'object',
  required: ['message', 'success'],
  properties: {
    message: { type: 'string' },
    // Lock success: true so an error envelope can't sneak past a 2xx no-body path
    success: { type: 'boolean', const: true },
  },
  additionalProperties: true,
}

// `data` is optional in error responses but if present MUST be null.
// Do NOT add `data` to `required` — many APIs omit it from error bodies entirely.
export const errorResponseSchema: object = {
  type: 'object',
  required: ['message', 'success'],
  properties: {
    message: { type: 'string' },
    success: { type: 'boolean', const: false },
    data: { type: 'null' },
    // ADAPT: add error-envelope fields here (e.g. code, details) if your API uses them
  },
  additionalProperties: true,
}
