import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test'
import { BaseClient } from '@core/BaseClient'
import type { ApiConfig, ApiResponse } from '@core/types'
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserListRequest,
  User,
  UserListData,
} from './types'

export class UsersClient extends BaseClient {
  constructor(config: ApiConfig, request: APIRequestContext, testInfo?: TestInfo) {
    super(config, request, testInfo)
  }

  async createUser(data: CreateUserRequest): Promise<APIResponse> {
    return this.post<ApiResponse<User>>('users', data, undefined, 'Create User')
  }

  async getUserById(id: string): Promise<APIResponse> {
    return this.get<ApiResponse<User>>(`users/${id}`, undefined, undefined, 'Get User')
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<APIResponse> {
    return this.patch<ApiResponse<User>>(`users/${id}`, data, undefined, 'Update User')
  }

  async deleteUser(id: string): Promise<APIResponse> {
    return this.del<ApiResponse<null>>(`users/${id}`, undefined, 'Delete User')
  }

  async listUsers(params?: UserListRequest): Promise<APIResponse> {
    return this.get<ApiResponse<UserListData>>(
      'users',
      // Convert the typed request into the param shape sendRequest expects.
      // Safe — every field on UserListRequest is a primitive or undefined.
      params as Record<string, string | number | boolean | undefined | null> | undefined,
      undefined,
      'List Users',
    )
  }
}
