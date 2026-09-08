# APAX - Technical Assessment

A precious-metals tokenization platform assessment: real JWT auth, a live holdings/activity dashboard, a workspace split separating the Express backend from the Next.js frontend, and a written blockchain design for APX-Gold.

**Branch:** `apax/krupal` · **GitHub:** `krupal` *(confirm before submitting - inferred from the point of contact, not verified)* · **Availability:** full-time, standard business hours.

---

## ⚠️ Security note - read this first

Before any other work, this branch removes a remote-code-execution vector that was present in the cloned template. Full details, including exactly what was removed and why it isn't reproduced here, are below in [Security: what was removed](#security-what-was-removed). Nothing in this branch fetches or executes remote code.

---

## What changed, task by task

| Task | What changed | Where |
|---|---|---|
| **1A** - real login | `base.api.ts` fixed (base URL, no baked-in prefix, `credentials: 'include'`), 3 real states (idle/submitting/error), client validation, fixed the `/dashbaord` typo, route protection via `proxy.ts`, real logout | [`web/lib/services/base.api.ts`](web/lib/services/base.api.ts), [`web/app/login/page.tsx`](web/app/login/page.tsx), [`web/proxy.ts`](web/proxy.ts) |
| **1B** - one view wired live | Holdings + recent activity now hit the real API with loading/empty/error/success states, race-safe fetches, zod-validated responses | [`web/lib/store.ts`](web/lib/store.ts), [`web/components/portfolio-overview.tsx`](web/components/portfolio-overview.tsx), [`web/components/views/por-view.tsx`](web/components/views/por-view.tsx), [docs/01-frontend-dashboard-migration.md](docs/01-frontend-dashboard-migration.md) |
| **2A** - JWT auth that works | `getJWTToken()` implemented, `pre("save")` bug fixed, login timing/enumeration-safe, httpOnly cookie only (never echoed into the JSON body), `req.user` typed via declaration merging | [`server/src/models/userModel.ts`](server/src/models/userModel.ts), [`server/src/middlewares/auth.ts`](server/src/middlewares/auth.ts), [`server/src/utils/sendToken.ts`](server/src/utils/sendToken.ts) |
| **2B** - holdings API | `Holding` model (compound unique index), `GET /api/holdings`, `GET /api/activity`, both auth-required | [`server/src/models/holdingModel.ts`](server/src/models/holdingModel.ts), [`server/src/routes/api/`](server/src/routes/api/) |
| **3** - blockchain (written) | APX-Gold token design, integration/indexer design, redemption ordering | [docs/03-token-design.md](docs/03-token-design.md), [docs/04-integration.md](docs/04-integration.md) |
| **Optional** | Week-one priorities | [docs/05-week-one.md](docs/05-week-one.md) |

Plus a structural prerequisite the brief made a firm requirement: the Express backend moved out of `web/src` into its own `server/` workspace (below).

## The headline bug: cookie / CORS / credentials mismatch

This was broken worse than the brief's own description suggested, and is the thing to understand before anything else here makes sense.

- `sendToken` set an httpOnly cookie **and** returned the JWT in the JSON body.
- The auth middleware read **only** `req.cookies.token`.
- The frontend's `fetch` call never sent `credentials: 'include'`.
- The backend's `cors()` had no `origin`/`credentials` config at all.

Result: across `localhost:3000 → localhost:4000`, the cookie was set by the browser but never sent back on the next request (no `credentials: 'include'`), and even if it had been, the bare `cors()` would have rejected a credentialed cross-origin request outright. **Nothing authenticated could work, at all, before this fix.**

**The fix:** httpOnly cookie only, chosen over `Authorization: Bearer` for the XSS-vs-CSRF tradeoff below. `web/lib/services/base.api.ts` now sends `credentials: 'include'` on every request; `server/src/app.ts` locks CORS to an explicit allowlist (`server/src/config/cors.ts`) with `credentials: true` - only those origins can make a credentialed request at all. The JWT is no longer duplicated into the JSON response body either - see [`sendToken.ts`](server/src/utils/sendToken.ts) - since doing so would let any JS on the page (i.e. an XSS payload) read it straight out of the response, defeating the entire reason for choosing httpOnly in the first place.

**Why httpOnly cookie over `Authorization: Bearer`:** a bearer token has to live somewhere JS can read it to attach it to requests - localStorage (readable by any injected script) or in-memory (safe from XSS, but a hard refresh silently logs the user out unless a refresh-token flow is added, which is more moving parts than this assessment needs). An httpOnly cookie can't be read by JS at all, closing the XSS-theft vector outright; the tradeoff is CSRF exposure, mitigated here with `SameSite=Lax` plus the fact that the API only accepts JSON bodies (no form-based CSRF submission works against it). `localhost:3000` and `localhost:4000` are different *origins* but the same *site* (registrable domain `localhost`), so this works in local dev without needing `SameSite=None`; the same holds in production as long as the frontend and API share a registrable domain (e.g. `app.apax.com` / `api.apax.com`).

## Architecture

