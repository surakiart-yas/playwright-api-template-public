import { expect, type APIResponse } from '@playwright/test'
import Ajv, { type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import { errorResponseSchema } from './schemas'

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

// Compiled validators are expensive — cache by schema object reference
const validatorCache = new WeakMap<object, ValidateFunction>()

export class BaseValidator {
  static expectStatus(res: APIResponse, expected: number): void {
    expect(res.status(), `Expected HTTP ${expected}, got ${res.status()}`).toBe(expected)
  }

  /**
   * Validate a response body against a JSON Schema. Returns the parsed body
   * so callers can run further assertions without re-parsing.
   */
  static async expectSchema<T = unknown>(res: APIResponse, schema: object): Promise<T> {
    const json = (await res.json()) as T
    let validate = validatorCache.get(schema)
    if (!validate) {
      validate = ajv.compile(schema)
      validatorCache.set(schema, validate)
    }
    if (!validate(json)) {
      throw new Error(
        `Schema validation failed:\n${ajv.errorsText(validate.errors)}\n\nReceived:\n${JSON.stringify(json, null, 2)}`,
      )
    }
    return json
  }

  // ADAPT: change success check to match your envelope (e.g. code === '0')
  static async expectSuccess(res: APIResponse, httpStatus = 200): Promise<void> {
    BaseValidator.expectStatus(res, httpStatus)
    const json = await res.json()
    expect(json.success, `Expected success: true, got: ${JSON.stringify(json.success)}`).toBe(true)
  }

  static async expectError(res: APIResponse, httpStatus: number, message?: string): Promise<void> {
    BaseValidator.expectStatus(res, httpStatus)
    const json = await BaseValidator.expectSchema<{ success: boolean; message: string }>(
      res,
      errorResponseSchema,
    )
    expect(json.success, `Expected success: false`).toBe(false)
    if (message) expect(json.message).toContain(message)
  }

  static expectResponseTime(ms: number, maxMs: number): void {
    expect(ms, `Response time ${ms}ms exceeded SLA of ${maxMs}ms`).toBeLessThanOrEqual(maxMs)
  }
}
