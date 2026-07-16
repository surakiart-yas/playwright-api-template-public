import { test, UsersValidator } from './fixtures'
import { testSlug } from '@utils/test-data'
import { HttpStatus } from '@core/types'

test.describe('DELETE /users/:id', () => {
  test.describe('Positive Testing', () => {
    test('should delete an existing user', async ({ usersClient }) => {
      const slug = testSlug()
      const createRes = await usersClient.createUser({
        email: `${slug}@example.com`,
        name: slug,
        password: 'Test@123456',
      })
      const { data } = await createRes.json()
      const deleteRes = await usersClient.deleteUser(data.id)
      await UsersValidator.expectDeleteUserSuccess(deleteRes)
      const getRes = await usersClient.getUserById(data.id)
      await UsersValidator.expectError(getRes, HttpStatus.NOT_FOUND)
    })
  })

  test.describe('Negative Testing', () => {
    test('should return 404 for non-existent user', async ({ usersClient }) => {
      const res = await usersClient.deleteUser('non-existent-id-00000')
      await UsersValidator.expectError(res, 404)
    })

    test('should return 404 on double delete', async ({ usersClient }) => {
      const slug = testSlug()
      const createRes = await usersClient.createUser({
        email: `${slug}@example.com`,
        name: slug,
        password: 'Test@123456',
      })
      const { data } = await createRes.json()
      await usersClient.deleteUser(data.id)
      const res = await usersClient.deleteUser(data.id)
      await UsersValidator.expectError(res, 404)
    })
  })
})
