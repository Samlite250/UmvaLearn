import type { TranslateRequest, TranslateResult } from './translation.js'
import { ProviderError } from './errors.js'
export async function translateLocally(req: TranslateRequest): Promise<TranslateResult> {
    let response: Response
    try {
        response = await fetch(`${process.env.LOCAL_AI_URL || 'http://127.0.0.1:3003'}/translate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req), signal: AbortSignal.timeout(240000),
        })
    } catch {
        throw new ProviderError('The local translator is not reachable. Start the local AI service and try again.', 503, 'local_translation_unavailable', true)
    }
    const data = await response.json().catch(() => null) as (TranslateResult & { error?: string }) | null
    if (!response.ok || !data?.translatedText) throw new ProviderError(data?.error || 'The local translator returned an invalid response.', response.status === 429 ? 429 : 503, 'local_translation_unavailable', true)
    return { translatedText: data.translatedText, provider: 'local/nllb-200', detectedSourceLang: req.sourceLang }
}
