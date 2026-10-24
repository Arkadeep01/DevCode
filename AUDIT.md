# DevCode — Read-Only Project Audit

- **Date:** 2026-10-18
- **Audited revision:** `9986d44 feat: implement jwt authentication api` (working tree clean at start; no files modified by this audit — the only created file is this report)
- **Scope:** the whole repository: React 19 + TS + Vite frontend at the root **and** the `server/` API, plus repo hygiene.
- **Note on the brief's premise:** the brief assumed "no backend exists yet; FastAPI + PostgreSQL planned". That is outdated. A committed backend already exists: **Express 5 + TypeScript + Drizzle ORM + SQLite (better-sqlite3)**, with schema/migrations, register/login/me JWT routes, and Zod-validated env (`server/`, commits `bcec476`, `9986d44`). This report audits the app as it actually is, and the "backend readiness" section covers readiness for the *planned feature phases*, not for a first backend.

---

## 1. Executive summary

DevCode is in good shape for a project of this size: strict TypeScript with **zero `any` / `@ts-ignore` / `eslint-disable`**, no circular dependencies (madge: 97 files, none), **zero hardcoded colors** outside `tokens.css`, a clean build (420.18 kB JS / 133.38 kB gzip), a clean root `npm audit` (0 vulnerabilities), and a question bank whose data validates completely (94 unique ids, 4 options each, no missing fields). The dark theme passes WCAG AA cleanly; the light theme has a handful of real contrast misses (hero accent, teal/success/warn tags, nav links). The most visible defect is **mobile navigation: all nav links are hidden ≤860 px with no hamburger replacement**. The quiz engine is logically correct (value-based `correctIndex` remap after shuffling, no source mutation, no repeats), but the timer is tick-based (background-tab throttling can stall it), leaving a quiz mid-session discards it silently, and timer auto-submit bypasses the unanswered warning. The biggest engineering risk is that **there is no test runner and no tests at all** for a scoring engine + auth API. Several "known issues" from the brief are already resolved or were never present (details in §2).

### Health scores (0–10)

| Area | Score | One-line reason |
|---|---|---|
| A. Architecture & modularity | 8 | Clean structure, no cycles, no >200-line files; some dead code |
| B. Routing / navigation / scrolling | 6 | ScrollManager is solid; no mobile nav, URL/filter desync, no 404 |
| C. Theme & CSS | 8 | Best-in-class token system, 0 hardcoded colors; dead tokens/dupes |
| D. Study hub | 7 | Works end-to-end; focus-steal bug, no-op tag filter, modal a11y gaps |
| E. Practice / quiz engine | 6 | Scoring/shuffle correct; timer, exit-guard and confirm issues |
| F. Home page | 7 | Composition matches intent; daily-challenge CTA is effectively dead |
| G. Accessibility | 6 | Strong foundations; contrast misses, timer not announced, mobile nav |
| H. Performance | 7 | Small CSS, fine gzip; single 420 kB chunk, no code splitting |
| I. Security & privacy | 9 | No secrets/eval; sanitized rich text; font CDN lacks SRI |
| J. TypeScript & code quality | 8 | 0 any/ignores; few stricter flags missing; minor duplication |
| K. Tests | 1 | No framework, no tests, no test script |
| L. Responsiveness & cross-browser | 6 | Fluid grids, no forced overflow; mobile nav + `nowrap` masking |
| M. Repo & backend-readiness | 7 | Clean repo; metadata.json leftovers; no frontend API/auth layer yet |

**Overall: ~6.6 / 10.** **Single biggest risk: zero automated tests (K1)** around quiz scoring, timer cleanup and auth — regressions there are silent. **Most visible user-facing defect: no mobile navigation (B1).**

---

## 2. Verification of previously known issues

