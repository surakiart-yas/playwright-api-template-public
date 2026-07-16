import type { APIResponse } from '@playwright/test'
import { expect } from '@playwright/test'
import { BaseValidator } from '@core/BaseValidator'
import { HttpStatus } from '@core/types'
import { UserSchemas } from './schemas'

export class UsersValidator extends BaseValidator {
  static async expectCreateUserSuccess(res: APIResponse): Promise<void> {
    await BaseValidator.expectSuccess(res, HttpStatus.CREATED)
    await BaseValidator.expectSchema(res, UserSchemas.createUser)
  }

  static async expectGetUserSuccess(res: APIResponse, expectedId: string): Promise<void> {
    await BaseValidator.expectSuccess(res)
    await BaseValidator.expectSchema(res, UserSchemas.getUser)
    const json = await res.json()
    expect(json.data.id).toBe(expectedId)
  }

  static async expectUpdateUserSuccess(res: APIResponse): Promise<void> {
    await BaseValidator.expectSuccess(res)
    await BaseValidator.expectSchema(res, UserSchemas.updateUser)
  }

  static async expectDeleteUserSuccess(res: APIResponse): Promise<void> {
    BaseValidator.expectStatus(res, HttpStatus.NO_CONTENT)
  }

  static async expectListUsersSuccess(res: APIResponse): Promise<void> {
    await BaseValidator.expectSuccess(res)
    await BaseValidator.expectSchema(res, UserSchemas.listUsers)
    const json = await res.json()
    expect(Array.isArray(json.data.items)).toBe(true)
    expect(typeof json.data.total).toBe('number')
  }
}
