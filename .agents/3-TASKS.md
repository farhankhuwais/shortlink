# Task List: Shortlink

## Scope: Fitur Inti (Shorten + Redirect + History Local)

---

### Modul 0: Setup Project

#### T-01: Init project & dependencies
- **Deskripsi:** Init npm project, install dependencies
- **Modul:** Setup
- **Prioritas:** High
- **Status:** Done
- **Dependensi:** -
- **Estimasi:** 15 menit
- **File:** `package.json`

**Packages terinstall:**
- `express` ^5.x
- `better-sqlite3` ^12.x
- `ejs` ^3.x
- `lru-cache` ^11.x
- `express-rate-limit` ^7.x
- Dev: `nodemon`

---

#### T-02: Struktur folder & config
- **Deskripsi:** Buat struktur folder `src/`, `public/`, `data/`, file konfigurasi
- **Modul:** Setup
- **Prioritas:** High
- **Status:** Done
- **Dependensi:** T-01
- **Estimasi:** 15 menit
- **File:** `src/config/db.js`, `.env.example`, `.gitignore`

**Detail:**
- db.js: koneksi better-sqlite3, enable WAL mode
- .env.example: PORT, NODE_ENV, BASE_URL, DATABASE_PATH, CACHE_MAX, RATE_LIMIT_*
- .gitignore: node_modules, data/, .env

---

#### T-03: Database schema & migrasi
- **Deskripsi:** Buat tabel `links` via SQL migration
- **Modul:** Setup
- **Prioritas:** High
- **Status:** Done
- **Dependensi:** T-02
- **Estimasi:** 15 menit
- **File:** `src/config/db.js`

**Schema `links`:**
```
id          INTEGER PK AUTOINCREMENT
short_code  TEXT UNIQUE NOT NULL INDEXED
original_url TEXT NOT NULL
clicks      INTEGER DEFAULT 0
is_favorite INTEGER DEFAULT 0
created_at  TEXT DEFAULT CURRENT_TIMESTAMP
```

**Auto-migrate:** CREATE TABLE IF NOT EXISTS di db.js

---

### Modul 1: Shorten URL

#### T-04: Short code generator
- **Deskripsi:** Utility generate 7-char random short code via crypto
- **Modul:** Shorten
- **Prioritas:** High
- **Status:** Done
- **Dependensi:** T-02
- **Estimasi:** 10 menit
- **File:** `src/utils/hash.js`

**Detail:**
- Gunakan `crypto.randomBytes(5).toString('base64url')` → 7 karakter
- Loop regenerate jika collission (probabilitas rendah)
- Base64url aman untuk URL (no + / =)

---

#### T-05: URL validator & sanitasi
- **Deskripsi:** Validasi URL input — format, protocol, max length, cegah SSRF
- **Modul:** Shorten
- **Prioritas:** High
- **Status:** Done
- **Dependensi:** T-02
- **Estimasi:** 15 menit
- **File:** `src/utils/validator.js`

**Detail:**
- Gunakan `new URL()` parsing
- Protocol harus http/https
- Max 2048 karakter
- Blocklist: localhost, 127.0.0.1, 10.x, 172.16-31.x, 192.168.x (cegah SSRF)
- Trim whitespace

---

#### T-06: Shorten API endpoint (POST /shorten)
- **Deskripsi:** Endpoint menerima URL, validasi, generate short code, simpan ke DB, return short URL
- **Modul:** Shorten
- **Prioritas:** High
- **Status:** Done
- **Dependensi:** T-04, T-05, T-03
- **Estimasi:** 30 menit
- **File:** `src/controllers/shorten.js`, `src/routes/api.js`, `src/app.js`, `src/services/link.js`

**Detail:**
- Service layer: `createLink(originalUrl)` → validasi → generate → INSERT → return record
- Controller: parse body → call service → res.json({ shortUrl, originalUrl })
- Route: POST /api/shorten (karena nanti pake AJAX)
- Error handling: URL invalid → 400, server error → 500

---

