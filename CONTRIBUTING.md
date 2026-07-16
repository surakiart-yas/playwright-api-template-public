# Contributing

This is a Playwright API testing template using the **API Object Model (AOM)** pattern.

## Setup

```bash
nvm use            # pin Node version (.nvmrc)
pnpm install       # installs deps
pnpm test          # mock auto-starts, full suite should pass
```

## Common workflows

### Add a new service

1. **Scaffold files** — copy `src/services/users/` to `src/services/<svc>/` and adapt:

   | File                | Adapt                                                                      |
   | ------------------- | -------------------------------------------------------------------------- |
   | `types.ts`          | Request / Response interfaces + state enum (if any)                        |
   | `schemas.ts`        | AJV schemas — keep envelope `additionalProperties: true`, resource `false` |
   | `<Svc>Client.ts`    | HTTP methods extending `BaseClient`                                        |
   | `<Svc>Validator.ts` | `expect*Success` helpers extending `BaseValidator`                         |

2. **Scaffold tests** — copy `tests/users/` to `tests/<svc>/` and adapt:

   | File          | Adapt                                                                     |
   | ------------- | ------------------------------------------------------------------------- |
   | `fixtures.ts` | Wire `<Svc>Client`                                                        |
   | `helpers.ts`  | `createTestX` precondition helpers (throws on failure, never silent skip) |
   | `*.spec.ts`   | Test cases following the conventions below                                |

3. **Playwright auto-discovers** the new `tests/<svc>/` directory — no config change.

### Add a new endpoint to an existing service

Modify files **in this exact order** — skipping order causes type errors:

```
types.ts  →  schemas.ts  →  <Svc>Client.ts  →  <Svc>Validator.ts  →  spec
```

## Conventions in 60 seconds

| What               | Rule                                                            |
| ------------------ | --------------------------------------------------------------- |
| Test data names    | `testSlug()` only — never hardcode the `test-` prefix           |
| Multi-field assert | `expect(json.data).toMatchObject({...})`, not multi-`toBe`      |
| Validators         | Structural (HTTP status, schema, envelope) — never field values |
| Tests              | Behavioral (field values, business invariants)                  |
| Negative test      | Use `expectError(res, status, 'keyword')` — assert the message  |
| Cross-service      | `tests/flows/fixtures.ts` + service helpers from each side      |

## Before you push

Run these locally for confidence:

```bash
pnpm lint
pnpm type-check
pnpm test
```

CI runs the suite on PR — see [`docs/cicd-pipeline.md`](docs/cicd-pipeline.md).

## Questions

Open an issue or ask the relevant code owner.
