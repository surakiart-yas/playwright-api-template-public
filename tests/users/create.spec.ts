import { test, expect, UsersValidator } from './fixtures'
import { testSlug } from '@utils/test-data'
import { UserRole } from '@services/users/types'

test.describe('POST /users', () => {
  test.describe('Positive Testing', () => {
    test('should create a user with role admin', async ({ usersClient }) => {
      const slug = testSlug()
      const email = `${slug}@example.com`
      const res = await usersClient.createUser({
        email,
        name: slug,
        password: 'Test@123456',
        role: UserRole.ADMIN,
      })
      await UsersValidator.expectCreateUserSuccess(res)
      const json = await res.json()
      expect(json.data).toMatchObject({ email, name: slug, role: UserRole.ADMIN })
    })

    test('should create a user with default role', async ({ usersClient }) => {
      const slug = testSlug()
      const res = await usersClient.createUser({
        email: `${slug}@example.com`,
        name: slug,
        password: 'Test@123456',
      })
      await UsersValidator.expectCreateUserSuccess(res)
      const json = await res.json()
      expect(json.data.role).toBe(UserRole.USER)
    })
  })

  test.describe('Negative Testing', () => {
    test('should reject missing email', async ({ usersClient }) => {
      const res = await usersClient.createUser({
        email: '',
        name: 'Test User',
        password: 'Test@123456',
      })
      await UsersValidator.expectError(res, 400)
    })

    test('should reject invalid email format', async ({ usersClient }) => {
      const res = await usersClient.createUser({
        email: 'not-a-valid-email',
        name: 'Test User',
        password: 'Test@123456',
      })
      await UsersValidator.expectError(res, 400)
    })

    test('should reject duplicate email', async ({ usersClient }) => {
      const email = `${testSlug()}@example.com`
      await usersClient.createUser({ email, name: 'First', password: 'Test@123456' })
      const res = await usersClient.createUser({
        email,
        name: 'Duplicate',
        password: 'Test@123456',
      })
      await UsersValidator.expectError(res, 409)
    })
  })
})