| # | Issue (from brief) | Status | Evidence |
|---|---|---|---|
| 1 | Tag mismatch `company_fav` vs `favorite` → Company Favorite filter empty | **Not present / filter works** | Data uses `company_fav` (e.g. `src/data/topicBank/dsa.ts:10`), filter value is `company_fav` (`src/pages/Study/StudyToolbar/StudyToolbar.tsx:8`), matched via `topic.tags.includes(tag)` (`src/pages/Study/useStudyFilters.ts:33`); returns 9/15 topics (script count). Only cosmetic singular/plural mismatch remains (D6). |
| 2 | Every question had `correctIndex: 0` | **Still present, by design** | All 94 are 0 (script distribution `{0:94,1:0,2:0,3:0}`); options are shuffled per session and the index remapped by option **value** (`src/pages/Practice/usePracticeSession.ts:11-15`), documented in `src/types/question.ts:26-28`. No duplicate option text exists today (script), so remap is unambiguous; fragile if duplicates are ever introduced (E6 note). |
| 3 | `java-a1` snippet used JS arrow `=>` instead of `->` | **Not present** | `Select-String java.ts "=>"` → 0 matches; lambdas correct (`java.ts:95-96`). Only `=>` in the bank are legitimate JS arrows (`javascript.ts:56-57`). |
| 4 | "Tell your story" placeholder CTA | **Partially** | Link exists and destination is valid (`/study?category=must_know`, `src/pages/Home/CtaBand/CtaBand.tsx:24-26`) but the label doesn't match the content (no behavioral-interview hub). Worse: daily-challenge CTA "Solve the challenge" → `/practice` with no preselect and "Two Sum" is not in the bank (F1). |
| 5 | Flashcard mode | **Not found** | No flash/flashcard/card-mode code anywhere; still advertised in the meta description (`index.html:10` — "study paths, flashcards, daily challenges") and README mentions the concept. |
| 6 | Grid overlay painted above content (z-index) | **Fixed** | Overlay now `z-index: -1` with comment "was 0, which painted over content" (`src/styles/tokens.css:152-156`); root lifted via `#root { position: relative; z-index: 1; }` (`src/styles/base.css:34-36`). |
| 7 | Dark "Why DevCode"/CTA band a flat bright blue slab | **Fixed** | Dark `--cta-bg: #0c2b66` "calm deep blue band" (`src/styles/tokens.css:137`); daily band uses `--section-dark: #040c1c` (`tokens.css:108`). |
| 8 | `var(--blue)` used as a button fill | **Not present** | `var(--blue)` is used **nowhere** (grep: none); buttons use `--primary`/`--on-primary`. `--blue`/`--blue-hover` are now dead tokens (C1). |
| 9 | Hero image dimming | **Fixed** | `opacity: 0.6` + `filter: var(--hero-filter)`; dark filter `brightness(0.6) saturate(0.9)` (`src/styles/tokens.css:142`, `src/pages/Home/Hero/Hero.css:15-16`). |

---

## 3. Findings

Severity: **Critical** (broken/security/data-loss) · **High** (users will notice) · **Medium** (maintainability/quality) · **Low** (polish). No Critical findings were identified.

