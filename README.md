# 🏨 Samo Hotel — Boshqaruv Tizimi

Kichik mehmonxonalar uchun to'liq boshqaruv platformasi.

## Imkoniyatlar

- **Xonalar boshqaruvi** — 17 ta xona (2-4 qavat), check-in/check-out
- **Bron tizimi** — telefon orqali oldindan bron qilish
- **Moliya** — kirim/chiqim, kategoriyalar, qidiruv
- **Smena hisoboti** — 3 ta admin smenada ishlaydi
- **Kunlik/Oylik hisobotlar** — TXT va ZIP formatda yuklab olish
- **Loglar** — barcha adminlar faoliyati qayd qilinadi
- **JWT autentifikatsiya** — xavfsiz login tizimi

## Texnologiyalar

| Frontend | Backend |
|----------|---------|
| React 19 + TypeScript | Node.js + Express |
| Tailwind CSS | SQLite (better-sqlite3) |
| Vite | JWT (jsonwebtoken) |
| Lucide Icons | bcryptjs |

## O'rnatish

### 1. Node.js o'rnating
Node.js 18+ kerak: https://nodejs.org

### 2. Loyihani sozlang

```bash
# Loyiha papkasiga o'ting
cd samo-hotel

# Barcha dependencylarni o'rnating
npm run install:all

# Database yarating va boshlang'ich ma'lumotlarni kiriting
cd server && node seed.js && cd ..
```

### 3. Ishga tushiring

**Development rejimda (2 ta terminal):**
```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Yoki bitta buyruq bilan:
```bash
npm run dev
```

Brauzerda oching: http://localhost:5173

**Production rejimda:**
```bash
# Frontend build
cd client && npm run build && cd ..

# Serverni ishga tushiring
cd server && npm start
```

Brauzerda oching: http://localhost:3001

## Login ma'lumotlari

| Login | Parol |
|-------|-------|
| admin1 | 1234 |
| admin2 | 1234 |
| admin3 | 1234 |

## Deploy qilish

### VPS (DigitalOcean, Hetzner, va hokazo)

1. VPS oling (Ubuntu 22+)
2. Node.js, nginx, pm2 o'rnating
3. Loyihani serverga yuklang
4. `npm run install:all && cd server && node seed.js`
5. `cd client && npm run build`
6. PM2 bilan serverni ishga tushiring:
   ```bash
   cd server && pm2 start server.js --name samo-hotel
   ```
7. Nginx reverse proxy sozlang
8. SSL sertifikat (Let's Encrypt) qo'shing

### Railway / Render

1. GitHub ga push qiling
2. Railway/Render da yangi service yarating
3. Build command: `cd client && npm install && npm run build`
4. Start command: `cd server && npm install && node seed.js && node server.js`
5. Environment variables qo'shing:
   - `JWT_SECRET` — o'zingiz tanlagan maxfiy kalit
   - `PORT` — 3001

## Papka tuzilishi

```
samo-hotel/
├── client/              # Frontend (React)
│   ├── src/
│   │   ├── pages/       # Sahifalar
│   │   ├── components/  # UI komponentlar
│   │   └── lib/         # API client, utils
│   └── ...
├── server/              # Backend (Express)
│   ├── server.js        # Asosiy server
│   ├── database.js      # SQLite schema
│   ├── auth.js          # JWT middleware
│   ├── seed.js          # Boshlang'ich data
│   └── .env             # Sozlamalar
└── package.json         # Root scripts
```

## .env sozlamalari (server/)

```
PORT=3001
JWT_SECRET=o'zingiz-maxfiy-kalit-qo'ying
DB_PATH=./database.sqlite
```

⚠️ Production da `JWT_SECRET` ni albatta o'zgartiring!
