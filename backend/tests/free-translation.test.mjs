import assert from 'node:assert/strict'
import { test } from 'node:test'
import { handleFreeTranslate } from '../dist/routes/translate.js'
import { translateWithMyMemory } from '../dist/providers/mymemory.js'

test('free translation uses only approved MyMemory even when paid providers are configured', async () => {
    const originalFetch = globalThis.fetch
    const originalProvider = process.env.TRANSLATION_PROVIDER
    const originalUrl = process.env.LOCAL_AI_URL
    process.env.TRANSLATION_PROVIDER = 'openai'
    process.env.LOCAL_AI_URL = 'https://external.invalid'
    let calls = 0
    const request = () => new Request('http://localhost/api/translate-free', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Hello', sourceLang: 'en', targetLang: 'rw' }) })
    try {
        globalThis.fetch = async url => {
            calls++
            const endpoint = new URL(url)
            assert.equal(endpoint.origin, 'https://api.mymemory.translated.net')
            assert.equal(endpoint.pathname, '/get')
            assert.equal(endpoint.searchParams.get('q'), 'Hello')
            assert.equal(endpoint.searchParams.get('langpair'), 'en|rw')
            return Response.json({ responseStatus: 200, responseData: { translatedText: 'Muraho' } })
        }
        const response = await handleFreeTranslate(request())
        assert.equal(response.status, 200)
        const result = await response.json()
        assert.equal(result.translatedText, 'Muraho')
        assert.equal(result.provider, 'mymemory')
        assert.equal(calls, 1)
        globalThis.fetch = async url => {
            calls++
            assert.equal(new URL(url).origin, 'https://api.mymemory.translated.net')
            return Response.json({ responseStatus: 429, quotaFinished: true, responseData: { translatedText: 'LIMIT EXCEEDED' } })
        }
        const failed = await handleFreeTranslate(request())
        assert.equal(failed.status, 429)
        const error = await failed.json()
        assert.equal(error.retryable, false)
        assert.match(error.error, /daily usage limit/)
        assert.equal(error.translatedText, undefined)
        assert.equal(calls, 2)
    } finally {
        globalThis.fetch = originalFetch
        if (originalProvider === undefined) delete process.env.TRANSLATION_PROVIDER; else process.env.TRANSLATION_PROVIDER = originalProvider
        if (originalUrl === undefined) delete process.env.LOCAL_AI_URL; else process.env.LOCAL_AI_URL = originalUrl
    }
})

test('a transient free-provider error retries once and decoded punctuation remains plain text', async () => {
    const originalFetch = globalThis.fetch
    let calls = 0
    try {
        globalThis.fetch = async () => {
            calls++
            if (calls === 1) return new Response('temporarily unavailable', { status: 502 })
            return Response.json({ responseStatus: 200, responseData: { translatedText: 'L&#39;école &amp; les élèves &#x1F4DA;' } })
        }
        const result = await translateWithMyMemory({ text: 'School and students', sourceLang: 'rw', targetLang: 'fr' })
        assert.equal(result.translatedText, "L'école & les élèves 📚")
        assert.equal(calls, 2)
        calls = 0
        globalThis.fetch = async () => { calls++; return new Response('unavailable', { status: 502 }) }
        await assert.rejects(translateWithMyMemory({ text: 'Hello', sourceLang: 'en', targetLang: 'rw' }), error => error.code === 'translation_provider_error')
        assert.equal(calls, 2)
    } finally { globalThis.fetch = originalFetch }
})
