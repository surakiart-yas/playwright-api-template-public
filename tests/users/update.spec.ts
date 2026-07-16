import { test, expect, UsersValidator } from './fixtures'
import { testSlug } from '@utils/test-data'
import { UserRole } from '@services/users/types'
import { createTestUser } from './helpers'

test.describe('PATCH /users/:id', () => {
  test.describe('Positive Testing', () => {
    test('should update user name', async ({ usersClient }) => {
      const { id } = await createTestUser(usersClient)
      const newName = testSlug('updated')
      const res = await usersClient.updateUser(id, { name: newName })
      await UsersValidator.expectUpdateUserSuccess(res)
      const json = await res.json()
      expect(json.data.name).toBe(newName)
      expect(json.data.id).toBe(id)
    })

    test('should update user role', async ({ usersClient }) => {
      const { id } = await createTestUser(usersClient)
      const res = await usersClient.updateUser(id, { role: UserRole.VIEWER })
      await UsersValidator.expectUpdateUserSuccess(res)
      const json = await res.json()
      expect(json.data.role).toBe(UserRole.VIEWER)
    })
  })

  test.describe('Negative Testing', () => {
    test('should return 404 for non-existent user', async ({ usersClient }) => {
      const res = await usersClient.updateUser('non-existent-id-00000', { name: 'Ghost' })
      await UsersValidator.expectError(res, 404)
    })

    test('should reject empty name', async ({ usersClient }) => {
      const { id } = await createTestUser(usersClient)
      const res = await usersClient.updateUser(id, { name: '' })
      await UsersValidator.expectError(res, 400)
    })
  })
})
