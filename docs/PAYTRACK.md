# PayTrack

PayTrack lives at `/paytrack` in the existing Next.js app. It tracks shifts, unpaid breaks, biweekly gross earnings, confirmed paychecks, and take-home estimates. Records and original paystub files sync through a private Supabase account. It does not fall back to local-only records when the backend is unavailable.

The Supabase connection and production verification are still pending. This change supplies the application, migration, and configuration example; it does not create an account, provision a project, or seed historical paychecks.

## Connect the private backend

1. Create or select your Supabase project. Run [`supabase/migrations/202610270001_paytrack.sql`](../supabase/migrations/202610270001_paytrack.sql) once in its SQL editor, or apply it through your normal Supabase migration workflow. It creates `paytrack_accounts`, the revision-checked `save_paytrack` function, a private `paytrack-stubs` bucket, and owner access policies. Do not make the bucket public.
2. In Supabase Auth, disable public user signup. Use the dashboard's administrative create/invite action to add your own email as the sole intended user. Complete any invitation flow. The app requests email sign-in with `shouldCreateUser: false`, so it cannot register a new account. Admin-created additional accounts would have their own separate records; remove any temporary test account after verification.
3. Enable email authentication and configure email delivery. For code-based sign-in, include `{{ .Token }}` in the Auth **Magic Link** email template. The UI accepts the emailed six-to-eight-digit code. You can also retain the normal magic-link URL in that template; opening it completes sign-in in the browser that follows the link.
4. Set Auth's **Site URL** to the production origin, for example `https://simplysnox.com`. Add the exact callback URLs `https://simplysnox.com/paytrack` and `http://localhost:3000/paytrack` to the allowed redirect URLs. Add the `/paytrack` callback for any other production hostname you actually use.
5. Copy `.env.example` to `.env.local` and set these public browser configuration values from the project's API settings:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
   ```

   Use a publishable key or legacy `anon` key. Never place a Supabase secret or `service_role` key in a `NEXT_PUBLIC_` variable, browser code, or the repository.
6. Add the same two variables to the existing site's hosting configuration, such as Vercel's project environment variables. Apply them to the deployment environments you use and redeploy: Next.js embeds these public values at build time. Restart `npm run dev` after changing `.env.local`.

Open `/paytrack`, request a sign-in email, then use the code or email link. Without valid configuration, the page shows setup instructions and does not load private records.

## Records, calculations, and limits

- The initial preferences use **$15.50/hour**, **$23.25/hour overtime**, and overtime after **40 hours in each workweek**. Sunday is an unconfirmed default workweek start. The initial biweekly anchor is the most recent Sunday when the account is created. Set both your employer's actual workweek start and the first day of a known pay period before relying on estimates. Overtime resets by workweek, independently of the 14-day pay period.
- Add shifts manually or use the saved clock-in/break/clock-out timer. Overnight shifts and timed unpaid breaks are split across week boundaries. A manually entered total break duration is distributed proportionally across the shift. Active-shift hours enter earnings after clock-out.
- Calendar boundaries and input/display times use the **device's local timezone**. Set every device to the work location's timezone for consistent results, including while traveling. There is currently no separately stored fixed work timezone.
- Historical take-home estimates use the ten most recent eligible paycheck records: `estimated gross × sum(net) / sum(gross)`. This gross-weighted history is a heuristic; it does not calculate tax withholding, benefit deductions, or the tax treatment of overtime. A custom take-home percentage is also available. With no history or custom percentage, take-home remains unknown.
- Paystub uploads accept PDF, JPEG, PNG, and WebP files up to 10 MiB. Original files are private. Enter gross and take-home totals yourself and confirm them against the attached paystub; there is no OCR or automatic extraction.
- JSON backups contain records, preferences, active timer state, and attachment references, **not the PDF/image files**. Download originals separately from Pay history. Restoring replaces records and preferences after review; it does not upload or delete storage objects. File references must belong to the signed-in account and still exist in that project's private bucket.

## Privacy and device sync

Database row-level security restricts reads and initial inserts to `auth.uid()`. Saves use an authenticated function that checks the expected user and record revision. Storage policies restrict access to objects inside that user's UUID folder. The public browser key alone does not grant access to private records or files.

The app reloads records when the browser regains focus. Saves are confirmed by the server; a stale revision is rejected instead of overwriting newer data from another device. If a conflict appears, reload the latest records, review the change, and reapply your edit. Unsaved form edits are not merged automatically. Sign-out clears the displayed account data in that browser.

## Verify

Use Node.js 22 or newer. Run from the repository root after installing dependencies:

```sh
npm ci
npx tsc --noEmit
npx tsc tests/paytrack.test.ts tests/paytrack-cloud.test.ts --target ES2022 --module commonjs --esModuleInterop --skipLibCheck --outDir /tmp/paytrack-tests
node /tmp/paytrack-tests/tests/paytrack.test.js
NODE_PATH="$PWD/node_modules" node /tmp/paytrack-tests/tests/paytrack-cloud.test.js
npm run build
```

The calculation tests cover weekly overtime, boundary weeks, overnight breaks, daylight-saving changes, weighted estimates, and backup validation. They do not establish that a deployed Supabase project is configured correctly.

After backend setup, complete these live checks:

1. Confirm an existing invited user can request a code, sign in, sign out, and sign in again. An unknown email must not create an account. Logged-out visitors must see no private data.
2. Save a shift, preferences, and a paycheck with an attachment; reload and confirm all records persist. Download the attachment and check the original file. Confirm its storage URL cannot be accessed anonymously.
3. Use two separate browser sessions for the same account. Confirm changes appear after focus/reload. Keep an edit open in both, save one, then submit the stale edit: the second must show a conflict. Reload and reapply it without losing the first change. Repeat with a running timer and a delayed attachment upload.
4. In a nonproduction test project, create a second test user and attempt direct database reads/inserts/saves and storage reads/uploads/deletes against the first user's UUID. Access must be denied or return no protected data. Verify each user can access their own records. Remove the test user afterward.
5. Export and restore a backup after reviewing the replacement warning. Confirm original attachments remain downloadable for their owner; restoring records alone must not create missing files. Test a rejected cross-account attachment reference.

Do not treat private sync as verified until these live checks pass against the configured backend and deployment.
