# GitHub and Vercel

## Verify locally

Use Node.js 24 and npm. From the repository root:

```sh
npm ci --prefix frontend
npm ci --prefix backend
npm ci --prefix backend/local-ai
npm run build
npm test
npm run lint
```

The local AI dependencies are required for the full test suite. Downloading the
model weights is optional and is not part of CI or Vercel deployment.
The nested lockfiles are committed; the root package has no dependencies.

## Push to GitHub

Create an empty GitHub repository, then run from this folder:

```sh
git add .
git diff --cached --stat
git commit -m "Prepare UmvaLearn for deployment"
git remote add origin https://github.com/YOUR-ACCOUNT/UmvaLearn.git
git push -u origin main
```

Review staged files before committing. Environment files, dependencies, build
output, Vercel metadata, and downloaded model weights are ignored.

## Import into Vercel

1. Import the GitHub repository and keep **Root Directory** at the repository root (`.`).
2. Use Node.js **24.x**. Root `vercel.json` supplies install/build commands and
   `frontend/dist` as the output directory. Do not select `frontend` as the root:
   its standalone config only serves the UI.
3. Add the values listed in `.env.production.example` to Production and Preview
   environments. `VITE_*` values are public and embedded at build time. Keep all
   provider keys server-side. Leave `VITE_API_URL` empty for same-origin APIs.
4. Set `TRANSLATION_PROVIDER=openai` with a funded key, or explicitly choose
   `mymemory` / `auto`. The development default `local` points to loopback and
   cannot reach your computer from Vercel. To retain local-model translation,
   host the model service separately and configure `LOCAL_AI_URL` to its reachable
   URL; review that service's access controls before exposing it.
5. Apply all SQL migrations in `backend/supabase/migrations/` in filename order.
   In Supabase Auth, set the Site URL to the deployed origin and allow the app's
   `/auth/callback` URL for each intended deployment origin.
   Password reset emails use `/auth/callback?flow=recovery`; allow that redirect
   URL as well. The callback completes the session and opens `/auth/update-password`.
6. Deploy. Later pushes to the production branch trigger deployments.

Root `api/*.mjs` functions call the existing backend handlers compiled by the
build. SPA routes fall back to `index.html`; `/api` routes remain server routes.

## Verify the deployment

### Admin user management

The `/admin` workspace has its own layout, separate from the learning-site
header and footer. To enable its **Users** section, apply
`backend/supabase/migrations/005_admin_user_management.sql` in the Supabase SQL
editor, after migrations 001–004, then refresh the Users section.

All active administrators can search registered accounts and edit learner
profiles. Only active super administrators can change system roles or edit
another administrator. Own-role changes are blocked, the final super admin is
protected, and changes are written to a restricted audit log. Email addresses
and authentication records are read-only; no service-role key is sent to the
browser. No one receives a role by opening the admin page.

Search is debounced, queries are cancelled when superseded, and pagination is
performed in PostgreSQL (20 accounts per page). The SQL functions authorize the
caller on every read and write and expose a restricted set of account fields.
The migration is covered by isolated PostgreSQL integration tests.

Security reference: [Supabase database function security](https://supabase.com/docs/guides/database/functions).

### Smoke checks

- Open `/`, then refresh a nested route such as `/translate`.
- Sign in and verify the auth callback and saved library/history.
- Open `/admin`: verify no learning-site header/footer is shown. Check Users
  search, paging, profile changes, and audit history with an administrator account.
  Verify a normal user is denied and a regular admin cannot grant roles.
- POST JSON to `/api/translate` with `{"text":"Hello","sourceLang":"en","targetLang":"en"}`;
  expect HTTP 200 with `provider: "passthrough"` without provider charges.
- Test a short translation, speech generation, transcription, and explanation
  with the configured providers. Missing credentials should produce JSON errors.
- Inspect Vercel function logs for provider/configuration failures.

Vercel Functions limit request and response bodies to 4.5 MB, including base64
encoding. Keep audio uploads below roughly 3 MB and generated audio short;
the backend's larger local audio limit does not override the hosting limit.
Long audio needs a storage/upload workflow. Functions allow 120 seconds here;
the persistent CPU model is excluded from deployment.

The AI routes currently allow unauthenticated requests, so public use can incur
provider charges. Keep previews protected and configure provider spending limits
before sharing a deployment. App authentication does not enforce API access.

References: [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json),
[Function limits](https://vercel.com/docs/functions/limitations).
