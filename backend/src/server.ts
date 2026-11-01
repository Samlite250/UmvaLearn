/**
 * UmvaLearn Local Development Server
 * Runs on port 3002 and routes all /api/* requests to the appropriate handler.
 * The Vite frontend proxies /api/* to this server during development.
 *
 * Usage: npm run dev (uses tsx watch)
 */
import 'dotenv/config'
import http from 'http'
import { handleTranslate } from './routes/translate.js'
import { handleTTS } from './routes/tts.js'
import { handleSTT } from './routes/stt.js'
import { handleExplain } from './routes/explain.js'

const PORT = process.env.PORT ?? 3002

const ROUTES: Record<string, (req: Request) => Promise<Response>> = {
    '/api/translate': handleTranslate,
    '/api/tts': handleTTS,
    '/api/stt': handleSTT,
    '/api/explain': handleExplain,
}

const server = http.createServer(async (req, res) => {
    const url = req.url ?? '/'
    const path = url.split('?')[0] ?? '/'

    // CORS headers for dev
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
    }

    const handler = ROUTES[path]
    if (!handler) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `No handler found for ${path}` }))
        return
    }

    // Collect body
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', async () => {
        const bodyText = Buffer.concat(chunks).toString()

        try {
        // Build a fetch-compatible Request
        const fetchReq = new Request(`http://localhost:${PORT}${url}`, {
            method: req.method,
            headers: Object.fromEntries(
                Object.entries(req.headers)
                    .filter(([, v]) => v !== undefined)
                    .map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v as string])
            ),
            body: req.method !== 'GET' && req.method !== 'HEAD' && bodyText ? bodyText : undefined,
        })

            const fetchRes = await handler(fetchReq)
            const body = await fetchRes.text()
            res.writeHead(fetchRes.status, { 'Content-Type': 'application/json' })
            res.end(body)
        } catch (err) {
            console.error('Handler error:', err)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Internal server error' }))
        }
    })
})

server.listen(PORT, () => {
    console.log(`\n🚀 UmvaLearn backend running at http://localhost:${PORT}`)
    console.log('   Routes: /api/translate  /api/tts  /api/stt  /api/explain\n')
    console.log('   Providers: OpenAI (translation, STT, explanations) - ElevenLabs (TTS)\n')
    const keys = ['ELEVENLABS_API_KEY', 'OPENAI_API_KEY']
    keys.forEach((k) => {
        const set = !!process.env[k]
        console.log(`   ${set ? '✅' : '❌'} ${k}${set ? '' : ' (not set)'}`)
    })
    console.log()
})
