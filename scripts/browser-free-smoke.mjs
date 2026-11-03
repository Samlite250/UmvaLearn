import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.UMVA_PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
const failures = []
page.on('pageerror', error => failures.push(error.message))
page.on('crash', () => { console.error('Browser renderer ran out of resources during model loading.'); process.exitCode = 1; void browser.close() })
page.on('response', response => { if (response.url().includes('/resolve/')) console.log('Model file:', response.status(), response.url().split('/').pop()?.split('?')[0]) })
page.on('requestfailed', request => console.log('Request failed:', request.url().split('?')[0], request.failure()?.errorText))
let paidRequests = 0
page.on('request', request => {
    if (/\/api\/(tts|stt|translate)(?:\?|$)/.test(request.url())) paidRequests++
})
try {
    await page.addInitScript(() => {
        window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
        const voice = { lang: 'en-US', name: 'Test English voice', default: true, localService: true, voiceURI: 'test' }
        Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
            getVoices: () => [voice], cancel() {},
            speak(utterance) { window.__spokenText = utterance.text; setTimeout(() => utterance.onend?.(), 20) },
        } })
    })
    const base = process.env.UMVA_PREVIEW_URL || 'http://127.0.0.1:4173'
    await page.goto(`${base}/tools/tts`)
    await page.getByRole('textbox', { name: 'Text to convert to speech' }).fill('Hello students')
    await page.getByRole('button', { name: 'Generate Audio', exact: true }).click()
    await page.getByRole('button', { name: 'Play speech', exact: true }).click()
    await page.waitForFunction(() => window.__spokenText === 'Hello students')
    assert.equal(paidRequests, 0)
    console.log('PASS: device speech playback without a paid API request')

    if (process.env.UMVA_SPEECH_SAMPLE) {
        await page.goto(`${base}/tools/stt`)
        await page.locator('input[type=file]').setInputFiles(process.env.UMVA_SPEECH_SAMPLE)
        await page.getByRole('button', { name: 'Transcribe', exact: true }).click()
        await page.waitForFunction(() => document.querySelector('[aria-label="Editable transcript"]') || document.querySelector('[role="alert"]'), undefined, { timeout: 240000 })
        const transcript = await page.getByRole('textbox', { name: 'Editable transcript' }).inputValue()
        assert.match(transcript, /hello|students|english|lesson/i)
        assert.equal(paidRequests, 0)
        console.log('PASS: real on-device English transcription:', transcript)
    }

    if (process.env.UMVA_SMOKE_ONLY !== 'speech') {
    const from = process.env.UMVA_TRANSLATION_FROM || 'en'
    const to = process.env.UMVA_TRANSLATION_TO || 'fr'
    const sample = process.env.UMVA_TRANSLATION_TEXT || 'The students read their books at school.'
    await page.goto(`${base}/tools/translate`)
    const selects = page.locator('select')
    await selects.nth(0).selectOption(from)
    await selects.nth(1).selectOption(to)
    await page.locator('textarea').first().fill(sample)
    await page.getByRole('button', { name: 'Translate', exact: true }).click()
    const heartbeat = setInterval(() => { void page.locator('[role="status"]').allTextContents().then(values => console.log('Translation status:', values.join(' '))).catch(() => {}) }, 30000)
    try {
        await page.waitForFunction(() => document.querySelectorAll('textarea').length > 1 || document.querySelector('[role="alert"]'), undefined, { timeout: 600000 })
    } finally { clearInterval(heartbeat) }
    const alert = await page.locator('[role="alert"]').allTextContents()
    assert.deepEqual(alert, [], `Translation failed: ${alert.join(' ')}`)
    const translated = await page.locator('textarea').nth(1).inputValue()
    assert.ok(translated.trim())
    assert.notEqual(translated, sample)
    assert.equal(paidRequests, 0)
    assert.deepEqual(failures, [])
    console.log(`PASS: real ${from} → ${to} website translation:`, translated)
    }
} finally { await browser.close() }
