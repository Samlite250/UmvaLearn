import assert from 'node:assert/strict'
import { test } from 'node:test'
import { translationSegments } from '../dist/providers/mymemory.js'
import { translateText } from '../dist/providers/translation.js'

test('translation segments preserve text and respect UTF-8 byte limits', () => {
    for (const text of ['Bonjour '.repeat(300), '\u{1F600}'.repeat(400), 'a'.repeat(1200), 'Hello\nworld']) {
        const segments = translationSegments(text)
        assert.equal(segments.join(''), text)
        assert.ok(segments.every(s => Buffer.byteLength(s) <= 500))
    }
})

test('unfunded OpenAI falls back to MyMemory; quotas never become translated text', async () => {
    const originalFetch = globalThis.fetch
    const originalProvider = process.env.TRANSLATION_PROVIDER
    const originalKey = process.env.OPENAI_API_KEY
    process.env.TRANSLATION_PROVIDER = 'auto'
    process.env.OPENAI_API_KEY = 'test'
    const calls = []
    globalThis.fetch = async url => {
        calls.push(String(url))
        return String(url).includes('openai.com')
            ? Response.json({ error: { code: 'insufficient_quota' } }, { status: 429 })
            : Response.json({ responseStatus: 200, responseData: { translatedText: 'Muraho' } })
    }
    try {
        const result = await translateText({ text: 'Hello', sourceLang: 'en', targetLang: 'rw' })
        assert.equal(result.translatedText, 'Muraho')
        assert.equal(result.provider, 'mymemory')
        assert.equal(calls.length, 2)
        process.env.TRANSLATION_PROVIDER = 'mymemory'
        globalThis.fetch = async () => Response.json({ responseStatus: 429, quotaFinished: true, responseData: { translatedText: 'LIMIT EXCEEDED' } })
        await assert.rejects(translateText({ text: 'Hello', sourceLang: 'en', targetLang: 'rw' }), e => e.code === 'translation_quota_exhausted')
    } finally {
        globalThis.fetch = originalFetch
        if (originalProvider === undefined) delete process.env.TRANSLATION_PROVIDER; else process.env.TRANSLATION_PROVIDER = originalProvider
        if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey
    }
})