| ID | Sev | Area | File:line | Problem | Recommended fix | Effort |
|---|---|---|---|---|---|---|
| A1 | Medium | Architecture | `src/pages/Study/useTopicProgress.ts:16-30` (and 32-46); `src/pages/Study/StudyPage.tsx:21-22` | State updater is impure: `writeIdSet` inside the `setState` callback and an `added` flag captured from it; React may invoke updaters twice (StrictMode) or defer, so the toast can be inverted and localStorage double-written | Compute `next` from current state before calling `setMastered`; keep the updater pure | S |
| A2 | Low | Architecture | `src/utils/escapeHtml.ts:2-10`, `src/pages/Study/useStudyFilters.ts:54`, `src/types/topic.ts:10` | Dead code/data: `escapeHtml` never imported; `export type { StudyTopic }` re-export unused; `frequency` field never rendered | Delete or start using | S |
| A3 | Low | Architecture | `src/assets/devcode.png` | 83 KB image never imported anywhere | Delete | S |
| A4 | Low | Architecture | `src/pages/Study/TopicCard/TopicCard.tsx:7`, `:31` | Non-component export `TAG_META` triggers the only component-layer lint warning; `Card interactive` looks clickable but `Card` has no click handling | Move `TAG_META` beside the component or export it from its own file; drop `interactive` or implement it | S |
| B1 | **High** | Routing/Nav | `src/components/Navbar/Navbar.css:50-59` (no toggle in `Navbar.tsx`) | **No mobile navigation**: at ≤860 px all nav links are `display:none`, at ≤560 px the CTA hides too; no hamburger exists, so phones are left with only the Logo | Add a hamburger menu (open/close, close on route change, focus management) | M |
| B2 | Medium | Routing/Nav | `src/pages/Study/useStudyFilters.ts:16-27`; `src/pages/Study/StudyPage.tsx:30-34` | `?category=` is one-way: preselects on load, but changing/resetting filters never updates/removes the param (`setSearchParams` unused anywhere); refresh re-applies a filter the UI no longer shows | Sync filter state → URL with `setSearchParams` | S |
| B3 | Medium | Routing/Nav | `src/components/ScrollManager/ScrollManager.tsx:30-36, 55-60` | `scrollRestoration = 'manual'` + unconditional `scrollToTop()` on every navigation means Back/Forward never restores the previous scroll position | Restore scroll for POP navigations (e.g. only scroll top for PUSH, or store positions) | M |
| B4 | Medium | Routing/Nav | `src/App.tsx:22` | No 404: unknown URLs silently `Navigate replace` to Home with no message | Add a small NotFound route/page | S |
| B5 | Low | Routing/Nav | `src/components/ScrollManager/ScrollManager.tsx:41-49`; `src/utils/scrollToSection.ts:73` | Cross-route `{state:{scrollTo}}` replay path is unreachable (callers are Home-only); after an in-page scroll it focuses the Hero h1, so focus and viewport disagree | Remove the dead path; focus the target section heading instead | S |
| B6 | Low | Routing/Nav | `index.html:7` | No per-route `document.title` updates | Set title per page (small effect or in ScrollManager) | S |
| C1 | Low | Theme/CSS | `src/styles/tokens.css:28-29, 30, 38, 61, 70, 78, 92` | Unused tokens (grep count 0 outside tokens.css): `--blue`, `--blue-hover`, `--navy-soft`, `--overlay-navy`, `--container-narrow`, `--radius-xl`, `--dur-slow`, `--leading-normal` | Remove or use | S |
| C2 | Low | Theme/CSS | `src/styles/base.css:87-90` vs `:124`; `:56-59` vs `:126`; `:48-54` vs `:125` | Duplicate rules (`::selection`, `::placeholder`, input styling) defined twice in one file | Merge into one block | S |
| C3 | Low | Theme/CSS | `index.html:15-18` | 13 font faces loaded from Google Fonts (Manrope 5 weights, JetBrains Mono 4, Space Grotesk 3, Iceberg 1); `display=swap` and preconnects are correctly present, but several weights may go unused | Audit weight usage; trim; consider self-hosting | M |
| D1 | Medium | Study | `src/data/topicBank/*.ts` (`tags:` lines — all 15 topics) | **"High frequency" filter is a no-op**: every topic is tagged `high_freq` (script: 15/15; company_fav 9/15, core 10/15), so the pill returns the full list | Re-tag topics with a genuine subset, or drop the pill | S |
| D2 | Medium | Study | `src/pages/Study/TopicDetail/TopicDetail.tsx:29-41` + `src/pages/Study/StudyPage.tsx:95` | Effect depends on `[onClose]`; parent passes an inline lambda, so every parent re-render (e.g. toggling mastered in the dialog) re-runs the effect and **steals focus to the Close button** | Stabilize the callback (`useCallback`) or keep it in a ref | S |
| D3 | Medium | Study | `src/pages/Study/TopicDetail/TopicDetail.tsx:44-50` | Modal has `role="dialog" aria-modal` + Escape + scroll lock, but **no focus trap / inert background**, and focus isn't restored to the trigger on close | Add a focus trap (or native `<dialog>`); restore focus | M |
| D4 | Low | Study | `src/components/CodeBlock/CodeBlock.tsx:17-25` | Clipboard failure is silently swallowed (no toast/fallback); the 1600 ms "Copied" timeout isn't cleared on unmount | Toast on failure; clear timeout in cleanup | S |
| D5 | Low | Study | `src/pages/Study/TopicDetail/TopicDetail.tsx:102, 120` | `sanitizeRichText()` re-parses the DOM for every rich-text item on every render (no memoization) | `useMemo` per item/topic | S |
| D6 | Low | Study | `src/pages/Study/StudyToolbar/StudyToolbar.tsx:8` vs `src/pages/Study/TopicCard/TopicCard.tsx:9` | Label inconsistency: "Company favorites" (plural) in toolbar vs "Company favorite" on cards; same for "Core concepts/concept" | Pick one wording | S |
| E1 | Medium | Practice | `src/pages/Practice/usePracticeSession.ts:41-43` | Countdown is tick-based (`prev - 1`), not wall-clock; background-tab throttling stalls it while `timeSec` (from `Date.now()`, `:42`, `computeResult.ts:28`) keeps growing — the clock can effectively be paused by hiding the tab | Store a deadline timestamp and derive `timeLeft` from it | S |
| E2 | **High** | Practice | `src/pages/Practice/usePracticeSession.ts:39-46`; `src/App.tsx:15` | Leaving the route mid-quiz (Navbar is always clickable) silently destroys the session — no persistence, no `beforeunload`/visibility guard anywhere | Add an exit confirmation and/or persist in-progress session | M |
| E3 | Medium | Practice | `src/pages/Practice/usePracticeSession.ts:80-84`; `src/pages/Practice/QuizScreen/QuizScreen.tsx:56-62` | Manual submit warns about unanswered questions, but **timer auto-submit bypasses the warning**; and once the confirm banner is shown, the top button submits without further confirmation | Align both paths (e.g. auto-submit marks remaining as skipped visibly; keep confirm state consistent) | S |
| E4 | Low | Practice | `src/pages/Practice/QuizScreen/useQuizShortcuts.ts:21-22` | Shortcuts ignore modifier keys (Ctrl+A answers A), fire while the confirm banner is open, ignore `contentEditable`/SELECT, and never `preventDefault` (arrows scroll) | Guard modifiers + dialog state; preventDefault on handled keys | S |
| E5 | Low | Practice | `src/utils/storage.ts:39-46`; `src/pages/Practice/SetupScreen/SetupScreen.tsx:180` | Quiz history is read with an unchecked cast (corrupt data can render NaN/"Invalid Date") and list rows keyed by `attempt.date` (theoretical collisions) | Validate on read; key by index+href or add an id | S |
| E6 | Medium | Practice (data) | `src/data/questionBank/*.ts` (script output) | **Answer-length skew**: in 54 of 94 questions the correct option is >1.8× longer than the average distractor (e.g. `java-a2` 210 vs 74 chars). Combined with all-correct-index-0 this doesn't leak position (options shuffle), but length alone is a reliable guess heuristic | Rewrite distractors to similar length/plausibility | L |
| F1 | **High** | Home | `src/pages/Home/DailyChallengeSection/DailyChallengeSection.tsx:30-32`; `src/data/dailyChallenge.ts:12-27`; `src/pages/Practice/SetupScreen/SetupScreen.tsx:19` | "Solve the challenge" → `/practice`, which consumes no param and starts with zero tracks selected; "Two Sum" exists only in `dailyChallenge.ts` and in no question bank — the CTA is effectively dead | Preselect a track/config via query param and/or add the challenge to the bank | M |
| F2 | Low | Home | `src/pages/Home/CtaBand/CtaBand.tsx:24-26` | "Tell your story" points at `/study?category=must_know`, which has no behavioral-interview content — marketing label vs actual destination | Rename the label or link it where it belongs | S |
| F3 | Low | Home | `src/pages/Home/Hero/Hero.tsx:13` | Hero `<img>` has no `width`/`height` (CLS risk), no `decoding`, no `fetchpriority`; no `onError` fallback (only the CSS `background: var(--bg)` safety net, `Hero.css:4`) | Add intrinsic dims (1600×1024) + `decoding="async"` + `fetchpriority="high"` | S |
| G1 | Medium | A11y/Theme | `src/pages/Home/Hero/Hero.css:47-49`; `src/components/Tag/Tag.css:27-49`; `src/components/Navbar/Navbar.css:28-36`; `src/styles/tokens.css` | **Light-theme contrast misses** (computed, see appendix): hero teal accent **2.38:1** (large display text, needs 3:1), Tag `info` **2.14**, `success` **4.33**, `warn` **4.17** (small text, need 4.5), navbar links (`--muted`) **3.97**. Dark theme passes all text pairs (5.4–18:1). `border-strong` vs surface is 1.62/1.92 (non-text, Low) | Darken light-theme text tokens (use an ink-teal / ink-warn for text, keep bright tone for dark theme) | S |
| G2 | Medium | A11y | `src/pages/Practice/QuizScreen/QuizScreen.tsx:71-74` | Timer has `role="timer"` but **no aria-live**; the low-time state is purely visual (color change), so screen-reader users get no warning before auto-submit | Announce low-time via polite live region | S |
| G3 | Low | A11y | `src/pages/Study/StudyPage.tsx:41`, `src/pages/Study/TopicCard/TopicCard.tsx:48` | Study page jumps h1 → h3 (no h2) | Make card titles h2 or add a hidden h2 | S |
| G4 | Low | A11y | `src/pages/Home/HomePage.tsx` (no `<header>`) | Home lacks a page-level `<header>` landmark (Study/Practice have one) | Wrap hero in `<header>` | S |
| H1 | Medium | Performance | Build output; `src/data/questions.ts:2-24`; `src/App.tsx:6-8` | Single 420.18 kB JS chunk (gzip 133.38): question bank (94 Q), topic bank, all 3 pages and both themes are in one bundle — no lazy routes or data code-splitting | `React.lazy` for Practice/Study; consider splitting banks (or move to API) | M |
| H2 | Low | Performance | `src/assets/hero-bg.jpg` (160,749 B, 1600×1024 JPG) | No modern format (WebP/AVIF); loaded eagerly (above the fold — reasonable, but pair with F3 dims) | Serve WebP/AVIF with JPG fallback | M |
| I1 | Low | Security | `index.html:15-18`, `:19-33` | Google Fonts stylesheet has no SRI (third-party supply-chain), and the inline theme bootstrap has no nonce/hash — both block a strict CSP | Self-host fonts; plan CSP with hash/nonce for the inline script | M |
| J1 | Medium | TS/Quality | `tsconfig.json:2-19` | Missing stricter flags: `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noImplicitReturns` (all absent); `allowJs: true` is leftover | Enable them and fix fallout | M |
| J2 | Low | TS/Quality | `tsconfig.json:20` (`include: ["src"]`) | `vite.config.ts` and `eslint.config.js` are never type-checked by the build | Add a small tsconfig/check for config files | S |
| J3 | Low | TS/Quality | `src/pages/Practice/computeResult.ts:27` vs `ResultsScreen.tsx:101`; `src/theme/ThemeProvider.tsx:26-35` vs `index.html:20-32` | Duplicated logic: percentage formula in two places; theme bootstrap (key + matchMedia) duplicated between provider and inline script | Extract a `pct()` util; keep bootstrap duplication documented/synced (trade-off for no-flash) | S |
| J4 | Low | TS/Quality | root `package.json:31` (`typescript ~5.8.2`) vs `server/package.json:45` (`typescript ^6.0.3`); `@types/node` `^22` vs `^26` | Two TypeScript majors and two `@types/node` majors in one repo | Unify versions | S |
| K1 | **High** | Tests | repo-wide (no `*.test.*`, no runner in either `package.json`) | **Zero tests and no test framework/script** for a scoring engine, timer flows, sanitizer, storage and an auth API | Add Vitest (+ supertest for the API); start with §7's top-10 list | L |
| L1 | Low | Responsiveness | `src/components/Button/Button.css:12`; `src/components/Tag/Tag.css:12`; `src/styles/base.css:31` | `white-space: nowrap` on buttons/tags + `body { overflow-x: hidden }` can mask (clip) overflow instead of surfacing it at 380 px | Allow wrapping or verify no clipping at 360–380 px | S |
| M1 | Medium | Repo | `metadata.json` (`requestFramePermissions`, `majorCapabilities`) | AI-Studio template leftovers with no meaning for this app | Trim to `name`/`description` or delete | S |
| M2 | Low | Repo | root (no `.gitattributes`) | No line-ending policy; Prettier is `endOfLine: auto`, so CRLF/LF can mix across machines | Add `.gitattributes` (`* text=auto eol=lf`) | S |
| M3 | Medium | Backend-readiness | whole `src/` (no `services/`, no `fetch`, no auth state) | Frontend has **no API layer, no auth context and no protected routes** — required for the pending "frontend auth views" step against the existing JWT API | Add `src/services/api.ts` + `AuthContext` | M |
| M4 | Low | Docs | `README.md:146-151` | Roadmap is stale: phase 3 ("Schema & auth") is partially done — schema/migrations and the auth API are committed; roadmap shows it as pending | Update checkboxes/status | S |

