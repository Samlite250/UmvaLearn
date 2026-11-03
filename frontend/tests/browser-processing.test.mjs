import assert from 'node:assert/strict'
import { test } from 'node:test'
import { translateInBrowser, clearTranslationCache } from '../src/lib/browserTranslation.ts'
import { speechVoice, speak } from '../src/lib/browserSpeech.ts'

test('translation stays on-device, returns output, and terminates cancelled workers', async () => {
    const originalWorker = globalThis.Worker
    const originalFetch = globalThis.fetch
    const workers = []
    globalThis.fetch = () => { throw new Error('No text may be sent to an API') }
    globalThis.Worker = class {
        constructor() { this.terminated = false; workers.push(this) }
        postMessage(data) { this.input = data }
        terminate() { this.terminated = true }
    }
    try {
        assert.equal(await translateInBrowser('Hello', 'en', 'en'), 'Hello')
        assert.equal(workers.length, 0)
        let status = ''
        const pending = translateInBrowser('Hello', 'en', 'fr', undefined, value => { status = value })
        assert.deepEqual(workers[0].input, { text: 'Hello', from: 'en', to: 'fr' })
        workers[0].onmessage({ data: { status: 'Loading model' } })
        assert.equal(status, 'Loading model')
        assert.equal(workers[0].terminated, false)
        workers[0].onmessage({ data: { text: 'Bonjour' } })
        assert.equal(await pending, 'Bonjour')
        assert.equal(workers[0].terminated, false)
        const reused = translateInBrowser('Good morning', 'en', 'fr')
        assert.equal(workers.length, 1)
        workers[0].onmessage({ data: { text: 'Bonjour' } })
        assert.equal(await reused, 'Bonjour')
        const controller = new AbortController()
        const cancelled = translateInBrowser('Bonjour', 'fr', 'en', controller.signal)
        controller.abort()
        await assert.rejects(cancelled, { name: 'AbortError' })
        assert.equal(workers[1].terminated, true)
        await assert.rejects(translateInBrowser('Hello', 'en', 'fr', controller.signal), { name: 'AbortError' })
        assert.equal(workers.length, 2)
        const failed = translateInBrowser('Hello', 'en', 'fr')
        workers[2].onmessage({ data: { error: 'Model download failed' } })
        await assert.rejects(failed, /Model download failed/)
        assert.equal(workers[2].terminated, true)
    } finally { clearTranslationCache(); globalThis.Worker = originalWorker; globalThis.fetch = originalFetch }
})

test('speech chooses a matching language and passes playback settings to the device', async () => {
    const originalWindow = globalThis.window
    const originalUtterance = globalThis.SpeechSynthesisUtterance
    const voice = { lang: 'fr-FR', name: 'French device voice' }
    let utterance
    globalThis.window = { speechSynthesis: { getVoices: () => [voice], cancel() {}, speak(value) { utterance = value } } }
    globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
    try {
        assert.equal(await speechVoice('fr'), voice)
        assert.equal(await speechVoice('rw'), undefined)
        let ended = false
        speak('Bonjour', voice, () => { ended = true }, () => assert.fail('Unexpected speech error'), 1.25, 0.5)
        assert.equal(utterance.voice, voice)
        assert.equal(utterance.lang, 'fr-FR')
        assert.equal(utterance.rate, 1.25)
        assert.equal(utterance.volume, 0.5)
        utterance.onend()
        assert.equal(ended, true)
    } finally { globalThis.window = originalWindow; globalThis.SpeechSynthesisUtterance = originalUtterance }
})
