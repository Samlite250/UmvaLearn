import assert from 'node:assert/strict'
import { test } from 'node:test'
import { handleTTS } from '../dist/routes/tts.js'
import { handleTranslate } from '../dist/routes/translate.js'
import { handleSTT } from '../dist/routes/stt.js'

const request = (path, body) => new Request(`http://localhost/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

test('typed and transcribed text translate before speech synthesis', async () => {
    const originalProvider = process.env.TRANSLATION_PROVIDER
    process.env.TRANSLATION_PROVIDER = 'openai'
    const originalFetch = globalThis.fetch
    const originalOpenAI = process.env.OPENAI_API_KEY
    const originalEleven = process.env.ELEVENLABS_API_KEY
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.ELEVENLABS_API_KEY = 'test-key'
    const speechTexts = []
    globalThis.fetch = async (url, init) => {
        const endpoint = String(url)
        if (endpoint.includes('/audio/transcriptions')) {
            assert.ok(init?.body instanceof FormData)
            assert.equal(init.body.get('language'), 'en')
            return Response.json({ text: 'Hello world' })
        }
        if (endpoint.includes('/chat/completions')) {
            const body = JSON.parse(String(init?.body))
            assert.equal(body.messages[1].content, 'Hello world')
            assert.match(body.messages[0].content, /English to French/)
            return Response.json({ choices: [{ message: { content: 'Bonjour le monde' } }] })
        }
        assert.match(endpoint, /elevenlabs.io/)
        const body = JSON.parse(String(init?.body))
        speechTexts.push(body.text)
        return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } })
    }
    try {
        for (const spokenInput of [false, true]) {
            let text = 'Hello world'
            if (spokenInput) {
                const response = await handleSTT(request('stt', { audioBase64: 'AQID', mimeType: 'audio/webm', language: 'en' }))
                assert.equal(response.status, 200)
                text = (await response.json()).transcript
            }
            const translated = await handleTranslate(request('translate', { text, sourceLang: 'en', targetLang: 'fr' }))
            assert.equal(translated.status, 200)
            const translatedText = (await translated.json()).translatedText
            const audio = await handleTTS(request('tts', { text: translatedText, language: 'fr' }))
            assert.equal(audio.status, 200)
            assert.equal((await audio.json()).audioBase64, 'AQID')
        }
        assert.deepEqual(speechTexts, ['Bonjour le monde', 'Bonjour le monde'])
        const invalid = await handleTTS(request('tts', { text: '', language: 'en' }))
        assert.equal(invalid.status, 422)
        const same = await handleTranslate(request('translate', { text: 'Hello', sourceLang: 'en', targetLang: 'en' }))
        assert.equal((await same.json()).translatedText, 'Hello')
    } finally {
        if (originalProvider === undefined) delete process.env.TRANSLATION_PROVIDER; else process.env.TRANSLATION_PROVIDER = originalProvider
        globalThis.fetch = originalFetch
        if (originalOpenAI === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalOpenAI
        if (originalEleven === undefined) delete process.env.ELEVENLABS_API_KEY; else process.env.ELEVENLABS_API_KEY = originalEleven
    }
})
