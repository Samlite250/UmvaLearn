import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readApiResponse } from '../src/lib/apiResponse.ts'

test('empty and truncated responses produce actionable errors', async () => {
    await assert.rejects(readApiResponse(new Response('', { status: 502 })), /empty response.*HTTP 502.*backend/)
    await assert.rejects(readApiResponse(new Response('{"translatedText":', { status: 200 })), /invalid response.*HTTP 200/)
    await assert.rejects(readApiResponse(new Response('<html>Bad Gateway</html>', { status: 502 })), /invalid response.*HTTP 502/)
    await assert.rejects(readApiResponse(new Response(null, { status: 204 })), /empty response.*HTTP 204/)
})

test('API errors remain available and successful payloads must contain their output', async () => {
    const billing = { error: 'No API credits remaining.', code: 'openai_quota_exhausted', retryable: false }
    assert.deepEqual(await readApiResponse(Response.json(billing, { status: 402 }), ['translatedText']), billing)
    assert.equal((await readApiResponse(Response.json({ translatedText: 'Muraho' }), ['translatedText'])).translatedText, 'Muraho')
    await assert.rejects(readApiResponse(Response.json({}), ['audioBase64', 'audioMimeType']), /incomplete/)
    await assert.rejects(readApiResponse(Response.json(null)), /invalid response/)
    await assert.rejects(readApiResponse(Response.json([])), /invalid response/)
})
