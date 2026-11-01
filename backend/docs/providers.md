# UmvaLearn AI providers

| Capability | Current provider | Credits / connectivity |
|---|---|---|
| English/French/Kinyarwanda translation | Local quantized NLLB-200 | No API credits; offline after model download |
| English/French speech-to-text | OpenAI whisper-1 | Funded API account and internet required |
| Kinyarwanda speech-to-text | Pindo | Public rate-limited access; internet required |
| English/French text-to-speech | ElevenLabs | Account access/credits and internet required |
| Kinyarwanda text-to-speech | Pindo | Public rate-limited access; internet required |
| Explanations | OpenAI | Funded API account and internet required |

## Local translation

`TRANSLATION_PROVIDER=local` calls `LOCAL_AI_URL=http://127.0.0.1:3003`.
The local adapter never silently falls back to an external provider.
Run `npm run local:install`, `npm run local:download`, then `npm run dev` from the project root.
The model cache is in `backend/local-ai/models/`. Only the initial download needs internet.
Health/loading status: `http://127.0.0.1:3003/health`.

The quantized model is `Xenova/nllb-200-distilled-600M`, with language codes `eng_Latn`, `fra_Latn`, and `kin_Latn`.
The source weights have a CC-BY-NC-4.0 noncommercial license. This is a noncommercial prototype setup.
See https://huggingface.co/facebook/nllb-200-distilled-600M .

Six directions were exercised through the local frontend proxy using study-sentence samples.
Short greetings sometimes produced poor results. Kinyarwanda and other automatic translations require fluent-speaker review.
A successful HTTP response does not certify translation quality.

## Optional external translation

Explicit provider settings `openai`, `mymemory`, and `auto` remain available.
`auto` falls back to MyMemory when OpenAI is missing or unfunded.
MyMemory has public usage limits and demonstrated poor Kinyarwanda quality on some samples.

Speech and explanations are not made offline by local translation.
Pindo accepts optional backend `PINDO_ACCESS_TOKEN`; absent a token, public rate-limited endpoints are used.
Provider keys remain backend-only. Google Cloud is not used.
