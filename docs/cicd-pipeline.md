# CI/CD Pipeline Design — Playwright API Tests

> **Scope:** GitHub Actions trigger strategy, workflow structure, secrets management,
> and reporting for a Playwright API automation repository.

This document describes every GitHub Actions trigger type and when to use each one.

---

## 0. Design Constraints

Understand these before choosing trigger strategies:

| Constraint                                                                 | Impact on CI/CD design                                                     |
| :------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| Tests are **live API integration** — they hit a real environment           | Do not run against production on every PR; gate prod runs behind approvals |
| `TEST_ENV` selects the target environment (`local`/`dev`/`staging`/`prod`) | Trigger type must map to a specific env — never hard-code it               |
| Auth tokens can expire                                                     | Scheduled health-check must detect and alert on token expiry               |
| Service registry grows over time (`users`, `products`, …)                  | Playwright auto-discovers new `tests/<svc>/` directories — no YAML edits   |

---

## 1. `workflow_dispatch` — Manual Run

**What it is:** Run on demand via the GitHub UI or `gh workflow run`.
Accepts typed inputs — environment, optional `--grep` filter.

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment (TEST_ENV)'
        required: true
        default: 'staging'
        type: choice
        options: [dev, staging, prod]
      grep:
        description: 'Playwright --grep pattern (optional, runs full suite if empty)'
        required: false
        default: ''
        type: string
```

**Use cases:**

- Run the full suite on `prod` before a release
- Run the full suite on `staging` after the API team deploys a build
- Debug a single service: `grep = users`
- Trigger remotely via `gh workflow run` from an external dashboard

**Recommendation:** ✅ Active — this is the primary trigger for ad-hoc runs.

---

## 2. `pull_request` — PR Gate

**What it is:** Runs automatically when a PR is opened or updated against the target branch.
Acts as a merge gate.

```yaml
on:
  pull_request:
    branches: [main]
    paths:
      - 'src/**'
      - 'tests/**'
      - 'playwright.config.ts'
      - 'package.json'
      - '.github/workflows/**'
```

**Jobs to run (ordered by cost, low → high):**

1. **`lint`** — `pnpm lint` + `pnpm type-check` — no API calls, completes in seconds
2. **`test`** — `pnpm test` against the **bundled Hono mock** — no secrets, no
   external dependencies, ~10 s

**Why mock and not live staging for PR Gate?**

- Fork PRs cannot read `secrets.*` → live-staging jobs fail silently with empty env
- Multiple PRs running in parallel would collide on shared staging state
- The mock implements the same contract (envelope shape, state machine, error codes)
  so a PR that passes against the mock has exercised the same code paths

Live-environment runs happen in `nightly.yml` (scheduled) and `on-demand.yml` (manual).

**Do not run in a PR:**

- Any test against `prod` — the code is unreviewed; prod is off-limits
- Live-staging tests — defer to nightly / on-demand

> `forbidOnly: !!process.env.CI` in `playwright.config.ts` will fail the run if any
> `test.only()` was accidentally committed, acting as a safety net.

**Recommendation:** ✅ Active — configure branch protection on `main` to require this workflow.

---

## 3. `push` — Code Push Trigger

**What it is:** Runs when code is pushed to a specific branch.

```yaml
on:
  push:
    branches: [main]
    paths:
      - '.github/workflows/**'
```

**Use in this repo:** Limit to `.github/workflows/**` only.
This verifies that the workflow YAML itself still runs correctly after a merge.

**Do not use `push` for `src/**`or`tests/**`:** The `pull_request` trigger already covers
pre-merge validation, and post-merge there is nothing to deploy — running again is wasteful.

**Recommendation:** 🟡 Optional — include only if you want self-testing of workflow files.

---

## 4. `schedule` — Cron Job

**What it is:** Runs automatically on a recurring schedule. GitHub Actions uses **UTC** exclusively.

```
Cron syntax:
┌── minute (0–59)
│  ┌── hour (0–23)  ← always UTC
│  │  ┌── day of month (1–31)
│  │  │  ┌── month (1–12)
│  │  │  │  ┌── day of week (0–6, 0 = Sunday)
*  *  *  *  *
```

> **Time zone conversion:** `local time − UTC offset = UTC`
> Example: 07:00 UTC+7 → `00:00 UTC` → cron `0 0 * * *`

> GitHub does not guarantee exact timing. Expect 5–15 min delays during peak hours
> (00:00, 12:00 UTC). Avoid round-number times to reduce queue contention.

**Recommended schedule:**

| Job            | Cron (UTC)    | Purpose                                | Scope                   |
| :------------- | :------------ | :------------------------------------- | :---------------------- |
| Daily full run | `0 0 * * 1-5` | Weekday health check before work hours | Full suite on `staging` |
| Token check    | `0 */6 * * *` | Alert before `API_AUTH_TOKEN` expires  | Auth ping on `staging`  |

**Use cases:**

- Detect regressions introduced by API-side deployments (not test code changes)
- Alert the team before an auth token expires
- Produce a trend report baseline

**Recommendation:** ✅ Active — daily run + token check are high value, low cost.

---

## 5. `repository_dispatch` — External Trigger

**What it is:** A workflow starts when another repository (or external system) sends an
HTTP POST to the GitHub dispatches API. Accepts a typed `client_payload`.

### Receiver side (this repo)

```yaml
on:
  repository_dispatch:
    types: [run-tests]
