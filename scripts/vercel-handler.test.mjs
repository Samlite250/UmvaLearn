import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import translate from '../api/translate.mjs'

async function invoke(method, body, raw = false) {
  const req = Readable.from(raw ? [JSON.stringify(body)] : [])
  Object.assign(req, { method, url: '/api/translate', headers: { 'content-type': 'application/json' } })
  if (!raw && body !== undefined) req.body = body
  const res = { headers: {}, setHeader(key, value) { this.headers[key] = value }, end(value) { this.body = JSON.parse(value.toString()) } }
  await translate(req, res)
  return res
}

test('Vercel entry point accepts parsed and streamed JSON and preserves status', async () => {
  for (const raw of [false, true]) {
    const res = await invoke('POST', { text: 'Hello', sourceLang: 'en', targetLang: 'en' }, raw)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.translatedText, 'Hello')
    assert.equal(res.body.provider, 'passthrough')
    assert.match(res.headers['content-type'], /application\/json/)
  }
  assert.equal((await invoke('GET')).statusCode, 405)
  assert.equal((await invoke('POST', {})).statusCode, 422)
  assert.equal((await invoke('POST', '{broken')).statusCode, 400)
})
