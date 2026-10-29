# PRD: Client Self-Service Dashboard & Telegram Login
**License Manager v2.0 — User-Owned License Management & Auto-Install**

---

## 1. Ringkasan Fitur

Memungkinkan **user publik** untuk:
- **Login via Telegram** (One-click, aman, no password)
- **Registrasi license baru sendiri** (isi IP, domain, client_name, label, expired_date)
- **Menjalankan instalasi** untuk license miliknya (input SSH password & port saat install)
- **Monitor server** via dashboard (metrics, status, history instalasi)

**User ownership** — setiap license/node milik user berbeda, terisolasi strict by `tele_id`.

---

## 2. Arsitektur Database

### Tabel yang Sudah Ada (Tidak Perlu Migrasi Besar)

**`licenses` table:**
```sql
ip_address TEXT PRIMARY KEY
client_name TEXT NOT NULL UNIQUE
expired_date TEXT NOT NULL
status TEXT DEFAULT 'active' (active | banned)
auth_key TEXT
tele_id TEXT -- Owner identifier (Telegram user ID)
label TEXT (zivpn | tunneling)
domain TEXT (opsional)
notif_state TEXT DEFAULT '{}'
is_monitoring_enabled INTEGER DEFAULT 0
```

**`install_jobs` table:**
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
ip_address TEXT NOT NULL -- Foreign key to licenses
client_name TEXT NOT NULL
domain TEXT NOT NULL
ssh_port INTEGER DEFAULT 22
password_enc TEXT NOT NULL -- AES-256-GCM terenkripsi
status TEXT (pending | running | success | failed)
log TEXT DEFAULT ''
started_at DATETIME
finished_at DATETIME
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- Baru: owner_tele_id untuk tracking siapa yang trigger install
owner_tele_id TEXT
```

**`users` table (Opsional, untuk Session Cache):**
```sql
tele_id TEXT PRIMARY KEY
username TEXT
first_name TEXT
photo_url TEXT
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

### Schema Changes Required

1. **`licenses` table** — sudah punya `tele_id`, gunakan sebagai foreign key user
2. **`install_jobs` table** — tambah kolom `owner_tele_id` untuk audit & filtering (opsional tapi recommended)

---

## 3. Authentication Flow — Telegram Login

### Route: `GET /api/auth/telegram`

User klik tombol "Login with Telegram" → sistem verifikasi hash dari Telegram Web App.

**Implementation:**
```
1. Frontend render Telegram Login Widget (TMA) / Web App
   - Menggunakan telegram-web-app SDK
   - Telegram send user data + HMAC-SHA256 hash

2. Frontend send ke backend:
   POST /api/auth/telegram
   {
     "id": 123456789,
     "first_name": "Izal",
     "username": "izal_dev",
     "photo_url": "https://...",
     "hash": "aabbccdd..." (from Telegram)
   }

3. Backend verify:
   - Hitung HMAC-SHA256(data_check_string, BOT_TOKEN)
   - Bandingkan dengan hash dari request
   - Jika valid → sign JWT session
   - Set httpOnly cookie: user_session (24h)

4. Redirect ke `/dashboard` (authenticated)
```

**Security:**
- BOT_TOKEN hanya di server (env var)
- Hash verification mencegah pemalsuan Telegram ID
- Session cookie httpOnly + Secure (production)
- CSRF token untuk form state-changing requests

---

## 4. User Dashboard — Routes & Features

### Route: `GET /dashboard`

**Middleware Check:**
- Verify `user_session` cookie ada & valid
- Extract `tele_id` dari session
- Jika tidak authenticated → redirect ke `/`

**Page Display:**
```
┌─────────────────────────────────────────┐
│  Dashboard: Izal (Telegram ID: 123...) │ [Logout]
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Summary Card (Weather-style):            │
│  Total Nodes: 3                         │
│  Active: 2                              │
│  Registered Clients: 15                 │
│  Active Ratio: ░░░▓▓▓░░░ 66%           │
└─────────────────────────────────────────┘

[+ Daftarkan License Baru]

┌─ License List ──────────────────────────┐
│ 1. Corp_Alpha (1.2.3.4)                │
│    Status: ACTIVE | Label: zivpn      │
│    Expires: 2025-12-31                 │
│    [Install] [Monitor] [Edit] [Delete] │
├─────────────────────────────────────────┤
│ 2. Corp_Beta (1.2.3.5)                 │
│    Status: ACTIVE | Label: tunneling   │
│    Expires: 2025-06-15                 │
│    [Install] [Monitor] [Edit] [Delete] │
└─────────────────────────────────────────┘

┌─ Installation History ──────────────────┐
│ Corp_Alpha: SUCCESS (2h ago)            │
│ Corp_Beta: RUNNING (5min ago)           │
└─────────────────────────────────────────┘
```

