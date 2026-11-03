import { providerErrorResponse } from '../providers/errors.js'
import { translateText } from '../providers/translation.js'
import { translateWithMyMemory } from '../providers/mymemory.js'
import { z } from 'zod'

const schema = z.object({
    text: z.string().min(1).max(5000),
    sourceLang: z.enum(['en', 'fr', 'rw']),
    targetLang: z.enum(['en', 'fr', 'rw']),
})

/**
 * POST /api/translate
 * Body: { text, sourceLang, targetLang }
 * Returns: { translatedText, provider }
 *
 * This is a Vercel-compatible serverless function.
 * Deploy to: /api/translate.ts
 */
export async function handleTranslate(req: Request, freeOnly = false): Promise<Response> {
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

    const { text, sourceLang, targetLang } = parsed.data

    if (sourceLang === targetLang) {
        return Response.json({ translatedText: text, provider: 'passthrough' })
    }

    try {
        const input = { text, sourceLang, targetLang }
        // The user approved MyMemory for free online Kinyarwanda translation.
        // This route never falls back to a paid provider or configurable model URL.
        const result = await (freeOnly ? translateWithMyMemory(input) : translateText(input))
        return Response.json(result)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Translation failed'
        console.error('[translate]', message)
        return providerErrorResponse(err, message)
    }
}

export const handleFreeTranslate = (req: Request) => handleTranslate(req, true)
