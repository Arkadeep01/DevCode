# Deploying DevCode on Vercel

DevCode is deployed on **Vercel only**: the React/Vite frontend and the
Express API run as two Vercel projects built from this one repository, and the
API talks to an external libSQL/Turso database.

This guide is written against the repository as it stands. Every setting below
was verified against the code in this repository and against the official
documentation linked inline.

> **Nothing in this repository deploys anything.** The steps below are for the
> repository owner. No account is created, no domain is bought, no database is
> provisioned and no project is linked by the code in this repository.

---

## 1. Topology

| Vercel project | Root directory | Preset    | What it serves                                          |
| -------------- | -------------- | --------- | ------------------------------------------------------- |
| `devcode-web`  | `/`            | Vite      | The SPA — static assets plus the deep-link fallback      |
| `devcode-api`  | `/server`      | Express   | The whole Express API as a single Vercel Function        |

```
browser ──► devcode-web  (Vercel CDN, static SPA)
              │
              └─ fetch() ──► devcode-api  (Vercel Function, Express)
                                     │
                                     └─ SQL over HTTPS ──► libSQL / Turso
```

Two projects from one repository is Vercel's documented monorepo pattern: you
create one project per directory and point each project's **Root Directory**
at it (<https://vercel.com/docs/monorepos>). Each project reads the
`vercel.json` in **its own root directory**, so the root `vercel.json` (web)
and `server/vercel.json` (api) never collide. A Hobby account may connect up
to 25 projects to one Git repository — two is well inside that
(<https://vercel.com/docs/limits>).

Because the two projects have different hostnames, the SPA calls the API
cross-origin. That is expected and supported:

- the API allows the web origin through `CORS_ORIGIN`;
- the SPA learns the API address from `VITE_API_BASE_URL` at build time;
- the API never uses cookies (it is bearer-token authenticated), so no
  cross-site cookie handling is required.

---

## 2. Why the database must be external

A Vercel Function has **no writable, persistent filesystem**: the instance
filesystem is ephemeral, and the function is discarded when it scales down.
Vercel's own guidance for functions that need to write files is to use
external storage (<https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions>).
A file-backed SQLite database therefore cannot hold accounts, quiz attempts or
the question bank on Vercel.

The API therefore talks to a **libSQL** server (Turso) over HTTPS, which speaks
the same SQLite dialect. The schema, the SQL, the committed Drizzle migrations
and every query are unchanged — only the connection differs
(`server/src/db/client.ts`).

| `DATABASE_URL`                       | Meaning                                           |
| ------------------------------------ | ------------------------------------------------- |
| `libsql://<host>` / `https://<host>` | Remote libSQL server — **required in production**  |
| `file:<path>` / `<path>`             | Local SQLite file — development, tests, Docker     |

`DATABASE_AUTH_TOKEN` is only sent to a remote server and is ignored for a
local file. It is never logged, never returned by a route and never leaves the
server process. A remote database that has no token answers
`HTTP 401 {"error":"Unauthorized: unauthorized access attempt on database: empty JWT token"}`.

**The API refuses to boot in production with a local database.** A production
start with `DATABASE_URL=./data/devcode.sqlite` fails with a readable message
instead of silently writing data into an ephemeral filesystem. The check can
be waived with `ALLOW_LOCAL_DATABASE=true`, which only makes sense on a
self-hosted host or in the Docker image, where the database lives on a
persistent volume.

---

## 3. Before you start

You need:

- a Vercel account and this repository pushed to a Git provider;
- a libSQL/Turso database (the free tier is enough for this application);
- optionally an OpenAI-compatible API key if the coach should use a real
  model. With `COACH_PROVIDER=mock` (the default) the coach is deterministic,
  offline and free.

Generate the JWT signing secret locally — **never** store it in the repository
and never paste it into a chat, an issue or a commit:

```bash
# macOS / Linux
openssl rand -base64 32
# Windows PowerShell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Put the result in the Vercel project's environment variables (below). Anyone
who has the secret can mint valid sessions; treat it like a password.

---

## 4. The API project (`devcode-api`)

### 4.1 Create the project

1. Vercel dashboard → **Add New… → Project** → import the repository.
2. **Root Directory**: `server`.
3. **Framework Preset**: *Express*.
4. Leave the **build command** and **output directory** empty.

The Express preset is zero-configuration. Vercel looks for an entry file that
exports the Express application as its default export, and accepts
`src/index.{js,ts}` among the supported locations
(<https://vercel.com/docs/frameworks/backend/express>). `server/src/index.ts`
is exactly that: it exports the app and binds no port, because the platform
owns the socket. The listener lives in `server/src/local-server.ts`, which is
what `npm run dev`, `npm start` and the Docker image run. The same source
therefore serves both worlds without a runtime check.

`server/vercel.json` pins the function region (`iad1`, the default region —
change it if you want the function closer to your users or your database).

### 4.2 Environment variables

Set these on the **API** project, for Production **and** Preview:

| Variable              | Example                          | Required | Notes                                                                              |
| --------------------- | -------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `NODE_ENV`            | `production`                     | yes      | Enables HSTS and the production boot checks.                                         |
| `JWT_SECRET`          | `openssl rand -base64 32`        | yes      | ≥ 16 characters. The boot fails if the `.env.example` placeholder is still in use.  |
| `DATABASE_URL`        | `libsql://your-db.turso.io`      | yes      | The remote libSQL database. A local path is rejected in production.                 |
| `DATABASE_AUTH_TOKEN` | `<token from turso db tokens>`   | yes      | Read/write token for that database.                                                  |
| `CORS_ORIGIN`         | `https://your-web-domain`        | yes      | Comma-separated allow-list of browser origins.                                       |
| `TRUST_PROXY`         | `1`                              | yes      | Vercel is one proxy hop. Without it the IP-keyed limits see the proxy IP.           |
| `COACH_PROVIDER`      | `mock` or `openai`               | no       | `mock` needs no key and costs nothing.                                               |
| `COACH_API_KEY`       | `sk-…`                           | if `openai` | Server-side only. Never a `VITE_*` variable.                                     |
| `COACH_MODEL`         | `gpt-4o-mini`                    | no       | Any OpenAI-compatible model id.                                                      |
| `COACH_BASE_URL`      | `https://api.openai.com/v1`      | no       | Any OpenAI-compatible endpoint.                                                      |
| `CSP_ENABLED`         | `true`                           | no       | Turns on the Content-Security-Policy header.                                         |
| `CSP_CONNECT_SRC`     | `https://your-web-domain`        | no       | The web origin the SPA may call (needed when `CSP_ENABLED=true`).                   |
| `LOG_LEVEL`           | `info`                           | no       | `silent` / `error` / `warn` / `info` / `debug`.                                      |

Do **not** set `STATIC_DIR` on Vercel: the API project serves the API only,
and Vercel ignores `express.static()` inside a function anyway. The web
project serves the SPA.

Secrets belong to the API project only. Never add `JWT_SECRET`,
`DATABASE_AUTH_TOKEN` or `COACH_API_KEY` to the web project.

### 4.3 Prepare the database

Run the migrations and the seed **against the remote database, from a machine
that can reach it** — never from the function, which must not migrate on
start-up:

```bash
cd server
npm install

export DATABASE_URL="libsql://your-db.turso.io"
export DATABASE_AUTH_TOKEN="<token>"

npm run db:migrate     # applies server/drizzle/*.sql
npm run db:seed        # copies the 97-question bank into the questions table

# read-only verification of what was actually applied
node scripts/check-schema.mjs   # tables + unique indexes
node scripts/check-seed.mjs     # 97 complete questions, category breakdown
```

The scripts read `DATABASE_URL` / `DATABASE_AUTH_TOKEN` from the environment
first and fall back to `server/.env`, so an operator who configured the file
does not accidentally operate on the default local file. They do **not**
require a server secret such as `JWT_SECRET`, and they print the exact target
they are about to touch (`remote libSQL (<host>)` or `file <path>`) before
writing anything.

**Migration and seeding are different things:**

| Step      | Command         | What it does                                                                 | Repeatable? |
| --------- | --------------- | ------------------------------------------------------------------------------ | ----------- |
| Migration | `npm run db:migrate` | Applies the committed SQL migrations in `server/drizzle/` (0000–0002).    | Yes — already-applied migrations are skipped. |
| Seed      | `npm run db:seed`    | Copies the 97-question bank into the `questions` table and backfills `focus_area`. | Yes — it inserts only missing slugs and updates changed focus areas. It never deletes. |

**The seed is required for a working production deployment**, not optional: the
`questions` table is the server's canonical copy of the question bank. Without
it every attempt submission fails with `404 Question not found` and the coach
has nothing to explain. The seed is idempotent, so re-running it after a bank
change is the intended way to keep the two copies in sync.

The seed refuses to run against a production database unless
`SEED_ALLOW_PRODUCTION=true` is set, so a stray command cannot overwrite the
canonical questions by accident:

```bash
SEED_ALLOW_PRODUCTION=true npm run db:seed
```

`npm run db:backup` only works for a local file. For a remote database use the
provider's own backup tooling (Turso ships point-in-time restore and shadow
databases).

---

## 5. The web project (`devcode-web`)

### 5.1 Create the project

1. **Add New… → Project** → import the same repository.
2. **Root Directory**: `/`.
3. **Framework Preset**: *Vite* (detected from the root `package.json`).
4. Build command `npm run build`, output directory `dist` — both are already
   set in the root `vercel.json`.

The root `vercel.json` also contains the SPA rewrite:

```json
"rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
```

That is what makes a deep link such as `https://your-web-domain/study?topic=…`
or a browser refresh on `/practice` return the app shell instead of a 404.
Rewrites are applied after the static files, so hashed assets under
`/assets/*` are still served directly.

### 5.2 Environment variables

| Variable            | Example                         | Required | Notes                                                       |
| ------------------- | ------------------------------- | -------- | ----------------------------------------------------------- |
| `VITE_API_BASE_URL` | `https://your-api-domain/api`   | yes      | Baked into the client bundle at build time. **No secrets.**  |

`VITE_*` variables are inlined into the browser bundle. Only a public URL may
ever be placed there. Set it to the API's base URL **including** the trailing
`/api`, because the API mounts every route under `/api`.

### 5.3 CORS, CSP and cookies

- `CORS_ORIGIN` on the API must contain the web origin, otherwise the browser
  blocks the `fetch()` calls before they leave the page.
- `CSP_ENABLED=true` plus `CSP_CONNECT_SRC=<web origin>` keeps the
  Content-Security-Policy in step with the cross-origin API.
- The API is authenticated with a bearer token in the `Authorization` header
  and never sets a cookie, so there is no `SameSite`/`Secure`/third-party
  cookie problem.

---

## 6. Deploy order

The API must exist and be reachable before the frontend can point at it, and
the database must hold the schema before the API can serve requests.

1. Provision the database.
2. Apply the migrations, then seed it, then verify both.
3. Create the API project, add its environment variables, deploy it.
4. Verify `/api/live` and `/api/health` on the deployed API.
5. Create the web project, set `VITE_API_BASE_URL` to the deployed API URL
   plus `/api`, deploy it.
6. Verify the application end to end (section 7).
7. Add the uptime monitor (section 8).

---

## 7. Verifying the deployment

```bash
# API liveness — no dependency, no authentication
curl -i https://your-api-domain/api/live
# → HTTP/2 200, {"status":"ok","uptimeSeconds":42}

# API readiness — the database must answer
curl -i https://your-api-domain/api/health
# → HTTP/2 200, {"status":"ok","uptimeSeconds":42,"db":"ok"}

# The web app — the SPA shell, not a 404
curl -I https://your-web-domain/study?topic=must-b-trees-vs-hash
# → HTTP/2 200, text/html
```

Then check the application itself, in the browser:

1. Create an account (the coach endpoint is authenticated).
2. Run a quiz and submit it — the attempt must persist (it lands in the
   `attempts` table).
3. Press **Coach me on my misses** — the coach panel must render.
4. Open a recommended topic in the Study hub and come back — the results and
   the coaching session must still be there.
5. Run the generated practice questions.

`vercel dev` runs the projects the way production does, which is the closest
thing to a local rehearsal:

```bash
npx vercel@latest dev      # run from the repository root and from server/
```

---

## 8. Uptime monitoring

### 8.1 Which endpoint to monitor

| Endpoint      | Kind      | Checks the database? | Use it for                                    |
| ------------- | --------- | -------------------- | --------------------------------------------- |
| `/api/live`   | Liveness  | **No**                | The uptime monitor. Cheap, always meaningful. |
| `/api/health` | Readiness | Yes (`SELECT 1`)     | Manual checks and dashboards.                 |

**Monitor `/api/live`.** It answers `200` as long as the process can serve a
request. It never touches the database, the AI provider or any other
dependency, so a slow database cannot make the monitor report the API as
down, and a routine ping cannot add load to the database.

The liveness response is intentionally minimal:

```json
{ "status": "ok", "uptimeSeconds": 42 }
```

It exposes no environment variables, no version numbers, no hostnames and no
credentials. It is safe to monitor from the public internet.

Never point a monitor at `/api/coach`, `/api/auth/login` or `/api/attempts`:
those are authenticated, they cost money and they write to the database.

### 8.2 The monitor to create

| Setting            | Value                                        |
| ------------------ | -------------------------------------------- |
| Monitor Type       | HTTP(s)                                      |
| URL                | `https://<deployed-api-domain>/api/live`     |
| Method             | GET                                          |
| Monitoring Interval| 5 minutes (see 8.3)                          |
| Timeout            | 30 seconds — a cold start may take a couple of seconds |
| Keyword check      | `status` (optional, on the free plan)        |

### 8.3 Interval: what the current plans actually allow

Verified against the current UptimeRobot pricing page
(<https://uptimerobot.com/pricing/>, page modified 2026-10-28):

| Plan   | Monitors | Monitoring interval |
| ------ | -------- | ------------------- |
| Free   | 50       | **5 minutes**       |
| Solo   | 10       | 60 seconds          |
| Team   | 100      | 30 seconds          |
| Scale  | 200      | 15 seconds          |

**5 minutes is exactly the free tier's interval**, so the recommendation costs
nothing and needs no paid plan. Shorter intervals are not free: on Fluid
compute an instance is billed for its provisioned memory while it is running
(<https://vercel.com/docs/functions/usage-and-pricing>), and Vercel pauses an
instance as soon as its in-flight requests finish, so a frequent ping cannot
guarantee a warm instance anyway.

### 8.4 What uptime monitoring does and does not do

An uptime monitor **does**:

- tell you when the deployed URL stopped answering, and when it came back;
- reduce the cold-start latency of the *next* real request, because a recent
  request keeps the instance warm for a while;
- give you a response-time history, which is often the first hint of trouble.

An uptime monitor **does not**:

- guarantee that the service stays alive. **Vercel controls availability.** A
  monitor cannot prevent provider maintenance, a crashed instance, a
  deployment in progress, or a plan limit;
- replace a paid always-on plan. Vercel Functions scale to zero by design;
  there is no "always-on" toggle on the Hobby plan;
- make the API faster for users who arrive between two pings — a request after
  a long idle still pays the cold start.

Vercel's own **Observability** tab already records invocations, error rate,
duration and external API calls for the function on every plan
(<https://vercel.com/docs/observability>). Use the external monitor for
*outage alerting* and Vercel Observability for *diagnostics*.

### 8.5 Reading the failures

| Symptom                              | Where to look                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Monitor reports down                | API project → **Observability → Vercel Functions** (invocations, error rate) and **Logs** (runtime logs). |
| Monitor reports down, no logs       | The deployment may be failing its build, or the project may be paused (deployment protection).       |
| `/api/live` fine, `/api/health` 503 | The database is unreachable: check `DATABASE_URL`/`DATABASE_AUTH_TOKEN` and the database's own status. |
| Monitor reports slow                | A cold start. Raise the monitor's timeout; Vercel's first invocation after an idle period compiles and boots the function. |
| Coach requests fail with `502`/`503`| The AI provider or the daily token budget, not the web server — `/api/live` stays green.              |

Runtime logs are kept for 1 hour on Hobby, 1 day on Pro and 3 days on
Enterprise (<https://vercel.com/docs/limits>).

A **second, optional** monitor for the deployed web URL (`https://your-web-domain`)
is worth adding: it catches a broken frontend deploy that the API monitor
cannot see. It is not a substitute for the backend liveness monitor.

---

## 9. What changes on Vercel

| Concern                | Behaviour                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Process model          | The whole API is one Vercel Function on Fluid compute; it scales to zero and back up on demand.        |
| Maximum duration       | Hobby: 300 s default **and** maximum. Pro/Enterprise: 300 s default, 800 s maximum. The coach's own provider timeout is 30 s, so it never gets close (<https://vercel.com/docs/functions/limitations>). |
| Request / response body| 4.5 MB platform limit; the API caps its own JSON bodies at 1 MB.                                        |
| Memory                 | 2 GB / 1 vCPU on every plan.                                                                           |
| Bundle size           | 250 MB uncompressed. The API bundle is a few megabytes.                                                 |
| Filesystem             | Ephemeral — nothing may be written to disk. The database is remote, the SPA is served by the CDN.      |
| In-memory state       | The rate limiter, the coach response cache, the in-flight de-duplication and the daily token budget live **per instance**. With several instances the effective limits multiply and the cache is per instance. Move them to a shared store if that ever matters. |
| `X-Forwarded-For`     | Set `TRUST_PROXY=1`, otherwise every request appears to come from Vercel's proxy and the IP-keyed limits would throttle all users together. |
| WebSockets / jobs      | Not used by this application. Nothing needs a long-lived connection or a background worker.             |
| Cold starts            | The first request after an idle period is slower. Keep monitor timeouts generous.                        |

---

## 10. Costs

| Service              | Cost                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Vercel (Hobby)       | Free for personal/non-commercial use; the function limits above apply. Pro is billed per usage.            |
| Turso/libSQL (Free)  | $0 — 100 databases, 5 GB storage, 500 M rows read/month, 10 M rows written/month, 1-day point-in-time restore (<https://turso.tech/pricing>). The Developer plan is $4.99/month. |
| UptimeRobot (Free)   | $0 — 50 monitors, 5-minute interval, keyword monitoring, 3-month data retention (<https://uptimerobot.com/pricing/>). |
| AI provider           | $0 with `COACH_PROVIDER=mock` (deterministic, offline). A live provider bills per token; the API caps a single response at `COACH_MAX_OUTPUT_TOKENS` (700 by default), the request at `COACH_REQUEST_TIMEOUT_MS` (30 s) and the process-day at `COACH_DAILY_TOKEN_BUDGET` (50 000 tokens). |

**The whole deployment can run at $0**, but only with the mock coach, the
Hobby plan and the free tiers — and Hobby is a personal/non-commercial plan.
It is not a production SLA. The first real cost appears when the coach calls
a live model, or when usage grows past the free allowances.

---

## 11. Rollback

- **Code**: Vercel keeps every deployment; use **Instant Rollback**
  (<https://vercel.com/docs/deployments/instant-rollback>) to promote the
  previous deployment. Nothing in the repository has to change.
- **Database**: the migrations in `server/drizzle/` are additive (tables and
  columns are created; no column is dropped or renamed), so rolling the code
  back to an older deployment keeps working against the migrated schema.
  Take a Turso point-in-time restore (or a shadow database) before a
  migration that you expect to be irreversible.
- **Secrets**: rotate `JWT_SECRET` in the API project and redeploy — every
  session is invalidated, every user signs in again. Rotate
  `DATABASE_AUTH_TOKEN` by issuing a new token in Turso and updating the API
  project; rotate `COACH_API_KEY` at the provider.

---

## 12. Known limitations

- **Per-instance in-memory controls.** The rate limiter, the coach cache, the
  in-flight de-duplication and the daily token budget live in the function
  instance. With several instances the effective limits multiply and the cache
  is not shared. Acceptable at this scale; move them to a shared store
  (Upstash, Vercel KV) if it ever matters.
- **Cold starts.** The first request after an idle period is slower. The
  5-minute monitor keeps the instance warm only occasionally.
- **No automated backups.** The database is backed up by the provider
  (Turso point-in-time restore), not by this repository.
- **The seed must be re-run after a question-bank change**, otherwise the
  server's copy of the bank drifts from the frontend's.
- **The AI coach is deterministic without a provider key.** With
  `COACH_PROVIDER=mock` the explanations are templates built from the
  attempt, not model output.

---

## 13. The optional container path

The repository also ships a Docker image and a Compose file for a
self-hosted, single-host deployment (one container serving the API and the
built SPA on one origin, with the database on a persistent volume):

```bash
docker compose --env-file .env.compose up -d --build
```

This path is **not** the documented deployment target and is not required for
Vercel. It exists for an operator who wants the whole product on one host.
`ALLOW_LOCAL_DATABASE=true` is set in the image because the volume really is
persistent there.

---

## 14. What changes on the repository

Nothing in this repository deploys anything, provisions a database or creates
a monitor. The repository contains the configuration, the verification and the
instructions; the owner performs the external steps.
