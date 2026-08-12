# IRONLOG

A workout-tracking app: log sets, track progress over time, and compete with friends in lift contests.

**Stack:** React 19 + Vite + Tailwind (client) · Express + MongoDB/Mongoose (server) · JWT + Google OAuth (auth) · installable PWA with offline app-shell caching.

## Project structure

```
client/   React SPA (Vite)
server/   Express API + MongoDB
```

See [client/src](client/src) and [server/src](server/src) for the code layout — both follow a conventional `routes → controllers → models` / `pages → components → hooks/api` split.

## Getting started

### Prerequisites
- Node.js 20+
- A MongoDB instance (local or [Atlas](https://www.mongodb.com/atlas))
- A Google OAuth client ID, if you want Google sign-in (optional otherwise)

### Server

```bash
cd server
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, etc.
npm install
npm run dev             # http://localhost:5000
```

### Client

```bash
cd client
cp .env.example .env    # fill in VITE_API_URL, VITE_GOOGLE_CLIENT_ID
npm install
npm run dev              # http://localhost:5173
```

See [server/.env.example](server/.env.example) and [client/.env.example](client/.env.example) for what each variable does. Password-reset emails fall back to logging the reset link to the server console when SMTP isn't configured, so that flow works locally without any email provider.

## Scripts

| Location | Command | What it does |
|---|---|---|
| `client` | `npm run dev` | Start the Vite dev server |
| `client` | `npm run build` | Production build (also generates the PWA service worker) |
| `client` | `npm run lint` | ESLint |
| `client` | `npm run test` | Run the Vitest unit tests |
| `server` | `npm run dev` | Start the API with nodemon |
| `server` | `npm start` | Start the API (no reload) |
| `server` | `npm test` | Run the Node test-runner unit tests |

CI (`.github/workflows/ci.yml`) runs lint + tests + build for the client and a syntax check + tests for the server on every push/PR to `main`.

## Core features

- Email/password and Google OAuth login, with password reset via emailed token
- Log workouts set-by-set against a rolling 24-hour "today" window; edit or delete a set/exercise/note after saving
- Progress view: weekly volume chart and all-time personal records, filterable by body part
- Contests: create or join via invite code, auto-updates a live leaderboard as members log matching lifts
- Installable PWA with offline app-shell caching (service worker via `vite-plugin-pwa`)
- Account settings: edit profile, change/set password, delete account

## Notes on data model

- A user has **one workout document per rolling 24h window**, not per calendar day — see [server/src/utils/dateWindow.js](server/src/utils/dateWindow.js). This avoids timezone edge cases where "today" would otherwise flip mid-session.
- Contest scoring is centralized in [server/src/utils/contestScoring.js](server/src/utils/contestScoring.js) — both `logWorkout` and `addSetToToday` funnel through it so a new best lift updates every active contest for that exercise exactly once.
