# `mocks/` — Demo Only

This folder contains a Hono-based in-memory HTTP server that lets the template's
example test suite pass on a fresh clone, without a real API. It is **not part
of the production test infrastructure** — it is scaffolding for evaluating the
template.

## When the mock runs

| Command                                    | Mock starts?                           |
| ------------------------------------------ | -------------------------------------- |
| `pnpm test`                                | yes — `TEST_ENV` defaults to `local`   |
| `pnpm test:local`                          | yes                                    |
| `pnpm test:dev`                            | **no** — `TEST_ENV=dev`                |
| `pnpm test:staging`                        | **no** — `TEST_ENV=staging`            |
| `pnpm test:prod`                           | **no** — `TEST_ENV=prod`               |
| CI workflows (PR gate, nightly, on-demand) | **no** — all set `TEST_ENV` explicitly |

You cannot accidentally point production tests at the mock. The activation rule
is in [`playwright.config.ts`](../playwright.config.ts) — see the `useMock` constant.

## Keep it or delete it?

**Keep it** if any of these apply:

- You want `pnpm test` to keep working when staging is down or unreachable
- New contributors should be able to run the suite on day 1, before getting credentials
- You like having a contract reference for what the API _should_ look like

**Delete it** if:

- You want a leaner repo with zero example surface area
- Your real API is always reachable from any contributor's machine
- The mock contract has drifted from your real API and is misleading more than helping

## How to remove the mock cleanly

The canonical removal checklist lives in the repo root [`README.md`](../README.md)
under **"Removing the Bundled Mock"** — kept in sync with the actual config
blocks that need editing.

After removal, run `pnpm verify` to confirm nothing references the deleted files.

## What the mock implements

See [`docs/mock-server.md`](../docs/mock-server.md) for the full endpoint
contract. It mirrors the `{ data, message, success }` envelope so the tests
exercise the same response-shape assertions they would against your real API.
