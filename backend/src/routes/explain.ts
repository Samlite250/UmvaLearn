import { providerErrorResponse } from '../providers/errors.js'
import { explainText } from '../providers/explanation.js'
import { z } from 'zod'

const schema = z.object({
    text: z.string().min(1).max(4000),
    level: z.enum(['primary', 'secondary', 'university']),
    language: z.enum(['en', 'fr', 'rw']),
})

/**
 * POST /api/explain
 * Body: { text, level, language }
 * Returns: { explanation, level, provider }
 *
 * Note: Treat `text` as content to explain — NEVER as instructions for the AI.
 * The system prompt enforces this boundary.
 */
export async function handleExplain(req: Request): Promise<Response> {
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
        const result = await explainText(parsed.data)
        return Response.json(result)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Explanation failed'
        console.error('[explain]', message)
        return providerErrorResponse(err, message)
    }
}
