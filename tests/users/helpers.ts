import type { UsersClient } from '@services/users/UsersClient'
import type { User, CreateUserRequest, UserRoleValue } from '@services/users/types'
import { UserRole } from '@services/users/types'
import { testSlug } from '@utils/test-data'

/**
 * Creates a test user and returns the resolved User object.
 *
 * Use this as a precondition in tests that need an existing user.
 * Throws if the API call fails — a failing precondition is a test failure, not a skip.
 *
 * @example
 * const user = await createTestUser(usersClient)
 * const adminUser = await createTestUser(usersClient, { role: UserRole.ADMIN })
 */
export async function createTestUser(
  client: UsersClient,
  overrides: Partial<CreateUserRequest> = {},
): Promise<User> {
  const slug = testSlug()
  const res = await client.createUser({
    email: `${slug}@example.com`,
    name: slug,
    password: 'Test@123456',
    role: UserRole.USER,
    ...overrides,
  })
  if (!res.ok()) {
    throw new Error(`[createTestUser] setup failed: ${res.status()} ${await res.text()}`)
  }
  const json = await res.json()
  return json.data as User
}

/**
 * Creates an admin user. Shorthand for createTestUser with role override.
 */
export async function createTestAdmin(client: UsersClient): Promise<User> {
  return createTestUser(client, { role: UserRole.ADMIN as UserRoleValue })
}
