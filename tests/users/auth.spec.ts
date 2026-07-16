/**
 * Auth-failure contract tests for the users service.
 *
 * The standard usersClient fixture skips tests when no auth token is available;
 * here we deliberately construct clients with bad / missing tokens to confirm
 * the API rejects them, without depending on the fixture's auth.
 */
import { test, expect, UsersValidator } from './fixtures'
import { UsersClient } from '@services/users/UsersClient'

test.describe('Auth — /users', () => {
  test('should return 401 with an invalid bearer token', async ({
    apiConfig,
    workerRequest,
  }, testInfo) => {
    const client = new UsersClient(
      { ...apiConfig, authToken: 'invalid.token.value' },
      workerRequest,
      testInfo,
    )
    const res = await client.listUsers()
    await UsersValidator.expectError(res, 401)
  })

  test('should return 401 when no authorization header is sent', async ({
    apiConfig,
    workerRequest,
  }, testInfo) => {
    const client = new UsersClient({ ...apiConfig, authToken: undefined }, workerRequest, testInfo)
    const res = await client.listUsers()
    await UsersValidator.expectError(res, 401)
  })

  // 403 (forbidden — authenticated but unauthorized role) would require a
  // role-differentiated mock + role-tagged worker accounts. The current mock
  // does not model roles for authorization decisions, so 403 testing belongs
  // in an environment with real role enforcement (test:staging).
  test.skip('should return 403 when authenticated user lacks required role', async () => {
    // intentional skip — see comment above
    expect(true).toBe(true)
  })
})
