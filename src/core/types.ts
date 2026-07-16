// ADAPT: add/remove fields to match your API's infrastructure config
export interface ApiConfig {
  baseUrl: string
  maxResponseMs: number
  authToken?: string
}

// ADAPT: change to match your API's response envelope shape
// This template uses: { data, message, success }
export interface ApiResponse<T = unknown> {
  data: T
  message: string
  success: boolean
}

export type EmptyResponse = ApiResponse<null>

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
} as const

export type HttpStatusValue = (typeof HttpStatus)[keyof typeof HttpStatus]
