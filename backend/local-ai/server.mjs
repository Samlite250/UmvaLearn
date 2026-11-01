import http from 'node:http'
import { loadTranslator, translate, MODEL, LANGUAGES } from './runtime.mjs'
let state = 'loading'
let translator
let pending = 0
let queue = Promise.resolve()
const reply = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
const server = http.createServer(async (req, res) => {
    if (req.url === '/health') { reply(res, 200, { status: state, model: MODEL, languages: Object.keys(LANGUAGES), pending }); return }
    if (req.method !== 'POST' || req.url !== '/translate') { reply(res, 404, { error: 'Not found' }); return }
    if (state !== 'ready') { reply(res, 503, { error: state === 'loading' ? 'The local translation model is still loading. Please wait.' : 'Local translation failed to load. Run npm run local:download and restart.', code: 'local_model_not_ready' }); return }
    if (pending >= 3) { reply(res, 429, { error: 'Local translation is busy. Please wait and retry.' }); return }
    let body = ''
    try {
        for await (const chunk of req) {
            body += chunk.toString()
            if (body.length > 40000) { reply(res, 413, { error: 'Text is too large' }); return }
        }
        const data = JSON.parse(body)
        if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 5000 || !LANGUAGES[data.sourceLang] || !LANGUAGES[data.targetLang]) { reply(res, 422, { error: 'Provide text up to 5,000 characters and supported source/target languages.' }); return }
        pending++
        const task = queue.then(async () => {
            if (res.destroyed) { pending--; return }
            try { const translatedText = await translate(translator, data.text, data.sourceLang, data.targetLang); reply(res, 200, { translatedText, provider: 'local/nllb-200', detectedSourceLang: data.sourceLang }) }
            catch (error) { console.error('Local translation:', error.message); reply(res, 500, { error: 'Local translation failed. Please retry with shorter text.' }) }
            finally { pending-- }
        })
        queue = task.catch(() => {})
        await task
    } catch { if (!res.headersSent) reply(res, 400, { error: 'Invalid request body' }) }
})
server.listen(Number(process.env.LOCAL_AI_PORT || 3003), '127.0.0.1', () => console.log('Local translation listening on http://127.0.0.1:3003'))
loadTranslator().then(model => { translator = model; state = 'ready'; console.log('Local translation ready (offline; no API credits).') }).catch(error => { state = 'error'; console.error('Model loading failed:', error.message) })
