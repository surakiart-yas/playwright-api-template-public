export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole]

export interface User {
  id: string
  email: string
  name: string
  role: UserRoleValue
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  email: string
  name: string
  password: string
  role?: UserRoleValue
}

export interface UpdateUserRequest {
  name?: string
  role?: UserRoleValue
}

export interface UserListRequest {
  page?: number
  pageSize?: number
  search?: string
}

export interface UserListData {
  items: User[]
  total: number
  page: number
  pageSize: number
}
