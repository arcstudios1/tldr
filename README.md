# Gists

> The news. In seconds.

A modern news aggregation platform delivering curated, multi-source summaries across Tech, Finance, Politics, Culture, and Sports.

---

## Project Structure

```
tldr/
├── apps/
│   ├── backend/    # Node.js + Express API + content pipeline
│   └── mobile/     # Expo (React Native) iOS app
```

---

## Setup

### 1. Add Your Credentials

**Backend** — edit `apps/backend/.env`:
```
DATABASE_URL=           # Supabase → Project Settings → Database → Connection string (URI mode)
SUPABASE_URL=           # Supabase → Project Settings → API → Project URL
SUPABASE_SERVICE_ROLE_KEY=  # Supabase → Project Settings → API → service_role key
OPENAI_API_KEY=         # platform.openai.com → API Keys
PORT=3001
```

**Mobile** — edit `apps/mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=       # Same as SUPABASE_URL above
EXPO_PUBLIC_SUPABASE_ANON_KEY=  # Supabase → Project Settings → API → anon key
EXPO_PUBLIC_API_URL=            # Your backend URL (http://localhost:3001 for local dev)
```

### 2. Set Up the Database

```bash
cd apps/backend
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to Supabase
```

### 3. Seed Initial Content

```bash
npm run db:seed   # Fetches RSS feeds and runs OpenAI summarization
```

### 4. Run the Backend

```bash
npm run dev
```

### 5. Run the Mobile App

```bash
cd ../mobile
npm run ios
```

---

## Supabase Setup Notes

After running `db:push`, you also need to create the `users` table via Supabase Auth trigger, or manually enable Row Level Security (RLS) policies. The simplest approach for MVP:

1. In Supabase Dashboard → Authentication → Settings → enable email confirmations (or disable for testing)
2. In Table Editor, confirm `User`, `Article`, `Vote`, `Comment` tables exist
3. For the `users` table, add a Row Level Security policy allowing inserts from authenticated users

---

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | Expo, React Native, TypeScript |
| Navigation | Expo Router |
| Feed | FlashList |
| State/Cache | TanStack Query |
| Auth | Supabase Auth |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |
| AI | OpenAI GPT-4o-mini |
| Content | RSS feeds via rss-parser |
| Scheduler | node-cron (every 30 min) |
