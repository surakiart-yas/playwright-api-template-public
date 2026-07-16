import { test as base, expect } from '@fixtures/base'
import { UsersClient } from '@services/users/UsersClient'
import { UsersValidator } from '@services/users/UsersValidator'

export { expect, UsersValidator }

type UsersFixtures = {
  usersClient: UsersClient
}

export const test = base.extend<UsersFixtures>({
  usersClient: async ({ apiConfig, workerRequest, workerAuthToken }, use, testInfo) => {
    if (!workerAuthToken) {
      testInfo.skip(true, 'No auth token — set API_AUTH_TOKEN or configure worker credentials')
      return
    }
    await use(
      new UsersClient({ ...apiConfig, authToken: workerAuthToken }, workerRequest, testInfo),
    )
  },
})
