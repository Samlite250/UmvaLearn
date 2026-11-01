import assert from 'node:assert/strict'
import { test } from 'node:test'
import { translateText } from '../dist/providers/translation.js'

test('local provider uses loopback, validates output, and never falls back to paid services', async () => {
    const originalFetch = globalThis.fetch
    const originalProvider = process.env.TRANSLATION_PROVIDER
    process.env.TRANSLATION_PROVIDER = 'local'
    let calls = 0
    globalThis.fetch = async (url, init) => {
        calls++
        assert.equal(String(url), 'http://127.0.0.1:3003/translate')
        assert.equal(JSON.parse(init.body).targetLang, 'rw')
        return Response.json({ translatedText: 'Muraho', provider: 'local/nllb-200' })
    }
    try {
        assert.equal((await translateText({ text: 'Hello', sourceLang: 'en', targetLang: 'rw' })).translatedText, 'Muraho')
        assert.equal(calls, 1)
        globalThis.fetch = async () => { throw new TypeError('fetch failed') }
        await assert.rejects(translateText({ text: 'Hello', sourceLang: 'en', targetLang: 'rw' }), e => e.status === 503 && e.code === 'local_translation_unavailable')
        globalThis.fetch = async () => Response.json({ error: 'Model loading' }, { status: 503 })
        await assert.rejects(translateText({ text: 'Hello', sourceLang: 'en', targetLang: 'rw' }), /Model loading/)
    } finally {
        globalThis.fetch = originalFetch
        if (originalProvider === undefined) delete process.env.TRANSLATION_PROVIDER; else process.env.TRANSLATION_PROVIDER = originalProvider
    }
})
