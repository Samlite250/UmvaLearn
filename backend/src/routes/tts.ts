import { providerErrorResponse } from '../providers/errors.js'
import { synthesizeSpeech } from '../providers/tts.js'
import { z } from 'zod'

const schema = z.object({
    text: z.string().min(1).max(5000),
    language: z.enum(['en', 'fr', 'rw']),
    voice: z.string().optional(),
    speed: z.number().min(0.25).max(4.0).optional(),
})

/**
 * POST /api/tts
 * Body: { text, language, voice?, speed? }
 * Returns: { audioBase64, audioMimeType, provider }
 */
export async function handleTTS(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    try {
        const result = await synthesizeSpeech(parsed.data)
        return Response.json(result)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'TTS failed'
        console.error('[tts]', message)
        return providerErrorResponse(err, message)
    }
}