```mermaid
flowchart LR
    Browser["Browser"]
    Next["Next.js — web/\n:3000"]
    Express["Express — server/\n:4000"]
    Mongo[("MongoDB")]

    Browser -- "HTTP + httpOnly cookie" --> Next
    Next -- "proxy.ts: redirect on\ncookie presence" --> Browser
    Browser -- "fetch, credentials: include" --> Express
    Express -- "verify JWT (auth.ts)" --> Express
    Express -- "Mongoose" --> Mongo

    style Express stroke:#D4AF37,stroke-width:2px
```

The auth path is the two labeled edges: the cookie travels with every `fetch` from the browser straight to Express (not proxied through Next), and Express is the only place the JWT is ever verified - `proxy.ts` only checks the cookie's *presence*, to avoid a hydration flash on route changes; it is not a security boundary. See [docs/04-integration.md](docs/04-integration.md) for where a smart contract would sit in this diagram once that's wired up - it doesn't exist in the running system yet.

## Why the folder split

`web/` originally held Express (`web/src/`) inside a Next.js package - one `package.json`, mixed dependencies, no way to deploy or scale the two independently. Per the assessment's firm requirement, they're now separate npm workspaces:

```
web/       Next.js frontend only - zero Express code
server/    Express backend only - zero React code
shared/    types/api.ts (the contract, defined once) + existing abi/
```

**This is relocation, not new dependencies** - `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `cors`, `cookie-parser`, `cloudinary`, `@sendgrid/mail`, `ethers`, `validator`, `dotenv`, `tsx` all moved from `web/package.json` to `server/package.json` unchanged. Also dropped, confirmed unused by grepping the whole frontend first: `axios`, `request`, `inherits`, `use-sync-external-store`, `immer`, `ts-node`. The only *new* dependencies added anywhere are `helmet` and `express-rate-limit` (server) - both approved before adding, per the brief's own ask-first rule - and nothing new in `web/` (`zod` was already there, unused, and is now actually used for response validation).

Root `package.json` uses **npm workspaces** (built into npm, not a new dependency) so `npm install`/`npm run dev` work from one place.

## Setup

```bash
git clone <repo-url> apax
cd apax
git checkout apax/krupal
npm install

cp server/.env.example server/.env
# edit server/.env: set MONGO_URI to a running MongoDB (local `mongodb://localhost:27017/apax`
# works if you have MongoDB running locally or via `docker run -p 27017:27017 mongo`),
# and JWT_SECRET to any long random string - there is no default, the server
# refuses to boot without one.

npm run seed -w server   # creates the demo user + holdings + activity below

npm run dev              # runs both web (:3000) and server (:4000)
```

Open http://localhost:3000/login.

**Demo credentials** (from `npm run seed -w server`):

| Email | Password |
|---|---|
| `demo@apax.institutional` | `ApaxDemo123!` |

### Environment variables

**`server/.env`** (see [`server/.env.example`](server/.env.example)):

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | Yes | No fallback - server exits at boot if unset |
| `JWT_SECRET` | Yes | No fallback - server exits at boot if unset |
| `PORT` | No | Default `4000` |
| `NODE_ENV` | No | Default `development` |
| `JWT_EXPIRE` | No | Default `7d` |
| `COOKIE_EXPIRE` | No | Cookie lifetime in days, default `7` |
| `CLOUDINARY_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | No | Only needed for the legacy avatar-upload path (register/update-profile) |
| `SENDGRID_API_KEY` / `SENDGRID_MAIL` / `SENDGRID_RESET_TEMPLATEID` | No | Only needed for the legacy forgot-password email |

**CORS allowed origins** are not an env var - they're an explicit allowlist in [`server/src/config/cors.ts`](server/src/config/cors.ts) (`http://localhost:3000` and `:3002` by default, for running the frontend on either port). Add an origin there directly if you run the frontend somewhere else.

**`web/.env.example`** → `web/.env.local` if you need to override:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | Defaults to `http://localhost:4000` |

## Scripts

All run from the repo root via npm workspaces:

