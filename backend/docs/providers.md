# UmvaLearn AI providers

| Capability | Website provider | Requirements |
|---|---|---|
| English/French translation | Browser OPUS-MT worker | Free; first-use model download |
| Translation involving Kinyarwanda | MyMemory through /api/translate-free | Free online service; daily quota; text sent to MyMemory |
| English/French speech-to-text | Browser Whisper tiny worker | Free; first-use download; recordings and uploads supported |
| Kinyarwanda speech-to-text | Public Pindo | Internet; public usage limits |
| English/French text-to-speech | Matching device voice | Free; matching voice must be installed; playback only |
| Kinyarwanda text-to-speech | Matching device voice, otherwise public Pindo | Internet and usage limits for Pindo |
| Optional explanations | Existing OpenAI adapter | Funded API account; separate from free tools |

## Free website configuration

The user explicitly approved sending translation text to MyMemory for free online Kinyarwanda translation. The website calls /api/translate-free for translations involving rw. This route calls only the existing MyMemory adapter, ignoring TRANSLATION_PROVIDER, LOCAL_AI_URL, and paid API credentials. Exhausted quota returns an actionable error; there is no paid fallback.

MyMemory anonymous usage has a daily free allowance. See https://mymemory.translated.net/doc/usagelimits.php and https://mymemory.translated.net/doc/spec.php . Requests are split at the documented 500-byte limit. UI and privacy text disclose external processing. Kinyarwanda translations need fluent-speaker review; successful responses do not certify accuracy.

English/French translation uses Xenova/opus-mt-en-fr and Xenova/opus-mt-fr-en; transcription uses onnx-community/whisper-tiny. Model files download from Hugging Face. WebAssembly, enough device memory, and a network connection for first use are required. Browser cache retention depends on storage policy. Translation reuses one loaded worker for two idle minutes. Cancelled/failed workers terminate immediately; transcription workers terminate on completion.

Device speech has no audio-file export. Pindo-generated audio retains playback, save, and download controls. Pindo uses public endpoints unless optional backend PINDO_ACCESS_TOKEN is set. English/French website speech does not call paid /api/stt or /api/tts adapters. Direct API adapters and explanations remain available for compatibility and can require credits.

Run npm run dev to start the lightweight API and frontend together. The large local translation service no longer starts by default, avoiding observed memory failures. The free online route works with the existing Vercel serverless packaging; no local model server, bank card, or Google account is needed for that route.

## Optional local translation

The original NLLB service remains available for explicit local use. Run npm run local:install, npm run local:download, then node backend/local-ai/server.mjs. Alternatively set UMVA_LOCAL_TRANSLATION=1 before npm run dev to start it alongside the app.

Direct /api/translate clients can select TRANSLATION_PROVIDER=local with LOCAL_AI_URL=http://127.0.0.1:3003. Other original settings (openai, auto, mymemory) remain available to direct API clients. These settings do not change the website's free translation route.

The NLLB model is Xenova/nllb-200-distilled-600M, with eng_Latn, fra_Latn, and kin_Latn. Its source weights use CC-BY-NC-4.0: https://huggingface.co/facebook/nllb-200-distilled-600M . The existing setup is a noncommercial prototype. It translated a standalone sample, but full-stack browser/native tests exceeded available memory on this machine; the website therefore uses approved MyMemory instead.

## Verification

Run npm run build, npm test, and npm run lint.

scripts/browser-free-smoke.mjs checks device speech with a synthetic voice and real translation in headless Edge. Set UMVA_PLAYWRIGHT_MODULE to an installed Playwright module and UMVA_PREVIEW_URL to the running site (default port 4173). UMVA_TRANSLATION_FROM, UMVA_TRANSLATION_TO, and UMVA_TRANSLATION_TEXT choose sample inputs. UMVA_SPEECH_SAMPLE optionally tests a local audio upload; UMVA_SMOKE_ONLY=speech skips translation. Live tests use nonsensitive samples.

Regression tests confirm the free route never calls a paid provider and never returns quota messages as translated text.