---

## 4. Quick wins (< 30 minutes each, highest impact)

1. **Hero image hints** — `src/pages/Home/Hero/Hero.tsx:13`: add `width={1600} height={1024} decoding="async" fetchpriority="high"`.
2. **Sync `?category=` with filter state** — `useStudyFilters.ts` + `StudyPage.tsx` via `setSearchParams`.
3. **Pure progress toggles** — `useTopicProgress.ts`: compute `next`/`added` before `setState`; kills the toast-inversion class of bugs.
4. **Memoize sanitization** — `TopicDetail.tsx`: `useMemo(() => sanitizeRichText(item), [item])`.
5. **Fix "High frequency" no-op** — either re-tag topics (`topicBank/*.ts`) or remove the pill (`StudyToolbar.tsx:5-10`).
6. **Light-theme contrast tokens** — `tokens.css`: darker text-grade teal/warn/success for `:root` (keep bright values in dark).
7. **Stabilize `onClose`** — `StudyPage.tsx:95`: `useCallback` so the dialog effect stops re-firing (stops focus theft).
8. **Dead-code sweep** — delete `escapeHtml.ts`, `src/assets/devcode.png`; drop unused tokens; trim `metadata.json`.
9. **`.gitattributes`** — one line, ends CRLF/LF drift.
10. **Per-route `document.title`** — tiny effect; large UX/professionalism gain.

