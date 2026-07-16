# Bundled Mock API

The template ships with a Hono-based in-memory HTTP mock at `mocks/server.ts`.
It is a real process listening on a real port — Playwright starts it automatically
before tests and stops it after, so `pnpm install && pnpm test` is green out of the box.

## What it serves

Base URL: `http://localhost:4010/api`

| Endpoint            | Behaviour                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /health`       | Returns `{ "status": "ok" }` — used by `warmUpConnection`                                              |
| `POST /auth/login`  | Body `{ username, password }`. Any non-empty creds → `{ data: { token }, success: true }`. Empty → 400 |
| `GET /users`        | Query `page`, `pageSize`, `search`. Paginated list with envelope                                       |
| `POST /users`       | Body `{ email, name, password, role? }`. Validates required fields + email format + unique email       |
| `GET /users/:id`    | Malformed id → 400. Missing → 404. Else user envelope                                                  |
| `PATCH /users/:id`  | Updates `name` / `role`. Empty `name` → 400. Missing → 404                                             |
| `DELETE /users/:id` | 204 on success. Missing → 404                                                                          |

All non-public routes require an `Authorization: Bearer <token>` header.
The token must have been issued by `POST /auth/login` in the **same** mock
process — tokens are tracked in an in-memory `Set` and **invalidated on mock
restart**. This lets `tests/<svc>/auth.spec.ts` genuinely exercise the 401 path
with an obviously-invalid token like `"invalid.token.value"`.

A consequence: if you cache a mock-issued token across `pnpm test` runs (via
`.auth/token`), `global-setup` probes the cached token against the API and
falls back to a fresh login if the mock rejects it (`Cached token rejected by
API — refreshing` in the setup log). No manual cache clearing needed.

## Lifecycle

`playwright.config.ts` activates the `webServer` block whenever `TEST_ENV` is
unset or `local`. For any other value (`dev`, `staging`, `prod`), the mock is
skipped and tests hit the real `API_BASE_URL`.

```
pnpm test               # uses bundled mock
pnpm test:local         # uses bundled mock
pnpm test:staging       # uses real staging API (mock not started)
```

## Running standalone

```bash
pnpm mock               # tsx mocks/server.ts — listens on :4010
MOCK_PORT=5000 pnpm mock
```

## Disabling without changing the URL

Set `TEST_ENV=dev` (or any non-local value) before running, or set
`API_BASE_URL` to point at your own service and ensure `TEST_ENV` is not `local`.

## Why a local mock and not a public sandbox?

- **Determinism.** No rate limits, no flake from third-party outages.
- **Envelope fidelity.** Public sandboxes (JSONPlaceholder, DummyJSON, ReqRes)
  do not use the `{ data, message, success }` envelope this template demonstrates.
- **Real lifecycle.** POST/PATCH/DELETE actually persist for the duration of the
  test run — the CRUD flow can verify end-to-end state changes.
- **Real socket.** Tests exercise the full Playwright `APIRequestContext` path
  (TCP, TLS-free in this case, headers, status codes, JSON parsing) — not stubs.

## What to do when you adopt a real API

1. Stop using `pnpm test` (which boots the mock); switch to
   `pnpm test:dev` / `pnpm test:staging` / `pnpm test:prod`.
2. Update the matching `.env.<env>` file with your real `API_BASE_URL` and
   credentials.
3. Walk through the 5 `// ADAPT:` markers in the source (see `README.md`).
4. Delete `mocks/` and the `webServer` block in `playwright.config.ts` once you
   no longer need the in-template demo.
