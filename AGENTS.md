# Shortlink Project Guide

## Stack
- Express 5 + ESM (`import`/`export`)
- SQLite (better-sqlite3, synchronous API)
- EJS templates (server-side render)
- Tailwind CDN (no build step)
- JetBrains Mono (Google Fonts)

## Architecture
routes/ -> controllers/ -> services/ -> config/db.js
utils/ for helpers (hash, validator)
middleware/ for rate-limit, error handler
views/ for EJS, public/ for CSS/JS static files

## Conventions
- ESM modules only (`type: "module"`)
- Functions: named export, no default
- Variables: camelCase
- Errors: `res.status(X).json({ error: "..." })`
- DB: prepared statements via better-sqlite3
- URL: validate + SSRF block via validator.js
- Short code: 7-char base64url via `crypto.randomBytes()`

## Theme — Full Dark Black (from shortlink.pen design)
- Background: `bg-black` (#000)
- Card: `bg-[#111]` (#111) — no border
- Card radius: `rounded-xl` (12px)
- Border/line: `border-[#1f1f1f]` (#1f1f1f)
- Input: `bg-[#1a1a1a]` (#1a1a1a) + `border-[#2a2a2a]` (#2a2a2a)
- Preview bg: `bg-[#1a1a1a]`
- Text primary: `text-white` / `text-gray-100`
- Text secondary: `text-gray-400` (#9ca3af)
- Text muted: `text-gray-500` (#6b7280)
- Accent: `bg-blue-600` (#2563eb)
- Success: `bg-green-900` (#14532d) / `text-green-300` (#86efac)
- Error: `text-red-400`
- Short link text: `text-blue-400` (#60a5fa)
- No dark mode toggle -- always dark

## API Endpoints
- `POST /api/shorten` -- shorten URL (rate-limited 100 req/min)
- `GET /api/preview?url=` -- fetch page title + domain (3s timeout)
- `GET /:code` -- 301 redirect to original URL

## Database
### `links` table
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER | PK AUTOINCREMENT |
| short_code | TEXT | UNIQUE, INDEXED, 7 char |
| original_url | TEXT | max 2048 |
| clicks | INTEGER | default 0 |
| is_favorite | INTEGER | default 0 |
| created_at | TEXT | ISO 8601 |
| updated_at | TEXT | ISO 8601 |

### Config
- WAL mode enabled
- Auto-create table on startup (`CREATE TABLE IF NOT EXISTS`)
- Prepared statements only (no raw string interpolation)

## Cache
- LRU cache (`lru-cache`) for redirect lookups
- Max 10,000 entries
- TTL: 1 hour
- Cache-aside pattern: read cache first, miss -> DB -> set cache

## Rate Limit
- `express-rate-limit` on `POST /api/shorten` only
- Default: 100 requests per 60s window
- Configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`

## Data Flow
### Shorten
Client form -> POST /api/shorten -> validateUrl() -> createLink() -> generate short code -> INSERT -> cache.set -> response JSON

### Redirect
Browser GET /:code -> getLink() -> cache.get (miss -> DB) -> 301 redirect -> incrementClicks()

## Frontend
- `public/js/app.js` handles all client logic: form submit, copy to clipboard, localStorage history, preview fetch
- `index.ejs` -- main page with form, result, preview card, history list
- `404.ejs` -- not found page (no JS)
- History: localStorage, max 50 items, auto-purge oldest

## Docker
- `node:22-alpine` base image
- WORKDIR /app
- Production-only npm install
- `data/` directory for SQLite persistence (volume mount)
- Exposes port 8080

## Commands
- `npm run dev` -- node --watch src/app.js
- `npm start` -- node src/app.js