## 5. Prioritized fix plan (independently committable, in order, app builds after each)

1. `fix(study): sync category deep link with the URL` — `src/pages/Study/useStudyFilters.ts`, `src/pages/Study/StudyPage.tsx`
2. `fix(study): make topic progress toggles pure` — `src/pages/Study/useTopicProgress.ts`, `src/pages/Study/StudyPage.tsx`
3. `fix(study): stabilize topic dialog lifecycle and focus` — `src/pages/Study/TopicDetail/TopicDetail.tsx` (useCallback/props), options with a focus trap
4. `fix(theme): raise light-theme text contrast for teal and warning tones` — `src/styles/tokens.css` (verify with `contrast.mjs`)
5. `feat(nav): add mobile menu` — `src/components/Navbar/Navbar.tsx`, `Navbar.css` (+ close-on-route-change)
6. `fix(practice): deadline-based countdown and quiz exit guard` — `src/pages/Practice/usePracticeSession.ts`, `PracticePage.tsx`
7. `fix(practice): align submit confirmation with timer auto-submit` — `QuizScreen.tsx`, `useQuizShortcuts.ts`
8. `perf(home): hero image loading hints` — `src/pages/Home/Hero/Hero.tsx`
9. `chore: remove dead code, tokens and unused assets` — delete `src/utils/escapeHtml.ts`, `src/assets/devcode.png`; `tokens.css`, `metadata.json`, `useStudyFilters.ts:54`, `types/topic.ts`
10. `fix(home): make the daily challenge actionable` — `DailyChallengeSection.tsx`, `PracticePage.tsx`/`SetupScreen.tsx` (preselect), `src/data/dailyChallenge.ts`
11. `chore(ts): enable stricter compiler flags` — `tsconfig.json` (+ fallout fixes)
12. `test: set up vitest and cover the engine core` — `package.json`, new test files (items from §7)
13. `docs: refresh README roadmap` — `README.md`
14. `feat(api): add frontend API client and auth context` — new `src/services/api.ts`, `src/theme`-style `AuthProvider` (do **before** feature-phase UI work)