```

### Sender side — from an external dashboard or CI system

```typescript
await fetch('https://api.github.com/repos/<org>/<repo>/dispatches', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_PAT}`,
    Accept: 'application/vnd.github+json',
  },
  body: JSON.stringify({
    event_type: 'run-tests',
    client_payload: {
      environment: 'staging',
      grep: 'users',
      triggered_by: 'release-pipeline',
    },
  }),
})
```

### Sender side — from curl (ad-hoc / Postman)

```bash
curl -X POST \
  https://api.github.com/repos/<org>/<repo>/dispatches \
  -H "Authorization: Bearer $GITHUB_PAT" \
  -H "Accept: application/vnd.github+json" \
  -d '{
    "event_type": "run-tests",
    "client_payload": {
      "environment": "staging",
      "triggered_by": "manual"
    }
  }'
```

### `client_payload` fields

| Field          | Values                          | Purpose                       |
| :------------- | :------------------------------ | :---------------------------- |
| `environment`  | `dev` / `staging` / `prod`      | Maps to `TEST_ENV`            |
| `grep`         | any Playwright `--grep` pattern | Passed to `--grep` (optional) |
| `triggered_by` | email or system name            | Logged in the notification    |

**Requirements:**

- A Personal Access Token (PAT) with `repo` scope, stored in the sender's secrets
- `event_type` must match one of the `types` listed in the receiving workflow

**Recommendation:** 🟡 Optional at first — enable when an external dashboard is ready.

---

## 6. Trigger Comparison

|                            | `workflow_dispatch` | `pull_request` |  `push`  |   `schedule`   | `repository_dispatch` |
| :------------------------- | :-----------------: | :------------: | :------: | :------------: | :-------------------: |
| **Who triggers it**        |   Human (UI/CLI)    | PR open/update | Git push | GitHub (timer) |    External system    |
| **Manual action required** |         ✅          |       ❌       |    ❌    |       ❌       |          ❌           |
| **Accepts parameters**     |      ✅ inputs      |       ❌       |    ❌    |       ❌       |   ✅ client_payload   |
| **Cross-repo capable**     |         ❌          |       ❌       |    ❌    |       ❌       |          ✅           |
| **Requires PAT**           |         ❌          |       ❌       |    ❌    |       ❌       |   ✅ (sender only)    |

---

## 7. Environment Mapping

This repo uses `TEST_ENV` to select the target environment — not branches.
Resolve `TEST_ENV` in priority order:

```
1. repository_dispatch  → client_payload.environment       (highest)
2. workflow_dispatch    → inputs.environment
3. pull_request         → 'staging'  (fixed — never hits prod)
4. schedule             → defined in the cron matrix
5. push                 → 'staging'  (workflow self-test only)
```

In the workflow YAML:

```yaml
env:
  TEST_ENV: ${{
    github.event.client_payload.environment ||
    github.event.inputs.environment ||
    'staging'
  }}
```

**Hard rule:** `pull_request` and `push` triggers must never target `prod`.
Prod runs require `workflow_dispatch` or `repository_dispatch` with an approver gate.

---

## 8. Secrets Management

Use **GitHub Environments** (Settings → Environments) to scope secrets per environment.
A `prod` environment should require a **required reviewer** (manual approval before running).

