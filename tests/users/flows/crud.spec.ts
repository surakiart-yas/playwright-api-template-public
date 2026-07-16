import { test, expect, UsersValidator } from '../fixtures'
import { testSlug } from '@utils/test-data'
import { HttpStatus } from '@core/types'

test('User CRUD flow: create → list → update → get → delete', async ({ usersClient }) => {
  const slug = testSlug()
  let userId: string

  await test.step('Create user', async () => {
    const res = await usersClient.createUser({
      email: `${slug}@example.com`,
      name: slug,
      password: 'Test@123456',
    })
    await UsersValidator.expectCreateUserSuccess(res)
    const json = await res.json()
    userId = json.data.id
    expect(userId).toBeTruthy()
  })

  await test.step('Find user in list', async () => {
    const res = await usersClient.listUsers({ search: slug })
    await UsersValidator.expectListUsersSuccess(res)
    const json = await res.json()
    const found = json.data.items.find((u: { id: string }) => u.id === userId)
    expect(found, 'Created user should appear in list').toMatchObject({
      id: userId,
      name: slug,
    })
  })

  await test.step('Update user name', async () => {
    const updatedName = testSlug('updated')
    const res = await usersClient.updateUser(userId, { name: updatedName })
    await UsersValidator.expectUpdateUserSuccess(res)
    const json = await res.json()
    expect(json.data.name).toBe(updatedName)
  })

  await test.step('Verify update via get', async () => {
    const res = await usersClient.getUserById(userId)
    await UsersValidator.expectGetUserSuccess(res, userId)
  })

  await test.step('Delete user', async () => {
    const res = await usersClient.deleteUser(userId)
    await UsersValidator.expectDeleteUserSuccess(res)
  })

  await test.step('Verify user is gone', async () => {
    const res = await usersClient.getUserById(userId)
    await UsersValidator.expectError(res, HttpStatus.NOT_FOUND)
  })
})