## 6. Before starting/continuing backend & feature work (blocking items)

The API (Express + Drizzle + SQLite + JWT) already exists; these items block the **next** steps:

1. **Frontend API/auth layer (M3)** — the pending "frontend auth views" step needs `src/services/api.ts` (+ `VITE_API_BASE_URL`, already in `.env.example`), an auth context storing the JWT, and protected-route handling. Nothing exists today.
2. **Mobile navigation (B1)** — auth views add Navbar links; fix the ≤860 px dead-end first so new pages aren't unreachable on phones.
3. **Data-to-DB plan (M-readiness)** — questions have stable `slug` support in the schema (`server/src/db/schema.ts:15-19`); decide the seeding/sync path from `src/data/questionBank/*` before building question/practice APIs.
4. **Route/URL hygiene (B2, B4)** — auth redirects and deep links will hit the same URL-desync and silent-redirect issues if not fixed first.
5. **README roadmap refresh (M4)** — the repo currently misrepresents phase 3 progress.
6. Recommended (not blocking): Vitest before touching engine internals (K1).

## 7. Top 10 behaviors that most need tests

1. `correctIndex` remap after option shuffle (value-based `indexOf`) incl. duplicate-option edge
2. Scoring + `computeResult` (missed/skipped semantics, focus areas only for missed/skipped)
3. Timer: cleanup on unmount, no background auto-submit surprises, reset on new quiz
4. Sampling: no repeats, exact track/difficulty filtering, `Mixed` behavior
5. Study filters: category/tag/search logic incl. the `company_fav` path
6. `sanitizeRichText`: allowed tags only, attributes stripped, disallowed tags flattened
7. `scrollToSection` offset math + reduced-motion branch
8. Storage helpers: unavailable localStorage, corrupt JSON fallbacks, history cap
9. Theme provider: persistence, system default, `<html data-theme>` + meta sync
10. Server auth routes: register/login/me happy paths + 400/401/409 (supertest)

