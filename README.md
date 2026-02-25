# econ

Personal finance tracker. Track expenses, income, loans, and savings — with import and AI-assisted categorization.

## Stack

- **Next.js 16** (App Router, standalone output)
- **PostgreSQL** via [Neon](https://neon.tech) + Drizzle ORM
- **Auth.js v5** with Google OAuth
- **UploadThing** for file uploads
- **Anthropic Claude** for AI import review

## Setup

**1. Clone and install**

```bash
npm install
```

**2. Configure environment**

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- `DATABASE_URL` — PostgreSQL connection string (e.g. Neon)
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 credentials, add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `UPLOADTHING_TOKEN` — [uploadthing.com/dashboard](https://uploadthing.com/dashboard)
- `ANTHROPIC_API_KEY` — [console.anthropic.com](https://console.anthropic.com/settings/api-keys)

**3. Run migrations**

```bash
npx drizzle-kit migrate
```

**4. Start dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

Run with the included `compose.yml` (includes Postgres):

```bash
cp .env.example .env
# fill in .env, then:
docker compose up -d
```

Or build locally:

```bash
just build
just run
```
