# Sarathan Studio

Premium photography studio website built with **Next.js 14 (App Router), TypeScript and Tailwind CSS**, with optional **Supabase** (auth + database) and **OpenAI** (real AI photo styling).

## Run locally

From this folder:

```powershell
npm install
copy .env.example .env.local
npm run dev
```

Then open http://localhost:3000

For a production build:

```powershell
npm run build
npm start
```

The site works immediately without any keys - homepage, portfolio gallery,
digital album, WhatsApp booking and the instant (demo) style previews all run.
Features that need configuration show a clear "configuration required" notice
instead of pretending to work.

## Feature status

| Feature | Status |
| --- | --- |
| Homepage, services, portfolio gallery, contact | Works out of the box |
| WhatsApp booking form | Works; number from `NEXT_PUBLIC_WHATSAPP_NUMBER` (default 94776292002) |
| Digital album | Works; optional music needs `public/music.mp3` |
| AI photo preview | Instant local filter demos work; **real AI needs `OPENAI_API_KEY`** |
| Customer login | Requires Supabase (see below) |
| Private galleries + photo selection | Requires Supabase |
| Admin dashboard | Requires Supabase + an admin account |

## Environment variables (.env.local)

Copy `.env.example` to `.env.local` and fill in values. All secrets stay
server-side; only the `NEXT_PUBLIC_*` values are visible to the browser, and
none of them are secret keys.

## Supabase setup

1. Create a free project at https://supabase.com
2. Open **Project Settings -> API** and copy the Project URL and anon key into
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Open **SQL Editor -> New query**, paste the contents of
   [supabase/schema.sql](supabase/schema.sql), and run it. This creates the
   tables, row-level-security policies and sample packages.
4. Create your first customer: sign up on `/login`, or add a user in
   **Authentication -> Users**.
5. Make yourself an administrator: in **Table Editor -> profiles**, set your
   row's `role` to `admin`. `/admin` then unlocks for your account only
   (enforced server-side and by RLS).
6. Create customer galleries and add photos from the admin dashboard.

### Private photo storage (recommended for real customer photos)

The `photos.url` column accepts any URL. For genuinely private photos:

1. Create a **private** bucket named `customer-photos` in Supabase Storage.
2. Upload photos there (admin only).
3. Generate signed URLs server-side (e.g. in an admin server action) and store
   or render those - never make the bucket public.

## AI photo preview

- The upload page (`/ai-preview`) always shows instant local style demos
  (cinematic, wedding, black & white, studio portrait) - these are CSS
  filters, clearly labelled as demos.
- The **Generate with AI** button calls `POST /api/ai-preview`, which uses the
  OpenAI Images API when `OPENAI_API_KEY` is set. Without the key the endpoint
  returns HTTP 501 and the UI explains that configuration is required.
- The API key is read only on the server (`process.env.OPENAI_API_KEY`) and is
  never sent to the browser.

## Security notes

- Row-level security is enabled on every table; customers can only read their
  own galleries, photos and selections.
- `/admin` and `/my-gallery` are protected by middleware (sign-in required)
  and by additional server-side role checks on the pages themselves.
- No API keys or service-role keys appear in frontend code.

## Project structure

```
src/
  app/            pages (home, booking, album, ai-preview, login, my-gallery, admin, api)
  components/     navbar, footer, hero, gallery, forms, ...
  lib/            site config, supabase clients, packages/photos data
  middleware.ts   protects /admin and /my-gallery
supabase/
  schema.sql      tables, RLS policies, seed packages
public/
  thanu.jpg       studio logo (add music.mp3 here for album music)
```