---

## 5. License Registration Flow

### Route: `POST /api/client/licenses`

**Frontend Form (Modal):**
```
Daftarkan License Baru
├─ IP Server *            [text input] ex: 1.2.3.4
├─ Client Name *          [text input] ex: Corp_Alpha
├─ Domain *               [text input] ex: node1.example.com
├─ Label *                [dropdown] (zivpn | tunneling)
├─ Expired Date *         [date picker] ex: 2025-12-31
├─ SSH Port (optional)    [number] default: 22
└─ [Cancel] [Registrasi]
```

**Validation (Zod Schema):**
```typescript
const RegisterLicenseSchema = z.object({
  ip_address: z.string().ip(),
  client_name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  domain: z.string().optional(),
  label: z.enum(['zivpn', 'tunneling']),
  expired_date: z.string().date(),
  ssh_port: z.number().int().min(1).max(65535).default(22),
});
```

**Backend Logic:**
```
1. Verify user authenticated (from session)
2. Validate input schema
3. Check duplicate:
   - client_name unique? (1 client = 1 node)
   - ip_address unique? (1 IP = 1 license)
4. Insert into licenses table:
   - ip_address, client_name, domain, label, expired_date
   - tele_id = :authenticated_user_tele_id ✅ (set owner)
   - status = 'active'
   - is_monitoring_enabled = 0 (default, can enable later)
5. Return { success: true, license_id }
6. Refresh dashboard license list
```

**Response:**
```json
{
  "success": true,
  "license": {
    "ip_address": "1.2.3.4",
    "client_name": "Corp_Alpha",
    "domain": "node1.example.com",
    "label": "zivpn",
    "expired_date": "2025-12-31",
    "status": "active",
    "tele_id": "123456789"
  }
}
```

---

## 6. Installation Flow

### Route: `POST /api/client/licenses/:ip/install`

**User klik [Install] button pada license:**

1. **Frontend Modal — Input SSH Credential:**
```
Install Server: Corp_Alpha (1.2.3.4)
├─ SSH Password *         [password input]
├─ SSH Port               [number] default: 22
└─ [Cancel] [Mulai Install]
```

2. **Backend Logic:**
```
1. Verify user authenticated
2. Verify license milik user:
   SELECT * FROM licenses WHERE ip_address = :ip AND tele_id = :user_tele_id
   → If not found → 403 Forbidden
3. Verify license active:
   → If status != 'active' → 400 Bad Request
4. Encrypt password: AES-256-GCM(password, INSTALL_ENC_KEY)
5. Insert install_jobs:
   - ip_address, client_name, domain, ssh_port, password_enc
   - status = 'pending'
   - owner_tele_id = :user_tele_id (audit trail)
   - log = ''
6. Return { success: true, job_id: 123 }
```

**Response:**
```json
{
  "success": true,
  "job_id": 123,
  "message": "Instalasi dimulai. Progress akan diupdate real-time."
}
```

### Real-Time Progress Tracking

**Route: `GET /api/client/install-jobs/:job_id`**

User bisa poll status instalasi:
```json
{
  "id": 123,
  "ip_address": "1.2.3.4",
  "client_name": "Corp_Alpha",
  "status": "running",
  "progress": 45,
  "log": "Connecting to server...\nAuthenticating...\nDownloading script...",
  "started_at": "2026-10-29T10:00:00Z",
  "finished_at": null
}
```

---

## 7. API Contracts (Complete)

### Authentication Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| POST | `/api/auth/telegram` | Verify Telegram hash & create session | No |
| POST | `/api/auth/logout` | Clear session cookie | Yes |
| GET | `/api/auth/me` | Get current user info | Yes |

