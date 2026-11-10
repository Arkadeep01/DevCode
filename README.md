# DevCode — Interview Prep, Reimagined

DevCode is a developer-interview prep platform: a study hub with 15 topics and a full timed assessment engine backed by a 97-question bank. The UI is a React + TypeScript + Vite single-page app with light/dark theming, plain CSS design tokens, and no UI framework.

The project is a full-stack app: an Express + TypeScript API with a SQLite database (Drizzle ORM) powers accounts today, with saved progress and code submissions planned for later phases.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend (current) | React 19, TypeScript 5.8, Vite 6, React Router 7, plain CSS + design tokens |
| Backend | Node.js, Express, TypeScript, Zod-validated config; JWT auth with bcrypt |
| Database | SQLite via Drizzle ORM (schema and SQL migrations committed) |
| Tooling | npm, strict TypeScript, ESLint (flat config), Prettier |

## Repository layout

The Vite app lives at the repository root. The API lives in a single `server/` folder with its own `package.json` — there is no separate `frontend/` / `backend/` split:

```
.                 Vite root: index.html, src/, public/, vite.config.ts, tsconfig.json
server/           Express API: bootstrap, config, Drizzle client + schema, migrations
```

### Server folder map

```
server/
  src/config/env.ts   Zod-validated environment (fails fast at boot)
  src/db/client.ts    better-sqlite3 connection (WAL, foreign keys)
  src/db/schema.ts    Drizzle schema (users table and auth fields)
  src/app.ts          Express app: helmet, CORS, /api/health, JSON errors
  src/index.ts        bootstrap + graceful shutdown
  drizzle.config.ts   drizzle-kit config (SQLite, migrations in drizzle/)
```

### Frontend folder map

```
src/
  assets/            hero image (imported by the Hero section)
  components/        shared UI: Button, Card, Tag, CodeBlock, Logo, Navbar,
                     Footer, Eyebrow, SectionHeader, Toast
  data/
    questionBank/    10 files, one per track (94 MCQs total, correctIndex 0)
    topicBank/       4 files, one per study-path category (15 topics total)
    questions.ts     re-exports QUESTIONS + TRACKS + count helpers
    studyTopics.ts   re-exports STUDY_TOPICS + category meta
  pages/
    Home/            Hero, StatStrip, PathCards, DailyChallengeSection, CtaBand
    Study/           filters, topic cards, topic detail dialog, progress hooks
    Practice/        SetupScreen, QuizScreen, ResultsScreen, session hook
    Auth/            login and signup forms
  styles/            tokens.css (colors/spacing), base.css, typography.css
  theme/             ThemeProvider + ThemeToggle (localStorage `devcode_theme`)
  types/             Question + StudyTopic types
  utils/             shuffle, storage, sanitizeRichText, document title
```

Pages never import each other; shared UI lives in `components/`, data in `data/`.

## How to run

Both servers are needed: the SPA calls the API, and the API owns the database.

### 1. API (`server/`) — terminal 1

```bash
cd server
npm install
cp .env.example .env        # the template works as-is; JWT_SECRET is the only value worth changing
npm run db:migrate           # create/upgrade server/data/devcode.sqlite
npm run db:seed              # copy the 97-question bank into the questions table
npm run dev                  # tsx watch -> http://localhost:4000/api/health
```

### 2. Frontend (repository root) — terminal 2

```bash
npm install
npm run dev                  # vite -> http://localhost:3000
```

The SPA calls the relative path `/api`, which the Vite dev server proxies to
`http://localhost:4000`, so no extra configuration is required. To point the
SPA at another API host instead, set `VITE_API_BASE_URL` in a root `.env`
(see `.env.example`); the origins allowed by CORS are listed in
`server/.env` as `CORS_ORIGIN`.

> The login page reports **"Unable to connect. Please try again."** when the
> API is not running or is not reachable from the browser. Check
> `http://localhost:4000/api/health` first.

### Other scripts

```bash
# Frontend
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the production build (also proxies /api)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm run format     # prettier --write .

# API
npm run build          # tsc -> dist/
npm run start          # node dist/index.js
npm run typecheck      # tsc --noEmit
npm run lint           # eslint src test
npm run db:generate    # drizzle-kit generate (after schema changes)
npm run db:migrate     # apply migrations
npm run db:studio      # inspect the SQLite database
npm run db:seed        # sync the question bank into the database
npm run coach:smoke    # end-to-end check of the AI coach pipeline
```

