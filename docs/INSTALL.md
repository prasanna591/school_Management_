# PSM School Management - Installation

Prerequisites
- Node.js >= 20 (see .nvmrc)
- npm >= 10+
- MySQL 8.0+ or Docker
- Git

Quick Start
1. `npm install`
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and JWT secrets.
   Generate secrets with: `node -e "require('crypto').randomBytes(48).toString('hex')"`
3. `docker compose up -d mysql` (or start your own MySQL 8)
4. `npm run build:shared`
5. `npm run db:migrate`
6. `npm run db:seed:demo` — seeds Greenfield Matriculation Higher Secondary School
   (sample data) plus the four demo accounts.
7. `npm run dev` — backend on http://localhost:4000

API: http://localhost:4000/api/v1/health

Demo accounts (password `demo1234`):
- `principal@demo.school` — Principal / Administrator
- `teacher@demo.school` — Teacher
- `parent@demo.school` — Parent (child: Kavya Ramesh, Class 8-A)
- `student@demo.school` — Student (Kavya Ramesh, Class 8-A)

Super Admin: set via `SEED_SUPER_ADMIN_EMAIL`/`SEED_SUPER_ADMIN_PASSWORD` or generated on seed.

Mobile
- Web dashboard: `npm run dev -w @smartschool/web` (http://localhost:5173)
- Mobile: `npx expo start` from `apps/mobile`. Point `EXPO_PUBLIC_API_BASE` at the backend's
  LAN address (printed at backend startup) so a physical device can reach it.
- Demo quick-login buttons appear on login screens when `DEMO_MODE=true` (set in `.env`).

Demo data is clearly marked as sample and must not be treated as real school records.
