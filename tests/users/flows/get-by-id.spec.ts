import { test, expect, UsersValidator } from '../fixtures'
import { testSlug } from '@utils/test-data'

test('Get by ID flow: create → verify in list → get by id → verify field match', async ({
  usersClient,
}) => {
  let userId: string
  let userEmail: string

  await test.step('Create a known user', async () => {
    const slug = testSlug('getbyid')
    userEmail = `${slug}@example.com`
    const res = await usersClient.createUser({
      email: userEmail,
      name: slug,
      password: 'Test@123456',
    })
    await UsersValidator.expectCreateUserSuccess(res)
    const json = await res.json()
    userId = json.data.id
    expect(userId).toBeTruthy()
  })

  await test.step('Verify user appears in list', async () => {
    const res = await usersClient.listUsers({ search: userEmail })
    await UsersValidator.expectListUsersSuccess(res)
    const json = await res.json()
    const found = json.data.items.find((u: { id: string }) => u.id === userId)
    expect(found, 'Created user should appear in list').toMatchObject({
      id: userId,
      email: userEmail,
    })
  })

  await test.step('Get user by id and verify field match', async () => {
    const res = await usersClient.getUserById(userId)
    await UsersValidator.expectGetUserSuccess(res, userId)
    const json = await res.json()
    expect(json.data.email).toBe(userEmail)
  })
})
