import { loadEnv } from '@utils/env'

loadEnv()

export interface TestUser {
  username: string
  password: string
  role: string
}

// ADAPT: add named accounts for your test scenarios
export const USER_POOL = {
  ADMIN: {
    username: process.env.API_ADMIN_USERNAME ?? '',
    password: process.env.API_ADMIN_PASSWORD ?? '',
    role: 'admin',
  },
} satisfies Record<string, TestUser>
