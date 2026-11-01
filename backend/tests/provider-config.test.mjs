import assert from 'node:assert/strict'
import { test } from 'node:test'
import { handleTranslate } from '../dist/routes/translate.js'
import { handleSTT } from '../dist/routes/stt.js'
import { handleTTS } from '../dist/routes/tts.js'
const request = (body) => new Request('http://localhost/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

test('OpenAI credit failures report 402 and stop automatic retries', async () => {
    const originalFetch = globalThis.fetch
    const translationProvider = process.env.TRANSLATION_PROVIDER
    process.env.TRANSLATION_PROVIDER = 'openai'
    const key = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'test-key'
    globalThis.fetch = async () => Response.json({ error: { code: 'credit_balance_exhausted', type: 'insufficient_quota' } }, { status: 429 })
    try {
        for (const [handler, body] of [
            [handleTranslate, { text: 'Hello', sourceLang: 'en', targetLang: 'rw' }],
            [handleSTT, { audioBase64: 'AQID', mimeType: 'audio/wav', language: 'en' }],
        ]) {
            const res = await handler(request(body))
            assert.equal(res.status, 402)
            const data = await res.json()
            assert.equal(data.code, 'openai_quota_exhausted')
            assert.equal(data.retryable, false)
            assert.match(data.error, /credits/)
        }
        globalThis.fetch = async () => Response.json({ error: { code: 'rate_limit_exceeded' } }, { status: 429 })
        const limited = await handleTranslate(request({ text: 'Hello', sourceLang: 'en', targetLang: 'rw' }))
        assert.equal(limited.status, 429)
        assert.equal((await limited.json()).retryable, true)
    } finally {
        if (translationProvider === undefined) delete process.env.TRANSLATION_PROVIDER; else process.env.TRANSLATION_PROVIDER = translationProvider
        globalThis.fetch = originalFetch
        if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key
    }
})

test('Kinyarwanda uses Pindo for audio and transcription without OpenAI credits', async () => {
    const originalFetch = globalThis.fetch
    const key = process.env.OPENAI_API_KEY
    const token = process.env.PINDO_ACCESS_TOKEN
    delete process.env.OPENAI_API_KEY
    delete process.env.PINDO_ACCESS_TOKEN
    globalThis.fetch = async (url, init) => {
        const endpoint = String(url)
        if (endpoint.includes('/ai/tts/rw/public')) {
            assert.equal(JSON.parse(init.body).text, 'Muraho')
            return Response.json({ data: { generated_audio_url: 'https://test.s3.af-south-1.amazonaws.com/audio.wav' }, error: null })
        }
        if (endpoint.includes('/ai/stt/rw/public')) {
            assert.ok(init.body instanceof FormData)
            assert.equal(init.body.get('audio').type, 'audio/wav')
            assert.equal(init.body.get('audio').name, 'audio.wav')
            return Response.json({ data: { text: 'Muraho' }, error: null })
        }
        assert.match(endpoint, /amazonaws.com/)
        return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'application/octet-stream' } })
    }
    try {
        const audio = await handleTTS(request({ text: 'Muraho', language: 'rw' }))
        assert.equal(audio.status, 200)
        const data = await audio.json()
        assert.equal(data.provider, 'pindo/tts/rw')
        assert.equal(data.audioMimeType, 'audio/wav')
        const transcript = await handleSTT(request({ audioBase64: data.audioBase64, mimeType: data.audioMimeType, language: 'rw' }))
        assert.equal(transcript.status, 200)
        assert.equal((await transcript.json()).transcript, 'Muraho')
    } finally {
        globalThis.fetch = originalFetch
        if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key
        if (token === undefined) delete process.env.PINDO_ACCESS_TOKEN; else process.env.PINDO_ACCESS_TOKEN = token
    }
})
