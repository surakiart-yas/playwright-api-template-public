import { test, expect, UsersValidator } from './fixtures'
import { testSlug } from '@utils/test-data'

test.describe('GET /users', () => {
  test.describe('Positive Testing', () => {
    test('should return list with valid schema', async ({ usersClient }) => {
      const res = await usersClient.listUsers()
      await UsersValidator.expectListUsersSuccess(res)
    })

    test('should respect page and pageSize params', async ({ usersClient }) => {
      const res = await usersClient.listUsers({ page: 1, pageSize: 5 })
      await UsersValidator.expectListUsersSuccess(res)
      const json = await res.json()
      expect(json.data).toMatchObject({ page: 1, pageSize: 5 })
      expect(json.data.items.length).toBeLessThanOrEqual(5)
    })

    test('should return non-overlapping pages', async ({ usersClient }) => {
      // Create 4 known users so the pagination assertion is deterministic
      // regardless of how many users exist in the environment
      const created: string[] = []
      for (let i = 0; i < 4; i++) {
        const slug = testSlug('paging')
        const res = await usersClient.createUser({
          email: `${slug}@example.com`,
          name: slug,
          password: 'Test@123456',
        })
        const json = await res.json()
        if (json.data?.id) created.push(json.data.id as string)
      }

      try {
        const page1 = await (await usersClient.listUsers({ page: 1, pageSize: 2 })).json()
        const page2 = await (await usersClient.listUsers({ page: 2, pageSize: 2 })).json()
        const ids1 = page1.data.items.map((u: { id: string }) => u.id)
        const ids2 = page2.data.items.map((u: { id: string }) => u.id)
        expect(ids1.filter((id: string) => ids2.includes(id))).toHaveLength(0)
      } finally {
        // Per-test cleanup — do not rely solely on global teardown
        await Promise.all(created.map((id) => usersClient.deleteUser(id).catch(() => {})))
      }
    })

    test('should include expected response headers', async ({ usersClient }) => {
      const res = await usersClient.listUsers()
      expect(res.headers()['content-type']).toContain('application/json')
    })
  })

  test.describe('Negative Testing', () => {
    test('should reject negative page', async ({ usersClient }) => {
      const res = await usersClient.listUsers({ page: -1 })
      await UsersValidator.expectError(res, 400, 'page')
    })

    test('should reject zero page', async ({ usersClient }) => {
      const res = await usersClient.listUsers({ page: 0 })
      await UsersValidator.expectError(res, 400, 'page')
    })

    test('should reject pageSize over 100', async ({ usersClient }) => {
      const res = await usersClient.listUsers({ pageSize: 9999 })
      await UsersValidator.expectError(res, 400, 'pageSize')
    })

    test('should reject zero pageSize', async ({ usersClient }) => {
      const res = await usersClient.listUsers({ pageSize: 0 })
      await UsersValidator.expectError(res, 400, 'pageSize')
    })
  })
})
