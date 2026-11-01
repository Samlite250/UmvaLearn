import { providerErrorResponse } from '../providers/errors.js'
import { transcribeAudio } from '../providers/stt.js'
import { z } from 'zod'

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024  // 25 MB

const schema = z.object({
    audioBase64: z.string().min(1),
    mimeType: z.string(),
    language: z.enum(['en', 'fr', 'rw']),
})

/**
 * POST /api/stt
 * Body: { audioBase64, mimeType, language }
 * Returns: { transcript, confidence, provider }
 *
 * For long audio (> 3 min), implement async job workflow:
 * 1. Upload audio to Supabase Storage with signed URL
 * 2. Enqueue to a job queue (e.g. Vercel Queues or Supabase pg_notify)
 * 3. Return jobId, poll /api/stt/job/:id for result
 * This stub handles synchronous short recordings only.
 */
export async function handleSTT(req: Request): Promise<Response> {
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

    // Rough size check on base64 payload
    const estimatedBytes = parsed.data.audioBase64.length * 0.75
    if (estimatedBytes > MAX_AUDIO_SIZE_BYTES) {
        return Response.json({ error: 'Audio file exceeds the 25 MB limit.' }, { status: 413 })
    }

    try {
        const result = await transcribeAudio(parsed.data)
        return Response.json(result)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Transcription failed'
        console.error('[stt]', message)
        return providerErrorResponse(err, message)
    }
}