Run both dev servers side by side: the SPA on `:3000` proxies `/api` to the API on `:4000`.

## API endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | Service status + SQLite ping |
| `POST` | `/api/auth/register` | — | Create an account (`email`, `password`, `displayName`) → `{ token, user }` |
| `POST` | `/api/auth/login` | — | Email + password → `{ token, user }` |
| `GET` | `/api/auth/me` | Bearer | Current user from the JWT |

## Environment variables

Templates: `.env.example` at the root (frontend) and `server/.env.example` (API). Copy each to `.env` beside it. Real `.env*` files are gitignored; only the `.example` templates are committed.

| Variable | Where | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | frontend | `/api` (proxied) | Base URL the SPA calls; leave unset in dev so the Vite proxy is used |
| `NODE_ENV` | server | `development` | `development` / `test` / `production` |
| `PORT` | server | `4000` | API listen port |
| `CORS_ORIGIN` | server | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated allowed browser origins |
| `DATABASE_URL` | server | `./data/devcode.sqlite` | SQLite file (relative to `server/`), auto-created on boot |
| `JWT_SECRET` | server | — (required) | JWT signing secret, min 16 chars |
| `JWT_EXPIRES_IN` | server | `7d` | Token lifetime |

The server validates all of the above with Zod at boot and exits with a readable message when something is missing.

## Editing

- **Colors/themes:** edit `src/styles/tokens.css` only. Light values live under `:root`, dark under `[data-theme='dark']`; change a token once and it propagates everywhere.
- **Fonts/sizes:** edit `src/styles/typography.css` (`--font-*`, `--text-*`). Iceberg is display-only (headings ≥ h1/h2); body is Manrope, UI headings Space Grotesk, code JetBrains Mono.
- **Adding a question:** add an object to the right file in `src/data/questionBank/`. Keep `correctIndex: 0` — the engine Fisher-Yates shuffles options per session and remaps the index. Available categories: `dsa, system_design, oop, sql, web, os, python, cpp, java, javascript`; difficulties: `Beginner, Intermediate, Advanced`.
- **Adding a study topic:** add an object to `src/data/topicBank/` (category: `dsa, must_know, language, db_sys`). Rich text in `deepDive`/`pitfalls` may use only `<code>`, `<strong>`, `<em>` — it is sanitized at render time.

Each hand-written file is kept under ~200 lines; when a bank grows, add a new file rather than bloating an existing one.

## localStorage keys

- `devcode_theme` — `'light'` or `'dark'`.
- `devcode_study_mastered` — JSON array of mastered topic IDs.
- `devcode_study_bookmarks` — JSON array of bookmarked topic IDs.
- `devcode_quiz_history` — JSON array of quiz attempts (newest first, capped at 20; UI shows the last 5). Clear via the setup screen or by removing the key.

## Behavior notes

- Practice sessions: multi-track selection, Beginner/Intermediate/Advanced/Mixed, 5–20 questions, 90s per question countdown (or untimed), warned submit when questions are unanswered, results with per-track breakdown, focus areas from missed questions, full review, retake-same-set / retry-missed / new-quiz.
- Quiz shortcuts: `1–4` or `A–D` to answer, arrows to navigate, `F` to flag. The timer is cleared on unmount and never auto-submits in the background.
- Study hub: search, category + flag filters (`?category=dsa` deep-links preselect a category), bookmark/mastered state, topic detail dialog with sanitized pitfalls.
- Accessibility: keyboard-operable controls, visible focus rings, `prefers-reduced-motion` support.

## Notes / assumptions

- The original hero image shipped at `public/assets/devcode-background.jpg` now lives at `src/assets/hero-bg.jpg` and is bundled.
- The legacy static app (`public/questions.js`, single-file `index.html`) was fully replaced by this Vite project.

## Project phases (isolated commits)

1. **Structure & docs** _(done)_ — `.gitignore`, `README.md`. No folders are created until they are actually required.
2. **Environment & config** _(done)_ — `.env.example` templates, ESLint/Prettier, server TypeScript + Drizzle configuration under `server/`.
3. **Schema & auth** _(done)_ — users table and migrations, bcrypt password hashing, JWT register/login/me routes, typed API client, auth provider, protected route and login/signup screens.
4. **Features, one task per commit** — question bank & practice API/UI, code editor integration, feedback/evaluation, dashboard & analytics.

Commit convention: `chore:` for setup phases, `feat:` for feature work. Each phase is committed on its own before the next one starts.