| Command | What it does |
|---|---|
| `npm run dev` | Both apps, concurrently |
| `npm run build` | Both apps (server first, so a broken server build fails fast) |
| `npm run start` | Both apps' production start scripts |
| `npm run lint` | Both apps |
| `npm run typecheck` | Both apps, `strict: true` |
| `npm run test` | Server test suite ([see below](#tests)) |
| `npm run seed` | Demo user + data |

## API reference

Every response follows `{ success, message, data }` (failures: `{ success: false, message, stack? }`, stack only outside production). Full request/response examples for every endpoint: [`server/requests.http`](server/requests.http).

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/health` | No | Uptime + Mongo connection state |
| `POST` | `/user/login` | No | Rate-limited: 10/15min |
| `GET` | `/user/logout` | No | Clears the cookie |
| `GET` | `/user/me` | Yes | Current user |
| `GET` | `/api/holdings` | Yes | Gold/silver/platinum grams |
| `GET` | `/api/activity` | Yes | Recent vault events |
| `GET` | `/balance`, `/activity/*` | No | **Legacy demo stubs** - in-memory deposit/withdrawal arrays, unrelated to the portfolio, kept under their original paths |

**On the `/user` vs `/api` prefix inconsistency:** the brief names both `POST /user/login` and `GET /api/holdings` literally, so both are honored rather than picking one and breaking the brief's own example. New endpoints (`/api/holdings`, `/api/activity`) use the `/api` prefix; existing ones (`/user/*`) were left where they were rather than renamed, since renaming them wasn't asked for and would have been unrelated churn.

## Tests

```bash
npm run test -w server
```

Node's built-in test runner (`node --test`) + native `fetch` against a real ephemeral server instance and a real MongoDB connection - no new test dependency. Covers the graded paths: login success / wrong password / unknown email (identical message and comparable timing for the latter two), and `GET /api/holdings` with no token, a tampered token, an expired token, and a valid one. See [`server/src/app.test.ts`](server/src/app.test.ts).

## Screenshots

| Login - idle | Login - error |
|---|---|
| ![Login idle](docs/screenshots/login-idle.png) | ![Login error](docs/screenshots/login-error.png) |

| Dashboard - real holdings | Proof of Reserve - real activity feed |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Activity feed](docs/screenshots/proof-of-reserve-activity.png) |

All four captured from a real headless-browser run (Playwright) against the actual dev servers and MongoDB - not staged mockups. The dashboard and activity screenshots show real seeded data (156.75g gold, 892.40g silver, 45.20g platinum; real `Vault Verification`/`Token Mint`/`Gold Deposit` activity rows), not the random values the original mock generated. The empty state ("Your vault is empty" / "No activity yet") was separately verified against a real zero-holdings account, not just read out of the code.

## Known limitations / with more time

- **`Holding.amount` is a float.** Fine for this demo's scale; a real deployment should use a fixed-point/decimal type - repeated partial-gram transfers on floats drift silently, and this is literally money. Called out again in [docs/03-token-design.md](docs/03-token-design.md) since the same risk applies on-chain.
- **`vaultData` and `zakatCalculation` are still mocked** - only holdings + activity were wired per Task 1B's "one view" scope. Incremental path for the rest: [docs/01-frontend-dashboard-migration.md](docs/01-frontend-dashboard-migration.md).
- **The live price ticker is a `setInterval` random walk**, clearly labeled as a dev-only placeholder in `dashboard/page.tsx` - not a real price feed.
- **No blockchain code was deployed or changed** - Phase 5 is a design document against the real, existing `APAXToken.sol`, not new Solidity.
- **The vault-deposit attestation, event indexer, and reconciliation job described in the design docs don't exist yet** - they're the next real engineering effort, not implemented here.
- **`web/proxy.ts`'s route protection is a cookie-presence check, not a signature check** - deliberate (avoids importing JWT verification into the edge runtime), and safe because Express still verifies every request; documented in the file itself.
- **Lighthouse a11y wasn't run as an automated score** - manual checks (keyboard focus via shadcn's built-in `focus-visible` styles, `aria-live` on the login error region, `aria-describedby` on invalid fields, 360px layout, `prefers-reduced-motion`) were verified in a real browser instead - see the `style(web)` commit in the git history for exactly what was checked.

## Security: what was removed

The cloned template contained a self-invoking function in `web/src/controllers/userController.ts` (now `server/src/controllers/userController.ts`) that:

1. Base64-decoded a URL and a header name/value from environment variables.
2. Fetched a text payload from that URL over `axios`.
3. Executed the fetched text via `new Function("require", r)`, with an empty `catch` swallowing any error silently.

The environment variables it depended on lived in a committed file, `web/src/config/.config.env`, which escaped `.gitignore` because the pattern was `.env*` - a filename starting with `.config` doesn't match that glob.

**Both were removed before any dependency was installed or any server started.** The payload URL was never visited and its contents were never reconstructed - per the assessment's own instruction, the fix was to delete it, not investigate it. `.gitignore` was tightened (`*.env`, `.config.env`, `**/config/*.env`, with a `!**/.env.example` carve-out so example files stay committable) so this class of file can't be committed again by accident.

A repo-wide grep for `new Function`, `eval(`, `child_process`, `execSync`, `atob(`, and `Buffer.from(process.env` (including `smart-contracts/` and `shared/`) turned up nothing else. Every `package.json` was checked for `preinstall`/`postinstall`/`prepare` scripts - none found.

## Final gate

- [x] Phase −1 removals confirmed; repo grep for `new Function` / `eval(` / install hooks is clean
- [x] `web/` contains no Express code; `server/` contains no React
- [x] Clean clone → install → `.env` from examples → seed → both apps run
- [x] `typecheck` passes on both, `strict: true`, no unexplained `any`
- [x] `lint` passes on both
- [x] `build` passes on both
- [x] Tests pass (7/7)
- [x] Login works end to end; wrong password shows a clear error; loading state visible
- [x] `GET /api/holdings` returns 401 with no token, 401 with a tampered token, 200 with a valid one
- [x] Dashboard renders real data; loading, empty and error states are all reachable and correct
- [x] No secret anywhere in the tree; no `.env` committed
- [ ] Lighthouse a11y ≥ 95 on login and dashboard - not run as an automated score; manual a11y checks done instead (see Known limitations)
- [x] All six brief tasks have a named deliverable in this README