#### T-07: Halaman utama (EJS + Tailwind)
- **Deskripsi:** Halaman index.ejs dengan form input + tombol shorten + area hasil
- **Modul:** Shorten
- **Prioritas:** High
- **Status:** Done
- **Dependensi:** T-06
- **Estimasi:** 45 menit
- **File:** `src/views/index.ejs`, `src/routes/index.js`, `public/css/style.css`

**Detail:**
- GET / → render index.ejs
- Form: input text + button "Shorten"
- Area hasil: short link (clickable) + tombol copy
- Loading state saat request
- Tailwind CDN via `<script>` di layout
- Dark mode toggle di pojok
- Responsive (mobile-first, WA/IG)
- Layout: header + main + footer minimal

---

#### T-08: Auto-copy & notifikasi (client-side JS)
- **Deskripsi:** Client-side JS: auto-copy short link + notifikasi "Copied!"
- **Modul:** Shorten
- **Prioritas:** Mid
- **Status:** Done
- **Dependensi:** T-07
- **Estimasi:** 20 menit
- **File:** `public/js/app.js`

**Detail:**
- Fetch POST /api/shorten dengan FormData/JSON
- On success: tampilkan short link + copy ke clipboard via `navigator.clipboard.writeText()`
- Fallback: input.select() + document.execCommand('copy')
- Notifikasi toast "Copied!" (auto-hide 2 detik)
- Loading spinner saat request

---

#### T-09: Preview URL (fetch title + domain)
- **Deskripsi:** Server-side endpoint untuk fetch title/meta dari URL yang diinput
- **Modul:** Shorten
- **Prioritas:** Low
- **Status:** Done
- **Dependensi:** T-07
- **Estimasi:** 30 menit
- **File:** `src/controllers/shorten.js`, `public/js/app.js`

**Detail:**
- GET /api/preview?url=... → fetch URL, parse <title>, return { title, domain }
- Timeout 3 detik, fallback silent
- Di client: tampilkan preview card di bawah input (domain + title)
- Package: node-fetch atau undici (built-in Node 22)

---

### Modul 2: Redirect

#### T-10: Redirect handler (GET /:code)
- **Deskripsi:** Handler yang redirect ke URL asli berdasarkan short_code
- **Modul:** Redirect
- **Prioritas:** High
- **Status:** Done
- **Dependensi:** T-03
- **Estimasi:** 20 menit
- **File:** `src/controllers/redirect.js`, `src/routes/index.js`

**Detail:**
- GET /:code → lookup short_code di cache → DB if miss
- Found: 301 redirect + Location header + increment clicks
- Not found: render 404.ejs
- Skip rate limiter

---

#### T-11: Cache layer redirect
- **Deskripsi:** In-memory LRU cache untuk mapping short_code → original_url
- **Modul:** Redirect
- **Prioritas:** Mid
- **Status:** Done
- **Dependensi:** T-10
- **Estimasi:** 15 menit
- **File:** `src/config/cache.js`, `src/services/link.js`

**Detail:**
- lru-cache: max 10.000 entries, ttl 1 jam
- getLink: cache.get → if miss → DB.get → cache.set → return
- updateLink: cache.delete (invalidasi)
- Cache hanya untuk redirect lookup (read-heavy)

---

#### T-12: 404 page
- **Deskripsi:** Halaman not found saat short code tidak valid
- **Modul:** Redirect
- **Prioritas:** Low
- **Status:** Done
- **Dependensi:** T-10
- **Estimasi:** 10 menit
- **File:** `src/views/404.ejs`

**Detail:**
- Halaman statis: "Link not found" + tombol back to home
- Tanpa JS (redirect bisa dari browser manapun)
- Styling sesuai tema

---

#### T-13: Rate limiter middleware
- **Deskripsi:** Rate limiting per IP untuk endpoint shorten
- **Modul:** Redirect
- **Prioritas:** Mid
- **Status:** Done
- **Dependensi:** T-06
- **Estimasi:** 10 menit
- **File:** `src/middleware/rateLimit.js`

**Detail:**
- express-rate-limit: 100 req/min per IP
- Terapkan hanya ke POST /api/shorten
- Response 429 + JSON error message
- Skip untuk GET routes (redirect)

---

### Modul 3: History Local

