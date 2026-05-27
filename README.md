# SHIVOFFSET VMS — Full Stack React + Express

## Project Structure
```
SHIVOFFSET_VMS/
├── .env                    ← Database credentials (already exists)
├── backend/                ← Node.js + Express API (port 3001)
│   ├── server.js
│   ├── db.js               ← MSSQL connection + table initialization
│   ├── middleware/auth.js  ← JWT middleware
│   └── routes/             ← auth, visitors, hosts, scheduled, blacklist, locations, settings
└── frontend/               ← React + Vite app (port 5173)
    └── src/
        ├── pages/          ← Login, Dashboard, CheckIn, Visitors, Scheduled, Hosts, Reports, Blacklist, Settings
        ├── components/     ← Layout, Sidebar, Topbar, BottomNav, Toast, PillStatus
        └── components/modals/ ← All modal components
```

## Quick Start

### 1. Install & Start Backend
```powershell
cd backend
npm install
npm run dev
```
Backend runs on: http://localhost:3001

### 2. Install & Start Frontend
```powershell
cd frontend
npm install
npm run dev
```
Frontend runs on: http://localhost:5173

## Default Login Credentials
| User     | Password   | Role  |
|----------|------------|-------|
| admin    | admin123   | admin |
| guard    | guard123   | guard |

## Features
- ✅ Login page with JWT authentication
- ✅ Dashboard with KPI cards & live charts (Chart.js)
- ✅ New Check-in form with camera capture & photo upload
- ✅ Visitors table — filter by status, date range, bulk actions, CSV export
- ✅ Pre-Scheduled visits with mark-arrived auto check-in
- ✅ Host directory — CRUD, online/away toggle
- ✅ Reports & Analytics — weekly trend, dept duration, top hosts, purpose breakdown
- ✅ Blacklist management
- ✅ Settings — WhatsApp API config, office locations, editable dropdowns
- ✅ Premium e-Badge — 3D flip animation, QR code, download PNG, print
- ✅ WhatsApp notification integration (wa.me links + API mode)
- ✅ Keyboard shortcuts (Ctrl+N, Ctrl+1/2/3, Ctrl+K, Esc, ?)
- ✅ Responsive design — desktop + mobile with bottom nav
- ✅ SQL Server backend with parameterized queries

## Environment Variables (.env)
```
DB_HOST=72.61.170.243
DB_PORT=14311
DB_NAME=SHIVOFFSET
DB_USER=appuser
DB_PASSWORD=...
DB_ENCRYPT=false
NODE_ENV=development
PORT=3001
```
