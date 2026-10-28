# PRD: UI/UX Redesign — licence-manager (Terminal-Native / VoltAgent Theme)

## 1. Goal
Melakukan overhaul UI/UX secara menyeluruh pada 6 halaman aplikasi (Design Tokens, Admin Dashboard, Remote Installer, Home, Login, Monitoring) tanpa mengubah route, logika database, atau auth. Memperbaiki masalah hierarchy, inkonsistensi visual, pengalaman mobile (terutama tabel), dan membersihkan elemen "AI slop" (glow berlebihan, warna ungu acak).

## 2. Reference Lock & Design System (VoltAgent Theme)
- **Canvas & Surface**: 
  - Canvas: `#050507` (Deep Void Black)
  - Surface: `#101010` (Carbon Surface)
- **Accent Hierarchy (Satu sumber energi + Semantic)**:
  - **Brand / Active / Focus**: Cyan (`#06b6d4` / `text-cyan-400`, `border-cyan-500`) — khusus untuk elemen aktif, link utama, brand.
  - **Success / Online**: Neon Green (`#22c55e` / `text-green-400`) — khusus status sukses, online, uptime.
  - **Warning / Pending**: Amber/Yellow (`#eab308`).
  - **Destructive / Error / Selection**: Pink (`#ec4899` / `selection:bg-pink-500 selection:text-white`).
  - **Neutral / Muted**: Slate/Gray (`#8b949e`, `#3d3a39`).
  - **Purple**: Dihapus dari statistik dan seluruh UI untuk menjaga konsistensi monokrom-cyan-neon.
- **Typography**:
  - Font: `font-mono` (Geist Mono / system monospace) dipertahankan konsisten di seluruh aplikasi.
  - Uppercase micro-labels selalu dengan `tracking-wider` / `tracking-widest`.
- **Motion**:
  - Interaksi cepat (90–150ms `ease-out`), tanpa `transition: all`, menghormati `prefers-reduced-motion`.
- **Mobile First**:
  - Tabel admin di mobile (< md) dirender sebagai **card-list per node**, switch ke tabel penuh di desktop (md+).

## 3. Scope & Urutan Eksekusi

1. **Phase 1: Design Tokens & Globals (`src/app/globals.css`)**
   - Standarisasi `::selection`, background global, scrollbar terminal, utility class untuk card, border, dan glow neon sukses.
2. **Phase 2: Admin Dashboard & Installer (`/admin-dynamic`, `/admin-dynamic/install`)**
   - Perbaikan tabel admin: card-list di mobile, tabel bersih di desktop.
   - Halaman install baru: konsisten, terminal console rapi, form responsif.
3. **Phase 3: Home / Public Status (`/`)**
   - Hapus kartu statistik ungu, ganti netral/cyan.
   - Grid node partisipan lebih scannable.
4. **Phase 4: Login (`/login`)**
   - Polishing card container, border containment, input focus ring yang rapi.
5. **Phase 5: Public Monitoring (`/[client_name]/monitoring`)**
   - Polish kartu metrik, chart container, status live streaming.

## 4. Verification Plan
- Setiap phase di-commit terpisah dengan commit message konvensional.
- Dilakukan `npm run build` setelah setiap phase untuk memastikan tidak ada error TypeScript atau Next.js SSR.
- Tidak ada perubahan pada backend route, database Turso, atau handler Telegram.
