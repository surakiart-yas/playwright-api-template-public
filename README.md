# Playwright API Test Template

A production-ready Playwright API automation template using the **API Object Model (AOM)** pattern.
Ships with a bundled Hono mock so the entire suite is **green on a fresh clone** — no real API needed
to evaluate the template.

## Adopting this template

1. Clone it and run `pnpm install && pnpm test` — confirm the suite is green against the bundled mock.
2. Point it at your API — see [Environment Setup](#environment-setup) below.
3. Make [the 5 Adaptation Points](#the-5-adaptation-points) match your API's response shape and auth.
4. Copy `src/services/users/` + `tests/users/` as the starting point for your first real service —
   see [`CONTRIBUTING.md`](CONTRIBUTING.md).
5. Once it's wired to a real API, delete the bundled mock — see
   [Removing the Bundled Mock](#removing-the-bundled-mock).

## Prerequisites

| Tool    | Version                            |
| ------- | ---------------------------------- |
| Node.js | ≥ 22 (see `.nvmrc`)                |
| pnpm    | ≥ 10 (pinned via `packageManager`) |

> Run `nvm use` to pick up the pinned Node version automatically. Corepack handles pnpm.

## Quick Start

```bash
# Two commands. Mock auto-starts via Playwright's `webServer`.
pnpm install
pnpm test
```

The full suite runs against the bundled mock at `http://localhost:4010/api` and should be all green.
See [`docs/mock-server.md`](docs/mock-server.md) for the mock contract and how to disable it.

To target a real environment:

```bash
cp .env.example .env.dev      # or .env.staging / .env.prod
# Edit the file — set API_BASE_URL and credentials for your service
pnpm test:dev                 # mock is NOT started for dev/staging/prod
```

## Environment Setup

All configuration lives in env files. The active file is selected by `TEST_ENV`:

| File           | When used                      |
| -------------- | ------------------------------ |
| `.env.local`   | Local development (gitignored) |
| `.env.dev`     | `TEST_ENV=dev`                 |
| `.env.staging` | `TEST_ENV=staging`             |
| `.env.prod`    | `TEST_ENV=prod`                |

Copy `.env.example` to the appropriate file and fill in the values.

**Minimum required:**

```bash
API_BASE_URL=https://your-api.example.com/api
```

**For protected endpoints (skip if API has no auth):**

```bash
API_AUTH_TOKEN=your-token        # fastest — bypasses login
# OR
API_ADMIN_USERNAME=admin@example.com
API_ADMIN_PASSWORD=YourPassword
```

## Running Tests

```bash
pnpm test             # Full suite against the bundled mock (default for local)
pnpm test:debug       # Verbose HTTP logging (DEBUG_API=true)
pnpm test:staging     # Run against staging environment (mock disabled)
pnpm test:prod        # Run against production environment (mock disabled)
pnpm mock             # Run the mock server standalone on :4010
pnpm report           # Open HTML report
```

Use Playwright's built-in `--grep` to run a subset, e.g. `pnpm test --grep "should create"`.

## Project Structure

```
src/
  core/           # BaseClient, BaseValidator, types, schemas
  config/         # loadApiConfig() — reads env vars
  fixtures/       # Playwright fixtures (worker auth, API config)
  utils/          # auth, http, env, random, logging, reporting, warmup
  setup/          # global-setup.ts, global-teardown.ts
  services/
    users/        # Example service — copy this to add a new service
      types.ts
      schemas.ts
      UsersClient.ts
      UsersValidator.ts

tests/
  users/          # Example tests — copy and rename for each service
    fixtures.ts
    create.spec.ts
    update.spec.ts
    delete.spec.ts
    get-by-id.spec.ts
    list.spec.ts
    flows/
      crud.spec.ts
      get-by-id.spec.ts

mocks/
  server.ts       # Hono in-memory mock — auto-started by Playwright webServer

docs/
  cicd-pipeline.md   # GitHub Actions CI/CD guide
  mock-server.md     # Bundled mock contract + lifecycle

.github/
  workflows/
    pr-gate.yml      # Lint + test suite (bundled mock) on every PR
    nightly.yml      # Scheduled full-suite run against staging
    on-demand.yml    # Manual + external dispatch, optional --grep filter
```

## Adding a New Service

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full walkthrough. Short version:

```bash
cp -r src/services/users src/services/<svc>
cp -r tests/users        tests/<svc>
```

Then adapt `types.ts → schemas.ts → <Svc>Client.ts → <Svc>Validator.ts` and the spec
files. Playwright auto-discovers the new `tests/<svc>/` directory.

## Quality gates

```bash
pnpm lint         # eslint
pnpm type-check   # tsc --noEmit
pnpm format       # prettier --write .
```

Wire these into whatever CI or git-hook tooling your team already uses.

## The 5 Adaptation Points

Every team MUST update these before running against their own API:

| #   | File                        | What to change                                        |
| --- | --------------------------- | ----------------------------------------------------- |
| 1   | `src/core/types.ts`         | `ApiResponse<T>` shape (your envelope fields)         |
| 2   | `src/core/schemas.ts`       | `responseSchema()` required/properties                |
| 3   | `src/core/BaseValidator.ts` | `expectSuccess` / `expectError` — match your envelope |
| 4   | `src/utils/auth.ts`         | Login endpoint path + token field in response         |
| 5   | `src/utils/warmup.ts`       | Health check endpoint path                            |

All five are marked with `// ADAPT:` comments in the source.

## Test Data Convention

All resources created by automation are named with a `test-` prefix so the global
teardown can find and delete them after every run. Use the `testSlug()` helper
rather than hardcoding the prefix — that way a future rename is a one-line change
in `src/utils/test-data.ts`.

```typescript
import { testSlug } from '@utils/test-data'

const slug = testSlug() // "test-aBc12XyZ"
const slug = testSlug('paging') // "test-paging-aBc12XyZ"

await usersClient.createUser({
  email: `${slug}@example.com`,
  name: slug,
  password: 'Test@123456',
})
```

The global teardown deletes any resource whose `name` starts with `TEST_PREFIX` after every run.

## CI/CD

See [`docs/cicd-pipeline.md`](docs/cicd-pipeline.md) for the full GitHub Actions setup guide,
including secrets configuration, environment gates, and Telegram notifications.

## Removing the Bundled Mock

`mocks/` is demo scaffolding so the template runs green on a fresh clone — not production code.
The mock only activates when `TEST_ENV` is unset or `local`; it never runs in CI or against
dev/staging/prod, so it is safe to leave in place. Delete it only when you want a leaner repo:

```bash
rm -rf mocks/
pnpm remove hono @hono/node-server tsx
# Then edit:
#   package.json          — remove the `mock` script + the `mocks/**/*.ts` lint glob
#   playwright.config.ts  — remove the `webServer` block + the `useMock` defaults
#   tsconfig.json         — remove `mocks/**/*` from `include`
#   eslint.config.js      — remove `mocks/**/*.ts` from `files`
pnpm type-check && pnpm lint   # confirm nothing references the removed files
```

See [`mocks/README.md`](mocks/README.md) for the full migration checklist and
[`docs/mock-server.md`](docs/mock-server.md) for the mock's endpoint contract.

## Further Reading

| Document                                         | Contents                                                     |
| ------------------------------------------------ | ------------------------------------------------------------ |
| [`docs/cicd-pipeline.md`](docs/cicd-pipeline.md) | GitHub Actions trigger strategy, secrets, workflow structure |
| [`docs/mock-server.md`](docs/mock-server.md)     | Bundled Hono mock — endpoints, lifecycle, how to disable     |

## License

MIT — see [LICENSE](LICENSE). Replace if your organisation requires a different license.
