# Tech Spec: Shortlink — URL Pendek Sederhana

## Bagian 1: Tech Stack & Arsitektur

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Vanilla HTML + CSS + JS | ES2024 |
| Styling | CSS Custom Properties + Tailwind CDN | 3.x |
| Backend | Express.js | 5.x |
| Runtime | Node.js | 22 LTS |
| Database | SQLite (via better-sqlite3) | 12.x |
| Cache | In-memory LRU (lru-cache) | 11.x |
| Template | EJS (server-side rendering) | 3.x |
| Auth | bcryptjs + jsonwebtoken | 2.x / 9.x |
| Hosting | Railway / Fly.io | - |
| Process Mgr | Node.js built-in (cluster) atau PM2 | 5.x |

### Arsitektur Sistem

```
Browser → Express.js (EJS + Static)
              ↓
         Router Layer
              ↓
        Controller Layer
              ↓
         Service Layer
              ↓
    better-sqlite3 (SQLite)
              ↓
         .db file
```

### Struktur Folder

```
shortlink/
├── src/
│   ├── config/
│   │   ├── db.js            # Koneksi SQLite + pragma
│   │   └── cache.js         # LRU cache redirect
│   ├── controllers/
│   │   ├── shorten.js        # Handler shorten + preview
│   │   └── redirect.js       # Handler redirect
│   ├── services/
│   │   └── link.js           # Logika bisnis link + cache
│   ├── middleware/
│   │   ├── rateLimit.js      # Rate limiter per IP
│   │   └── errorHandler.js   # Global error + 404
│   ├── routes/
│   │   ├── index.js          # Route halaman + redirect
│   │   └── api.js            # Route API
│   ├── utils/
│   │   ├── hash.js           # Short code generator
│   │   └── validator.js      # URL validator
│   ├── views/
│   │   ├── index.ejs         # Halaman utama
│   │   └── 404.ejs           # Not found page
│   └── app.js                # Entry point Express
├── public/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js            # Client-side logic
├── data/
│   └── shortlink.db          # SQLite file (gitignored)
├── package.json
├── Dockerfile
├── .env.example
└── .gitignore
```

### Justifikasi

- **Express.js 5:** Mature, ringan, ekosistem luas. Cocok untuk monolith kecil dengan server-side rendering.
- **Vanilla HTML + CSS + JS:** Zero build step, muat cepat, sesuai PRD "tanpa bloat". Tailwind CDN untuk styling responsive tanpa bundler.
- **SQLite + better-sqlite3:** Zero konfigurasi database, file-based, backup simpel (copy file). better-sqlite3 synchronous API = performa lebih baik untuk workload I/O kecil.
- **EJS:** Server-side rendering simpel, cocok dengan Express, tanpa SPA complexity.
- **In-memory LRU cache:** Cache redirect lookup tanpa Redis — cukup untuk V1. LRU cache otomatis evict entry lama.
- **Railway/Fly.io:** Platform modern dengan git-based deploy, volume support untuk SQLite, free tier generous.

---

## Bagian 2: Database Design

### Ringkasan Database

| Item | Detail |
|------|--------|
| Database | SQLite (file-based) |
| Driver | better-sqlite3 |
| Pendekatan | Relational |
| Tools Migrasi | Manual (SQL file migration) |
| WAL Mode | Yes (performance) |

### Entity Overview

#### `links` — Tabel utama menyimpan mapping short code → URL

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | INTEGER | PK AUTOINCREMENT | Internal ID |
| short_code | TEXT | UNIQUE NOT NULL INDEXED | 7 karakter unik |
| original_url | TEXT | NOT NULL | URL asli (max 2048) |
| user_id | INTEGER | NULLABLE FK → users.id | Null untuk guest |
| clicks | INTEGER | DEFAULT 0 | Hit counter |
| is_favorite | INTEGER | DEFAULT 0 | Bookmark flag |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | ISO 8601 |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | ISO 8601 |

#### `users` — Tabel akun (opsional V1)

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | INTEGER | PK AUTOINCREMENT | Internal ID |
| email | TEXT | UNIQUE NOT NULL | Login credential |
| password_hash | TEXT | NOT NULL | bcrypt hash |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | ISO 8601 |

### Index Strategy

- `links.short_code` — UNIQUE INDEX (lookup redirect, O(1))
- `links.user_id` — INDEX (dashboard query per user)
- `users.email` — UNIQUE INDEX (login lookup)

### Data Flow

```
Shorten:  User input URL → Validasi → Generate short code → INSERT link → Return short URL
Redirect: Request /:code → Lookup short_code → UPDATE clicks → 301 redirect → original_url
Dashboard: Login user → SELECT links WHERE user_id = :id → Render table
```

---

## Bagian 3: Interface Design

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | / | Halaman utama (shorten form + history) | No |
| POST | /api/shorten | Generate short URL (rate-limited) | No |
| GET | /api/preview | Preview title + domain dari URL | No |
| GET | /:code | Redirect ke URL asli | No |

### Halaman Utama (GET /)
- Input form URL + "Shorten" button — stack vertikal di mobile
- Preview card (title + domain) via fetch → server-side meta scraper (debounce 1 detik)
- History list dari localStorage (client-side)
- Always dark theme (tidak ada toggle)

### Halaman Redirect (GET /:code)
- Minimal HTML (tanpa JS) + meta refresh fallback
- 301 redirect via Location header
- 404 page jika code tidak ditemukan