---

## 8. Metrics appendix (raw)

**Environment:** Node v24.14.1, npm 11.13.0. Revision `9986d44`, 5 commits.

**Sizes:** `src` 98 files (96 `.ts`/`.tsx`/`.css`) / 6,496 lines; `server` 20 files (19 text ≈ 860 lines incl. configs and generated migration artifacts; ~350 lines of app TS; largest non-generated file `src/routes/auth.ts` 89); no source file exceeds 200 lines (largest frontend: `SetupScreen.tsx` 183, `python.ts` 182, `QuizScreen.css` 177, `topicBank/dsa.ts` 177, `tokens.css` 144).

**Build (`npm run build`):**
```
dist/index.html                  1.68 kB │ gzip:   0.82 kB
dist/assets/hero-bg-*.jpg      160.75 kB
dist/assets/index-*.css         37.57 kB │ gzip:   6.88 kB
dist/assets/index-*.js         420.18 kB │ gzip: 133.38 kB
✓ 130 modules transformed · built in 1.55s
```

**`npx tsc --noEmit`:** exit 0 (clean). **`npm run lint`:**
```
src/pages/Study/TopicCard/TopicCard.tsx:7:14 warning react-refresh/only-export-components
src/theme/ThemeProvider.tsx:61:17       warning react-refresh/only-export-components
✖ 2 problems (0 errors, 2 warnings)
```

**`npm audit` (root):** `found 0 vulnerabilities`. **`npm audit` (server):** 4 moderate, all dev-only via `drizzle-kit` → `@esbuild-kit/esm-loader` → esbuild `<=0.24.2` (GHSA-67mh-4wv8-2f99); fix is a breaking drizzle-kit downgrade — left as-is.

**`npx depcheck` (root):** `No depcheck issue`. **`npx madge --circular --extensions ts,tsx --ts-config tsconfig.json src`:** `Processed 97 files · ✔ No circular dependency found!`

**Question bank validation (temp script, `tsx`; source `src/data/questionBank/*`):**
```
questions total: 94
per category: {"dsa":11,"system_design":9,"oop":9,"sql":9,"web":9,"os":9,"python":11,"cpp":9,"java":9,"javascript":9}
per difficulty: {"Beginner":31,"Intermediate":31,"Advanced":32}
correctIndex distribution: {"0":94,"1":0,"2":0,"3":0}
duplicate ids: none | wrong option count: none | correctIndex out of range: none
missing required fields: none | duplicate question text: none
correct option >1.8x longer than others: 54 of 94 (e.g. java-a2 210 vs 74)
topic tags: high_freq=15/15, company_fav=9/15, core=10/15
```

**Contrast (temp `contrast.mjs`, WCAG ratios vs tokens):** dark theme — all text pairs 4.70–18.35:1 (pass); only `border-strong vs surface` 1.92 (non-text). Light theme below 4.5:1: `teal on surface 2.38`, `teal on teal-soft 2.14`, `success on success-soft 4.33`, `warn on warn-soft 4.17`, `cta text synthetic @.9 opacity 3.97` (actual CTA text is full-opacity `--on-navy` = 4.55 ✔), `navbar muted 3.97`, `heading on section-dark 1.00` (false pairing — the daily band overrides with `--on-navy`, `DailyChallengeSection.css:8-10`), `border-strong 1.62` (non-text).

**Assets:** `hero-bg.jpg` 160,749 B (1600×1024), `devcode.png` 83,494 B (677×369, unused), `favicon.svg` 258 B.

**Tooling versions (root):** react 19.0.1, react-dom 19.0.1, react-router-dom 7.18.4; vite 6.4.4 (resolved), typescript ~5.8.2, eslint 10.13.0, prettier 3.9.10. Server: express 5.3.0, drizzle-orm 0.45.4, better-sqlite3 13.0.3, zod 4.6.7, typescript ^6.0.3.

---

## 9. Could not verify (and why)

