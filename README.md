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
2. Run [supabase/schema.sql](/Users/altayatik/Desktop/rentycar/supabase/schema.sql).
3. Run [supabase/seed.sql](/Users/altayatik/Desktop/rentycar/supabase/seed.sql).
4. In Supabase Auth settings, disable public signups.

The app presents username/password login, mapped internally to pseudo-emails:

```text
admin -> admin@rentycar.local
demo -> demo@rentycar.local
```

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
- Reports are soft-deleted with `deleted_at`; frontend code does not hard-delete reports.

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