### Client Endpoints (User-Facing)

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/client/licenses` | List user's licenses | Yes |
| POST | `/api/client/licenses` | Register new license | Yes |
| PUT | `/api/client/licenses/:ip` | Update license (name, date, domain) | Yes |
| DELETE | `/api/client/licenses/:ip` | Delete license | Yes |
| POST | `/api/client/licenses/:ip/install` | Trigger installation | Yes |
| GET | `/api/client/install-jobs` | List user's install jobs | Yes |
| GET | `/api/client/install-jobs/:id` | Get single job status & log | Yes |

### Admin Endpoints (Tetap Ada)

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/admin/licenses` | List all licenses (admin only) | Yes (admin) |
| POST | `/api/admin/licenses` | Create license (admin) | Yes (admin) |
| PUT | `/api/admin/licenses/:ip` | Update license (admin) | Yes (admin) |
| DELETE | `/api/admin/licenses/:ip` | Delete license (admin) | Yes (admin) |
| POST | `/api/admin/install` | Trigger install (admin) | Yes (admin) |

---

## 8. Security Checklist

- ✅ Telegram hash verification (prevent spoofing)
- ✅ httpOnly cookies (prevent XSS token theft)
- ✅ Owner isolation: filter by `tele_id` setiap query
- ✅ Password encryption: AES-256-GCM sebelum DB
- ✅ Authorization: user hanya access license milik mereka
- ✅ Input validation: Zod schema untuk semua request
- ✅ Rate limiting: jangan izinkan spam install request
- ✅ Log sanitization: jangan expose password di log
- ✅ Admin vs Client: terpisah route (`/api/admin/*` vs `/api/client/*`)

---

## 9. Implementasi Timeline (Fase)

### **Fase 1: Telegram Auth** (2-3 hari)
- Implement `/api/auth/telegram` (hash verification)
- Create session middleware
- Add logout route
- Create login landing page (TMA button)

### **Fase 2: Client License Registration** (2-3 hari)
- Implement `POST /api/client/licenses` (register license)
- Implement `GET /api/client/licenses` (list user's licenses)
- Create dashboard license list UI
- Add modal form untuk registrasi license

### **Fase 3: Install Flow** (3-4 hari)
- Implement `POST /api/client/licenses/:ip/install` (create install job)
- Implement `GET /api/client/install-jobs` (list jobs)
- Create install progress UI (modal atau sidebar)
- Real-time progress tracking (polling atau websocket)

### **Fase 4: Dashboard Polish** (2-3 hari)
- Add monitoring card (weather-style) untuk summary
- Add installation history
- Add edit/delete license functionality
- Responsive mobile design

---

## 10. File Structure Baru

```
src/
├── app/
│   ├── auth/
│   │   ├── telegram/            # Telegram login page
│   │   │   └── page.tsx
│   │   └── ...
│   ├── dashboard/              # User dashboard
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── telegram/route.ts ✨
│   │   │   └── ...
│   │   ├── client/             # User API endpoints
│   │   │   ├── licenses/route.ts ✨
│   │   │   └── install-jobs/route.ts ✨
│   │   └── admin/
│   │       └── ... (sudah ada)
│   └── ...
├── lib/
│   ├── auth.ts (sudah ada)
│   ├── telegram.ts ✨ (Telegram widget & verification)
│   └── ...
└── components/
    ├── client/
    │   ├── DashboardLayout.tsx ✨
    │   ├── LicenseList.tsx ✨
    │   ├── RegisterLicenseModal.tsx ✨
    │   └── InstallProgressModal.tsx ✨
    └── ...
```

---

## 11. Pertanyaan Verifikasi

**Sebelum saya mulai implementasi, apakah pemahaman saya benar?**

1. ✅ User login via Telegram (bukan admin login)?
2. ✅ User registrasi license sendiri di dashboard (bukan publik form)?
3. ✅ User hanya lihat license miliknya sendiri (filter by tele_id)?
4. ✅ User input SSH password **saat klik Install**, bukan saat registrasi?
5. ✅ Admin dashboard tetap terpisah (`/admin-dynamic`, hanya admin)?
6. ✅ Timeline mulai dari **Fase 1: Telegram Auth** dulu?

Faham gak dengan PRD ini?
