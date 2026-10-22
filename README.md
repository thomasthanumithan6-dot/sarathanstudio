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
| Customer login / logout / forgot password | Requires Supabase (works locally without it in clearly-labelled demo mode) |
| Private galleries + photo selection (draft → submitted → completed) | Requires Supabase + schema v2 |
| Admin dashboard (customers, galleries, photo upload, selections, bookings, packages) | Requires Supabase + an admin account |

## Environment variables (.env.local)

Copy `.env.example` to `.env.local` and fill in values. All secrets stay
server-side; only the `NEXT_PUBLIC_*` values are visible to the browser, and
none of them are secret keys.

## Supabase setup

1. Create a free project at https://supabase.com
2. Open **Project Settings -> API** and copy the Project URL and anon key into
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Open **SQL Editor -> New query**, paste the whole contents of
   [supabase/schema.sql](supabase/schema.sql), and run it. It is idempotent
   (safe to re-run) and creates:
   - tables: `profiles`, `customers` (auto IDs like `SRS-0001`), `galleries`,
     `photos`, `photo_selections`, `bookings`, `packages`
   - row-level-security policies on every table
   - the **private** storage bucket `customer-photos` with its access policies
   - the three sample packages
4. In **Authentication -> URL Configuration**, set Site URL to
   `http://localhost:3000` (needed for the password-reset email link).
5. Create your account: sign up on `/login`.
6. Make yourself an administrator — run this once in the SQL Editor with your
   own email:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   This SQL-editor step is the ONLY way to become admin; clients cannot set
   their own role (there is no client-writable path to `profiles.role`).
7. In `/admin`, create a **customer** record for each signed-up account, then
   create galleries and upload photos - files go to the private
   `customer-photos` bucket under `<gallery_id>/`.

### Private photo storage

Originals live only in the private `customer-photos` bucket. The site never
stores public URLs for them: pages mint **short-lived (5-minute) signed URLs**
server-side, and storage policies allow customers to read only files inside
their own gallery folders. The service-role key is never used in the browser.

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

- Row-level security is enabled on every table; customers can read only their
  own profile, customer record, galleries, photos and selections.
- Customers can insert/update/delete only their own **draft** selections, and
  only for photos in their own galleries. Submitted selections lock until an
  admin reopens them.
- Every admin server action re-checks `profiles.role = 'admin'` on the server;
  RLS independently blocks non-admin writes. Nothing is protected by hiding
  buttons or routes alone.
- `/admin` and `/my-gallery` require sign-in via middleware plus a server-side
  role check on the page itself.
- Password reset answers never reveal whether an email exists.
- No API keys or service-role keys appear in frontend code.
- **Not yet security-complete:** run the schema and then test the checklist
  below before using this with real customer photos.

## Test checklist (after running the schema)

1. Sign up two customer accounts (A and B) plus your admin account.
2. As admin: create customer records for A and B, create a gallery for A,
   upload 2 photos.
3. As customer A: the photos appear in `/my-gallery`; as customer B: they do
   NOT appear (isolation check).
4. As A: select photos, submit; confirm the selection locks. As admin: reopen
   it; as A: change and resubmit.
5. As A (signed in, in the browser console):
   `await supabase.from('profiles').update({role:'admin'}).eq('id', '<A id>')`
   must fail (role self-escalation blocked).
6. Try opening another customer's signed photo URL after 5 minutes - it must
   expire.

## Project structure

```
src/
  app/            pages (home, booking, album, ai-preview, login, reset-password,
                  my-gallery, admin, api)
  components/     navbar, footer, hero, gallery, forms, photo selector, ...
  components/admin/  customers, galleries, selections, bookings, packages sections
  lib/            site config, supabase clients, demo auth, packages/photos data
  middleware.ts   protects /admin and /my-gallery
supabase/
  schema.sql      tables, RLS policies, storage bucket + policies, seed packages
public/
  thanu.jpg       studio logo (add music.mp3 here for album music)
```