- **Runtime behavior in a browser** (responsive screenshots at 380/768/1440 px, actual scroll landing positions, real touch targets, clipboard, modal focus order): no browser/device tooling in this environment — findings for those are code/CSS analysis only.
- **Screen-reader output** for quiz timer/results — no AT available.
- **Font loading/CLS in the real network path** — external Google Fonts; only the declaration (preconnect + `display=swap`) was verified.
- **`npx depcheck` for `server/`** — run for the root package only.
- **`vite.config.ts` / `eslint.config.js` type-safety** — both are outside `tsconfig.json`'s `include`, so "not type-checked" is a finding, not a verified error state.
- **Exact `muted on section-dark` pairing inside the daily card** — resolved by reading (text sits on the card's `--surface`), but not separately ratio-computed.

*No fixes were applied. Temp helper scripts (`bank-validate.mts`, `contrast.mjs`) live in the OS temp dir, outside the repo. Waiting for your review before touching anything.*

---

## 10. Remediation log (post-audit)

All **High** and **Medium** findings below were fixed in 29 commits on top of `9986d44`, one finding group per commit (E6 spread over 10 category batches), each passing `npm run build`, `npm run lint` and `npm test`. **Low** findings were intentionally left untouched per the agreed scope.

| Finding | Status | Commit | What changed |
|---|---|---|---|
| K1 | ✅ Fixed | `b269348` | Vitest for frontend (jsdom, 26 files) and server (+supertest, 2 files); engine-core tests per §7 |
| A1 | ✅ Fixed | `4734f9f` | Progress toggles compute `next` before `setState`; updaters pure |
| B2 | ✅ Fixed | `5a30dfb` | `?category=` synced with `setSearchParams` on change/reset |
| D1 | ✅ Fixed | `1fa3d77` | `high_freq` re-tagged to a genuine subset |
| D2+D3 | ✅ Fixed | `5f687c1` | Stable close callback via ref; focus trap, inert background, focus restore |
| B1 | ✅ Fixed | `bb2aad6` | Accessible hamburger menu ≤860 px; closes on route change, focus management |
| B3+B4 | ✅ Fixed | `8fb64b0` | Scroll restored on POP navigations; NotFoundPage for unknown routes |
| E1 | ✅ Fixed | `9630b9e` | Deadline-based countdown derived from wall clock |
| E2 | ✅ Fixed | `9220171` | Draft persisted to storage; resume/discard prompt after interrupted quiz |
| E3+E4 | ✅ Fixed | `2742bad` | Timer auto-submit and confirm path aligned; shortcuts guard modifiers/dialog/`preventDefault` |
| G2 | ✅ Fixed | `eb265d6` | Polite live region announces low time; non-color cue |
| G1 | ✅ Fixed | `46430fc` | Light-theme ink teal/warn/success text tokens; reported 3.97:1 navbar ratio did not reproduce (measured 5.90; real worst case ≈4.08 over the dark daily band) — that case was fixed |
| F1 | ✅ Fixed | `7b44a03` | Daily challenge CTA preselects a track and starts a prefilled warm-up (`dsa-b5/b6/b7` added; bank 94→97) |
| H1 | ✅ Fixed | `b26e3e6` | `React.lazy` routes + static `bankCounts.ts`; entry chunk 420.18→284.67 kB (gzip 133.38→90.64) |
| J1 | ✅ Fixed | `de38b4e` | `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `exactOptionalPropertyTypes`; `allowJs` removed |
| M1 | ✅ Fixed | `c04874c` | `metadata.json` trimmed to `name`/`description` |
| M3 | ✅ Fixed | `aecbbfd` | Typed API client, `AuthProvider`/`useAuth`, `ProtectedRoute`, dev `/api` proxy |
| E6 | ✅ Fixed | `6efe5ea`, `869b40f`, `5d53714`, `529c604`, `8846b25`, `f313805`, `0b3a413`, `f362712`, `8030c9f`, `8b08f09` | Answer-length skew 52/97 → **0/97**, duplicate options 0; rewrote correct/distractor options per category; permanent guard `src/data/questionBank/bankQuality.test.ts` (4 options, valid index, no duplicates, skew ≤1.8×) |

**Final verification:** root build clean (entry `284.67 kB` / gzip `90.64`), lint 0 errors (2 pre-existing react-refresh warnings), `npm test` 27 files / **158 passed** + 1 expected fail; server `npm test` 2 files / **16 passed**.

**Commit anomaly:** `f313805` contains the **OS** batch content but its message reads `fix(bank): balance OOP answer lengths (E6 /10)` — an external process committed and pushed it concurrently with the batch-6 commit; content was verified correct and the message left as-is per user decision (no history rewrite).

`f313805` is the OS batch (E6 6/10), mislabeled as OOP.
