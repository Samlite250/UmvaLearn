# UmvaLearn

For GitHub push and full-stack Vercel deployment, follow [DEPLOYMENT.md](DEPLOYMENT.md).
Deploy from the repository root so the frontend and `/api` functions are included.

> **Your multilingual study assistant.**  
> *Soma, umva, usobanukirwe.* — Read, listen, understand.

UmvaLearn helps Rwandan students convert text to speech, transcribe audio, translate across English / French / Kinyarwanda, and get level-appropriate explanations.

---

## Workspace Structure

```
UmvaLearn/
├── frontend/          React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/    UI + layout + auth components
│   │   ├── pages/         Welcome, Home, TTS, STT, Translate, Library, History, Auth
│   │   ├── hooks/         useTranslation, useAuth, useToast
│   │   ├── store/         Zustand app store (level, language, welcome seen)
│   │   ├── i18n/          Locale strings (en, fr, rw)
│   │   ├── lib/           Supabase client, types, utils
│   │   └── router.tsx     React Router v7 SPA routes
│   ├── .env.example
│   └── vercel.json
│
└── backend/           Node.js Vercel-compatible server functions
    ├── src/
    │   ├── providers/   translation.ts | tts.ts | stt.ts | explanation.ts
    │   └── routes/      translate.ts | tts.ts | stt.ts | explain.ts
    ├── supabase/
    │   └── migrations/  001_initial_schema.sql
    └── docs/
        └── providers.md  AI capability matrix
```

---

## Quick Start (Local Development)

### 1. Frontend

```bash
cd frontend
cp .env.example .env
# Fill in your values (Supabase URL, anon key, etc.)
npm install
npm run dev
# → http://localhost:5173
```

### 2. Backend (optional — AI features)

The frontend works without the backend in read-only guest mode.  
To enable AI APIs:

```bash
cd backend
npm install
# Set environment variables in your shell or .env
npm run dev
```

---

## Environment Variables

Copy `frontend/.env.example` to `frontend/.env` and set:

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | For auth | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For auth | Supabase anon public key |
| `GOOGLE_CLOUD_API_KEY` | For AI | Google Cloud (server-side only) |
| `OPENAI_API_KEY` | Optional | For level explanations |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin only | Never expose to frontend |

---

## Supabase Setup

1. Create a project at https://supabase.com
2. Run the migration in the Supabase SQL editor:
   ```
   backend/supabase/migrations/001_initial_schema.sql
   ```
3. Enable Email auth under Authentication → Providers
4. Set Redirect URL to `https://umvalearn.com/auth/callback` (or localhost)

### Creating the First Administrator

> ⚠️ Never self-assign admin via the UI — this is server-enforced.

1. Sign up normally through the app
2. In Supabase SQL editor (as service role):
   ```sql
   INSERT INTO public.admin_roles (user_id, role, is_active)
   VALUES ('<your-user-uuid>', 'super_admin', true);
   ```
3. Sign in and visit `https://umvalearn.vercel.app/admin` (or `/admin` locally).
   The dashboard provides read-only activity, feedback, and administrator-role
   views. Access is checked through `is_active_admin()` and database RLS.
   Apply migrations 001–004 before using it. No role is granted by the website.

---

## Vercel Deployment

```bash
vercel deploy
```

Set environment variables in Vercel dashboard (not in code).  
Use the repository root as the Vercel project root and follow
[DEPLOYMENT.md](DEPLOYMENT.md) for production provider and Supabase settings.
`GOOGLE_CLOUD_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must be **server-only** — do NOT prefix with `VITE_`.

---

## AI Providers & Kinyarwanda

See `backend/docs/providers.md` for the full capability matrix.

**Current setup**: local NLLB translation supports English, French, and Kinyarwanda without API credits. Speech still uses external providers: ElevenLabs for English/French output, Pindo for Kinyarwanda input/output, and OpenAI for English/French transcription and explanations.

---

## Build & Type Check

```bash
cd frontend
npm run build        # Production bundle
npx tsc --noEmit     # Type check
npm run lint         # Lint
```

---

## License

© UmvaLearn. All rights reserved. Not for redistribution without permission.


### Speech and translation checks

- Text to Speech: select the input language and output language, enter text, then Generate Audio. Different languages translate the text before generating speech.
- Speech to Text: record or upload audio, transcribe it, then select Listen in and Generate spoken output. The transcript stays editable; translated spoken text appears separately.
- Translate: type text or use Record speech / Upload audio. Generate spoken output under the translation to listen. Playback uses the browser audio controls.
- English and French speech use ElevenLabs. Kinyarwanda speech generation and transcription use Pindo VoiceAI, with public rate-limited access by default. Set backend `PINDO_ACCESS_TOKEN` for authenticated access. Translation between English, French, and Kinyarwanda now runs locally by default.
- Explanations and English/French transcription require a funded OpenAI API account. Local translation does not. English/French speech generation requires ElevenLabs access. An OpenAI credit failure returns HTTP 402 with `openai_quota_exhausted`; automatic translation pauses until the user retries. Add API credits at https://platform.openai.com/settings/organization/billing/ to restore these features. Restart the backend after changing credentials. The React DevTools console message is informational.
- Run `npm --prefix backend test` for the mocked transcription ? translation ? speech regression test, and `npm --prefix frontend run build` for the frontend production check. Microphone permissions and audible output also require a manual browser check.

Provider reference: [Pindo TTS](https://docs.pindo.ai/docs/ai/tts), [Pindo STT](https://docs.pindo.ai/docs/ai/stt), and [OpenAI API errors](https://developers.openai.com/api/docs/guides/error-codes).


### Local translation without API credits

Translation runs on this computer with a quantized NLLB-200 model. It needs a one-time model download and then works offline, without OpenAI credits or public translation quotas. Speech and explanations remain separate external services; they are not made offline by this change.

From the project root:

```powershell
npm run local:install
npm run local:download
npm run dev
```

`npm run dev` starts the local model on loopback port 3003, the API on port 3002, and the frontend. Stop existing development servers first if the ports are occupied. The model loads before it accepts translations; its status is available at `http://127.0.0.1:3003/health`. Loading and CPU inference can take time on an 8 GB computer. Translation starts on the Translate button by default; typing-triggered translation is optional.

Backend configuration in `backend/.env`:

```dotenv
TRANSLATION_PROVIDER=local
LOCAL_AI_URL=http://127.0.0.1:3003
```

The local adapter reports startup/connection errors and never falls back to a paid or public API. `openai`, `mymemory`, and `auto` remain optional explicit provider settings. `auto` uses OpenAI and falls back to MyMemory only when the key is missing or unfunded.

The model files are cached in `backend/local-ai/models/` and excluded from source control. The service disables remote model access after installation. Requests stay on this computer. Long text is split into short chunks; all automatic translations still need review, particularly Kinyarwanda. Have a fluent speaker review representative study material before relying on the output.

NLLB-200 weights use **CC-BY-NC-4.0**, a noncommercial license; this setup is for a noncommercial prototype. Model card: https://huggingface.co/facebook/nllb-200-distilled-600M . Runtime/export: https://huggingface.co/Xenova/nllb-200-distilled-600M . This service requires a persistent process and cannot run inside a static frontend or typical short-lived serverless function.
