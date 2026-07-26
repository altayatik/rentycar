# RentyCar

RentyCar is "Flighty for rental cars": a public rental-car intelligence site for airport rental-car reports, airport/company search, and a static US + Canada report-density atlas.

## Tech Stack

- React, Vite, TypeScript
- Tailwind CSS
- React Router with basename `/rentycar`
- Supabase Auth and Postgres
- Zod validation
- Static SVG US + Canada region map
- GitHub Actions deploy to GitHub Pages

## Local Setup

```bash
cd /Users/altayatik/Desktop/rentycar
npm install
```

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://rxvwddwzqfoxxfcibvmd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_GbZ-cvPMR1-f1emlJk4f-w_8EWwHY1i
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_GbZ-cvPMR1-f1emlJk4f-w_8EWwHY1i
```

The publishable key is safe for browser use. Never put a Supabase service role key in Vite env vars or frontend code.

Start the app:

```bash
npm run dev
```

## Supabase Setup

1. Open the Supabase SQL editor for `https://rxvwddwzqfoxxfcibvmd.supabase.co`.
2. Run `supabase/schema.sql`.
3. Run `supabase/seed.sql`.
4. **Run `supabase/migrations/0001_open_signup_and_admin.sql`.** Required — without it,
   signup, the approval queue, and the whole admin panel will not work.
5. In Supabase Auth settings, **enable** public signups (the app gates access itself
   via the approval queue) and turn **off** "Confirm email".
6. If your admin account is not called `master`, edit the last statement of the
   migration to match your username before running it.

### Accounts and login

Signup is open. New accounts land in `pending` and cannot submit reports until an
admin approves them in **Admin → Members**. A valid invite code approves instantly.

Login identity depends on whether an email was given at signup:

```text
no email  ->  username        (internally <username>@rentycar.local)
email     ->  the email address itself
```

The login screen accepts either. If someone types a username belonging to an
email-login account, the app asks for the email instead — it never discloses the
address, so the public username list can't be used to harvest emails.

### Password reset

Reset works only for accounts that supplied an email. It uses Supabase's built-in
mailer, so enable an SMTP sender under Auth → Emails if the default rate limit
becomes a problem. Accounts with no email have no self-service recovery; an admin
has to reset them.

## Demo Users

Create `.env.admin` from `.env.admin.example`:

```env
SUPABASE_URL=https://rxvwddwzqfoxxfcibvmd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
```

Paste your service role key locally only. Do not commit it.

After Supabase SQL is run, create verified demo users and seed test reports:

```bash
npm run create-demo-users
npm run seed-demo-reports
npm run dev
```

Or run the full demo setup:

```bash
npm run demo:setup
npm run dev
```

Demo login:

```text
admin / RentyCarAdmin123!
demo / RentyCarDemo123!
```

The user script creates or updates Supabase Auth users, forces the demo passwords, confirms email where supported, upserts matching `profiles` rows, and verifies login with the publishable browser key. The report script deletes previous QA demo reports and seeds 20 fresh reports across US and Canadian airports.

## Data Setup

Reference data lives in:

- [src/data/reference/airports.ts](/Users/altayatik/Desktop/rentycar/src/data/reference/airports.ts)
- [src/data/reference/rentalCompanies.ts](/Users/altayatik/Desktop/rentycar/src/data/reference/rentalCompanies.ts)
- [src/data/reference/vehicleCatalog.ts](/Users/altayatik/Desktop/rentycar/src/data/reference/vehicleCatalog.ts)
- [src/data/reference/regions.ts](/Users/altayatik/Desktop/rentycar/src/data/reference/regions.ts)
- [src/data/reference/dataSources.md](/Users/altayatik/Desktop/rentycar/src/data/reference/dataSources.md)

Run `supabase/seed.sql` after `schema.sql` to load airports, rental companies, car makes, and car models.

## GitHub Pages Deployment

The app is configured for:

```text
https://altayatik.com/rentycar/
```

Vite uses `base: "/rentycar/"`, and React Router uses `basename: "/rentycar"`.

GitHub Actions needs these repository secrets:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_PUBLISHABLE_KEY
```

Use GitHub Pages with GitHub Actions as the Pages source. The workflow builds `dist` and includes an SPA fallback for direct route refreshes.

## Security Notes

- GitHub Pages is static and cannot host server-side code.
- Frontend code uses only public Supabase browser keys.
- Service role keys are local/server-side only.
- Row Level Security is enabled on app tables.
- Public views do not expose reporter IDs.
- Reports are soft-deleted with `deleted_at`; admins can restore them.
- Admin actions run through `SECURITY DEFINER` RPCs that re-check `is_admin()`
  server-side, so a tampered client cannot escalate.
- A database trigger stops users from editing their own `role`, `status`, or
  `username`, even though they can now edit their own profile row.

### Fixed in migration 0001

- Users could never delete their own reports. The UPDATE policy's `WITH CHECK`
  required `deleted_at is null`, so writing a delete timestamp was always rejected —
  silently, because PostgREST returns no error for a policy-filtered update.
- Users could never edit their own nickname; only admins could update `profiles`.
- `INSERT`/`UPDATE` on `airports`, `rental_companies`, `car_makes`, and `car_models`
  were granted to every authenticated user. RLS still blocked them, but the grants
  were wider than intended.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run create-demo-users
npm run seed-demo-reports
npm run demo:setup
```
