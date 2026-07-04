# PRD: Shortlink — URL Pendek Sederhana

## BAGIAN 1: Visi & Tujuan

### Visi
Aplikasi web ringan buat pendekin URL panjang jadi pendek — cepat, gratis, tanpa ribet. Publik umum bisa langsung pakai tanpa login.

### Tujuan (3)
1. **Shorten URL instan** — Tempel URL panjang, dapat link pendek < 1 detik.
2. **Zero friction** — Buka web, tempel, salin. Tanpa daftar/login.
3. **Link permanen** — Redirect tetap jalan meski asli panjang.

### Value Proposition
- **Gratis + tanpa akun** — Beda sama bit.ly yang minta registrasi.
- **Simpul mati** — Halaman tunggal, satu fungsi, selesai.
- **Cepat** — Tanpa bloat, tanpa iklan.

---

## BAGIAN 2: User Persona

### Persona 1: Rina — Social Media Manager
- **Usia/Pekerjaan:** 28, Social Media Specialist
- **Level Teknis:** Menengah
- **Tujuan:** Share link produk ke Instagram/TikTok bio — pengin link pendek biar rapi
- **Pain Points:** URL affiliate panjang banget, jelek dilihat, suka kepotong di caption
- **Motivasi:** Mau link pendek cepat tanpa ribet login/daftar

### Persona 2: Dimas — Casual User
- **Usia/Pekerjaan:** 22, Mahasiswa
- **Level Teknis:** Pemula
- **Tujuan:** Share link tugas/article ke grup WhatsApp
- **Pain Points:** Males bikin akun cuma buat pendekin link sekali-sekali
- **Motivasi:** Gratis, buka web langsung pakai, selesai

---

## BAGIAN 3: User Stories

### Modul 1: Shorten URL
- Sebagai pengguna, saya ingin menempel URL panjang ke input, agar dapat link pendek instan.
- Sebagai pengguna, saya ingin link pendek langsung tercopy otomatis, agar tidak perlu select manual.
- Sebagai pengguna, saya ingin melihat preview URL asli sebelum di-shorten, agar yakin linknya benar.

### Modul 2: Redirect
- Sebagai pengguna yang dikasih link pendek, saya ingin di-redirect ke URL asli cepat, agar tidak nunggu.
- Sebagai pengguna, saya ingin redirect tetap jalan meski URL asli panjang sekali, agar link pendek permanen.

### Modul 3: Pengelolaan
- Sebagai pengguna, saya ingin lihat history link yang pernah di-shorten, agar bisa pakai ulang.
- Sebagai pengguna, saya ingin hapus link dari history, agar bersih.
- Sebagai pengguna, saya ingin bookmark/link favorit, agar mudah ditemukan.

### Modul 4: Opsional (Login)
- Sebagai pengguna, saya ingin daftar akun, agar bisa manage link lebih banyak.
- Sebagai pengguna yang login, saya ingin lihat statistik klik tiap link, agar tahu performa.

---

## BAGIAN 4: Functional Requirements

### Modul 1: Shorten URL

**FR-01: Shorten URL Instan**
- **Input:** URL panjang (text)
- **Proses:** Validasi URL, hash/short code, simpan mapping
- **Output:** Short link (contoh: `s.l/abc123`)
- **Aturan:** URL harus valid, max 2048 chars, short code 7 char unik

**FR-02: Auto-Copy**
- **Input:** Short link selesai digenerate
- **Proses:** Copy ke clipboard otomatis via JS
- **Output:** Notifikasi "Copied!"
- **Aturan:** Hanya client-side, fallback manual copy

**FR-03: Preview URL**
- **Input:** URL diinput user
- **Proses:** Fetch title/meta dari URL
- **Output:** Preview card (title + domain)
- **Aturan:** Timeout 3 detik, fallback silent

### Modul 2: Redirect

**FR-04: Redirect 301**
- **Input:** Request ke short code
- **Proses:** Lookup DB, redirect ke URL asli
- **Output:** HTTP 301 + Location header
- **Aturan:** TTL cache 1 jam, not found → 404 page

**FR-05: Rate Limit**
- **Input:** Request per IP
- **Proses:** Hit counter, blokir jika overload
- **Output:** 429 Too Many Requests
- **Aturan:** 100 req/min per IP

### Modul 3: History (Local/Session)

**FR-06: Simpan History**
- **Input:** Short link dibuat
- **Proses:** Simpan ke localStorage/IndexedDB
- **Output:** History bertambah
- **Aturan:** Max 50 item, auto-purge tertua

**FR-07: Hapus History**
- **Input:** Klik hapus item
- **Proses:** Remove dari localStorage
- **Output:** Item hilang dari list

### Modul 4: Akun (Opsional V1)

**FR-08: Registrasi**
- **Input:** Email, password
- **Proses:** Validasi, hash bcrypt, simpan
- **Output:** Akun terdaftar
- **Aturan:** Min 6 char password

**FR-09: Login**
- **Input:** Email, password
- **Proses:** Verifikasi, generate JWT
- **Output:** Token (24 jam)
- **Aturan:** Rate limit 5 gagal/blokir

**FR-10: Dashboard History**
- **Input:** Login user
- **Proses:** Load semua link user dari DB
- **Output:** List link + short code
- **Aturan:** Pagination 20/item

---

## BAGIAN 5: Non-Functional Requirements

### Performa
- Shorten API response < 1 detik
- Redirect response < 100ms (cache optimal)
- Support 500 concurrent request

### Keamanan
- Validasi URL (cegah XSS/SSRF)
- Rate limit per IP
- HTTPS wajib
- Short code random (tidak sequential/tebak-tebakan)

### Skalabilitas
- Siap scale horizontal (cache layer)
- Database indexing by short code
- Stateless backend

### Usability
- Responsive (mobile first — banyak akses dari WA/IG)
- Tanpa JS untuk halaman redirect
- Always dark theme

### Availability
- Uptime 99.5%
- Redirect halaman fallback statis

---

## BAGIAN 6: Out of Scope & Dependensi

### Out of Scope (V1)
- **Kustom domain** — User pakai domain sendiri untuk short link (v2)
- **Link expiration** — Link auto-hilang setelah waktu tertentu (v2)
- **Team/Workspace** — Kolaborasi multi-user (v2)
- **API publik** — REST API untuk developer (v2)
- **QR code generator** — Generate QR dari short link (v2)
- **Browser extension** — Extension Chrome/Edge (v2)

### Dependensi
- **Runtime:** Node.js / Bun
- **Database:** SQLite (file-based) atau PostgreSQL
- **Cache:** Redis (opsional, untuk performa redirect)
- **Framework:** Hono / Express / Fastify
- **Frontend:** Vanilla HTML+CSS atau React ringan
- **Deploy:** Docker + VPS / Cloudflare Workers

### Asumsi
- User punya koneksi internet stabil
- User buka dari browser modern (Chrome, Safari, WA in-app browser)
- Tidak perlu GDPR compliance untuk V1 (no tracking)
- Short code cukup 7 karakter (62^7 = ~3.5 trilyun kombinasi)