#### T-14: History localStorage (simpan, tampil, hapus)
- **Deskripsi:** Client-side history via localStorage
- **Modul:** History
- **Prioritas:** Mid
- **Status:** Done
- **Dependensi:** T-07
- **Estimasi:** 30 menit
- **File:** `public/js/app.js`, `src/views/index.ejs`

**Detail:**
- Setiap shorten sukses: simpan `{ shortUrl, originalUrl, createdAt }` ke localStorage
- Render list history di bawah form (dari localStorage)
- Tombol hapus: remove item → re-render list
- Format waktu: relative (2 menit lalu, 1 jam lalu)

---

#### T-15: Auto-purge 50 item + empty state
- **Deskripsi:** Batasi history max 50 item, auto-hapus tertua
- **Modul:** History
- **Prioritas:** Low
- **Status:** Done
- **Dependensi:** T-14
- **Estimasi:** 10 menit
- **File:** `public/js/app.js`

**Detail:**
- Saat push baru: jika length >= 50, shift() item tertua
- Empty state: "Belum ada link di-shorten" + ilustrasi

---

### Modul 4: Finalisasi

#### T-16: Dark mode toggle
- **Deskripsi:** Toggle dark/light mode dengan persist ke localStorage
- **Modul:** Final
- **Prioritas:** Low
- **Status:** Cancelled
- **Dependensi:** T-07
- **Estimasi:** 15 menit
- **File:** `public/js/app.js`, `public/css/style.css`
- **Alasan:** Selaras AGENTS.md — proyek always dark, tidak perlu toggle

---

#### T-17: Dockerfile + setup deployment
- **Deskripsi:** Dockerfile multi-stage + dokumentasi .env
- **Modul:** Final
- **Prioritas:** Mid
- **Status:** Done
- **Dependensi:** T-01
- **Estimasi:** 15 menit
- **File:** `Dockerfile`, `.env.example`

**Detail:**
- `node:22-alpine` base
- WORKDIR /app, copy package*, npm install --production
- COPY . , mkdir -p data
- EXPOSE 8080, CMD node src/app.js
- .env.example: PORT, NODE_ENV, BASE_URL, DATABASE_PATH, CACHE_MAX, RATE_LIMIT_*

---

#### T-18: Error handling global + polish
- **Deskripsi:** Middleware error global, validasi request, logging
- **Modul:** Final
- **Prioritas:** Mid
- **Status:** Done
- **Dependensi:** Semua task modul 1-3
- **Estimasi:** 20 menit
- **File:** `src/middleware/errorHandler.js`, `src/app.js`

**Detail:**
- Global error handler: return JSON { error: message } + status code
- 404 catch-all untuk routes tidak dikenal
- Logging: console.error dengan timestamp
- Sanitasi error message (jangan expose stack trace di production)

---

## Ringkasan Task

| ID | Task | Prioritas | Dependensi | Estimasi |
|----|------|-----------|-----------|----------|
| T-01 | Init project & dependencies | High | - | 15m |
| T-02 | Struktur folder & config | High | T-01 | 15m |
| T-03 | Database schema | High | T-02 | 15m |
| T-04 | Short code generator | High | T-02 | 10m |
| T-05 | URL validator | High | T-02 | 15m |
| T-06 | Shorten API endpoint | High | T-04, T-05, T-03 | 30m |
| T-07 | Halaman utama EJS | High | T-06 | 45m |
| T-08 | Auto-copy & notifikasi | Mid | T-07 | 20m |
| T-09 | Preview URL fetch | Low | T-07 | 30m |
| T-10 | Redirect handler | High | T-03 | 20m |
| T-11 | Cache layer | Mid | T-10 | 15m |
| T-12 | 404 page | Low | T-10 | 10m |
| T-13 | Rate limiter | Mid | T-06 | 10m |
| T-14 | History localStorage | Mid | T-07 | 30m |
| T-15 | Auto-purge 50 item | Low | T-14 | 10m |
| T-16 | Dark mode toggle | Low (Cancelled) | T-07 | 15m |
| T-17 | Dockerfile + deployment | Mid | T-01 | 15m |
| T-18 | Error handling + polish | Mid | All | 20m |

**Total: 18 tasks | ~5.5 jam estimasi**
