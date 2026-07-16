import { test, UsersValidator } from './fixtures'

// Happy path is covered in flows/get-by-id.spec.ts
// This file covers error cases only
test.describe('GET /users/:id — error cases', () => {
  test('should return 404 for non-existent user', async ({ usersClient }) => {
    const res = await usersClient.getUserById('non-existent-id-00000')
    await UsersValidator.expectError(res, 404)
  })

  test('should return 400 for malformed id', async ({ usersClient }) => {
    const res = await usersClient.getUserById('!!invalid!!')
    await UsersValidator.expectError(res, 400)
  })
})