| Secret                             | Purpose                                                      | Scope            |
| :--------------------------------- | :----------------------------------------------------------- | :--------------- |
| `API_BASE_URL`                     | Base URL of the target environment                           | Per environment  |
| `API_AUTH_TOKEN`                   | Pre-issued token for protected endpoints                     | Per environment  |
| `API_ADMIN_USERNAME` / `_PASSWORD` | Global-setup fallback login                                  | Per environment  |
| `API_MAX_RESPONSE_MS`              | SLA threshold override                                       | Per environment  |
| `TELEGRAM_BOT_TOKEN` / `CHAT_ID`   | Failure notification                                         | Repository level |
| `GITHUB_PAT`                       | For sending `repository_dispatch` (store in the sender repo) | Sender repo      |

Reference in the workflow:

```yaml
jobs:
  test:
    environment: ${{ inputs.environment || 'staging' }}
    env:
      API_BASE_URL: ${{ secrets.API_BASE_URL }}
      API_AUTH_TOKEN: ${{ secrets.API_AUTH_TOKEN }}
      API_ADMIN_USERNAME: ${{ secrets.API_ADMIN_USERNAME }}
      API_ADMIN_PASSWORD: ${{ secrets.API_ADMIN_PASSWORD }}
```

---

## 9. Recommended Workflow File Structure

Three files with non-overlapping responsibilities:

```
.github/workflows/
├── pr-gate.yml      # pull_request → lint + type-check + full suite (mock)
├── nightly.yml      # schedule + workflow_dispatch → full suite on staging
└── on-demand.yml    # workflow_dispatch + repository_dispatch → flexible run
```

### Shared step pattern (extract to a composite action if DRY matters)

```yaml
- uses: actions/checkout@v4
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'pnpm'
- run: pnpm install --frozen-lockfile
# No browser install needed — pure API tests use APIRequestContext only
- run: pnpm test --grep "${{ inputs.grep }}"
```

### Matrix for running multiple environments simultaneously (nightly)

```yaml
strategy:
  fail-fast: false
  matrix:
    environment: [staging, uat]
```

---

## 10. Artifacts & Reporting

Always upload artifacts with `if: always()` — you need the report even when tests fail.

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report-${{ env.TEST_ENV }}-${{ github.run_id }}
    path: playwright-report/
    retention-days: 14
```

> Playwright trace files and screenshots are generated automatically for failed tests
> when `trace: 'on-first-retry'` is set in `playwright.config.ts`. They are included in the
> `playwright-report/` folder and do not require a separate upload step.

---

## 11. Failure Notifications

| Channel             | When to use                           | Required secrets                         |
| :------------------ | :------------------------------------ | :--------------------------------------- |
| **Telegram**        | Nightly failures, prod smoke failures | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| **GitHub PR Check** | PR gate results                       | Built-in (no extra secrets)              |
| **Webhook**         | External dashboard integration        | Dashboard URL + token                    |

Example Telegram step (only fires on failure):

```yaml
- name: Notify Telegram on failure
  if: failure()
  run: |
    curl -s -X POST https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage \
      -d chat_id=${{ secrets.TELEGRAM_CHAT_ID }} \
      -d parse_mode=Markdown \
      -d text="❌ *${{ github.workflow }}* failed on \`${{ env.TEST_ENV }}\`
    [View run](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})"
```

---

## 12. Implementation Checklist

Use this as a ticket breakdown when setting up CI/CD for the first time:

- [ ] Create `.github/workflows/pr-gate.yml` — lint + full suite against the mock
- [ ] Enable branch protection on `main`: require `pr-gate` to pass before merge
- [ ] Create GitHub Environments: `staging`, `prod`
- [ ] Add **required reviewer** to the `prod` environment
- [ ] Populate secrets for `staging` (all `API_*` variables)
- [ ] Populate secrets for `prod` (all `API_*` variables)
- [ ] Create `.github/workflows/nightly.yml` — schedule + workflow_dispatch
- [ ] Create `.github/workflows/on-demand.yml` — workflow_dispatch + repository_dispatch
- [ ] Test end-to-end: `gh workflow run`, manual cron trigger, dispatch via curl
- [ ] Set up Telegram notification (optional)
- [ ] Enable `repository_dispatch` integration when external dashboard is ready

---

## Related Documents

| Document                                | Purpose                                                        |
| :-------------------------------------- | :------------------------------------------------------------- |
| [`docs/mock-server.md`](mock-server.md) | Bundled mock contract + lifecycle                              |
| [`.env.example`](../.env.example)       | Full list of environment variables (mirrors the secrets above) |