### Dashboard (GET /dashboard)
- Tabel: short link, original URL, clicks, created, actions
- Actions: hapus, toggle favorite
- Pagination 20/item

---

## Bagian 4: Alur Logika & Business Rules

### Alur Shorten URL (FR-01)

1. User tempel URL ke input form pada halaman utama
2. Client-side: validasi format URL dasar, tampilkan preview card (fetch title + domain via server)
3. User klik "Shorten"
4. POST /shorten → middleware rate limit check
5. Controller: validasi URL (max 2048 chars, protocol required)
6. Service: `generateShortCode()` — loop sampai dapat 7-char unik (base62 dari crypto.randomBytes)
7. Service: INSERT link dengan short_code + original_url
8. Response: return `{ shortUrl: "s.l/abc123", originalUrl: "..." }`
9. Client-side: copy to clipboard otomatis, tampilkan notifikasi "Copied!", simpan ke localStorage history

### Alur Redirect (FR-04)

1. Browser request GET /{short_code}
2. Middleware: skip rate limit (redirect harus cepat)
3. Controller: lookup short_code di cache → hit if miss → DB query
4. Jika ditemukan: increment clicks async, return 301 + Location header
5. Jika tidak: render 404.ejs
6. Cache: simpan mapping (short_code → original_url) dengan TTL 1 jam

### Alur History Local (FR-06, FR-07)

1. Setiap kali shorten sukses: simpan `{ shortUrl, originalUrl, createdAt }` ke localStorage
2. History ditampilkan di halaman utama dari localStorage
3. Hapus: klik tombol hapus → remove item dari array localStorage
4. Max 50 item, auto-purge item tertua saat push baru

### Alur Auth (FR-08, FR-09, FR-10) — Opsional V1

1. Register: POST /register → validasi email format + password min 6 → bcrypt hash → INSERT user → return JWT
2. Login: POST /login → lookup email → bcrypt compare → generate JWT (24h) → set httpOnly cookie
3. Dashboard: GET /dashboard → middleware verify JWT → load links WHERE user_id → render
4. Rate limit login: max 5 gagal per IP per 15 menit

### Business Rules

- Short code: 7 karakter, base62 (a-z, A-Z, 0-9), acak via crypto.randomBytes — tidak sequential
- URL max 2048 karakter, harus valid URL (protocol http/https required)
- Rate limit shorten: 100 req/min per IP → 429 Too Many Requests
- Cache redirect: TTL 1 jam, eviction LRU
- History local: max 50 item, auto-purge oldest
- Guest: tanpa login, link tidak bisa di-dashboard
- Link permanen: tidak ada expiration di V1

---

## Bagian 5: Keamanan, Performa, & Deployment

### Keamanan

- **URL Validasi:** Validasi protocol (http/https), sanitasi input cegah XSS/SSRF. Gunakan `new URL()` + blocklist localhost/private IP
- **Rate Limit:** Middleware `express-rate-limit` — 100 req/min untuk shorten, 5 gagal/15min untuk login
- **Short Code:** `crypto.randomBytes(5).toString('base64url')` — 7 char, unpredictable
- **Password:** bcryptjs dengan salt round 10
- **JWT:** httpOnly cookie, secure flag di production, sameSite lax, expiry 24 jam
- **HTTPS:** Wajib — handle oleh Railway/Fly.io (TLS termination)
- **SQL Injection:** Tercegah via better-sqlite3 prepared statements (parameterized queries)

### Performa

- **Cache Layer:** In-memory LRU cache (lru-cache) untuk redirect lookup — max 10.000 entries, TTL 1 jam
- **WAL Mode:** SQLite `PRAGMA journal_mode=WAL` — concurrent read lebih cepat
- **Redirect:** Langsung dari cache tanpa DB hit jika ada — target < 50ms
- **Prepared Statements:** better-sqlite3 prepared statements di-cache, compile sekali
- **Shorten:** Validasi + generate + insert — target < 500ms
- **Static Files:** express.static dengan cache-control max-age=1jam
- **Cluster:** Node.js cluster mode untuk multi-core (PM2 atau built-in)

### Deployment (Railway)

1. Push repo ke GitHub
2. Railway: New Project → Deploy from GitHub repo
3. Tambah Volume: `data` mount ke `/app/data` — persist SQLite file
4. Set env: `NODE_ENV=production`, `PORT=8080`, `JWT_SECRET=...`
5. Build: `npm install`
6. Start: `node src/app.js`
7. Railway auto-detect Node.js via Railpack, expose PORT

### Deployment (Fly.io)

1. `fly launch` — generate Dockerfile + fly.toml
2. `fly volumes create shortlink_data --size 1` — persistent volume
3. Mount volume di `fly.toml`: `[[mounts]] source = "shortlink_data", destination = "/app/data"`
4. `fly deploy`
5. `fly certs add s.l` — custom domain

### Dockerfile

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p data
EXPOSE 8080
CMD ["node", "src/app.js"]
```

### Development Setup

```bash
# Clone & install
git clone <repo>
cd shortlink
npm install

# Setup env
cp .env.example .env
# Isi JWT_SECRET

# Run (dev)
node --watch src/app.js

# Buka http://localhost:3000
```

### .env.example

```
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
DATABASE_PATH=./data/shortlink.db
CACHE_MAX=10000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

---

**🎉 Tech Spec selesai!** Lanjut ke **Task Generator** — ketik "Buat Task berdasarkan Tech Spec".
