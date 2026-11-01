import type { TranslateRequest, TranslateResult } from './translation.js'
import { ProviderError } from './errors.js'

// MyMemory limits each segment to 500 UTF-8 bytes, not 500 characters.
export function translationSegments(text: string): string[] {
    const result: string[] = []
    let segment = ''
    for (const character of text) {
        if (Buffer.byteLength(segment + character, 'utf8') > 500) {
            const boundary = segment.lastIndexOf(' ')
            if (boundary > 0) {
                result.push(segment.slice(0, boundary + 1))
                segment = segment.slice(boundary + 1)
            } else { result.push(segment); segment = '' }
        }
        segment += character
    }
    if (segment) result.push(segment)
    return result
}

export async function translateWithMyMemory(req: TranslateRequest): Promise<TranslateResult> {
    const output: string[] = []
    for (const segment of translationSegments(req.text)) {
        const whitespace = segment.match(/^(\s*)([\s\S]*?)(\s*)$/)!
        const text = whitespace[2]!
        if (!text) { output.push(segment); continue }
        const url = new URL('https://api.mymemory.translated.net/get')
        url.searchParams.set('q', text)
        url.searchParams.set('langpair', `${req.sourceLang}|${req.targetLang}`)
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
        const data = await response.json().catch(() => null)
        if (response.status === 429 || Number(data?.responseStatus) === 429 || data?.quotaFinished) {
            throw new ProviderError('The free translation service has reached its usage limit. Please try later or configure a funded OpenAI account.', 429, 'translation_quota_exhausted', false)
        }
        if (!response.ok || Number(data?.responseStatus) !== 200 || typeof data?.responseData?.translatedText !== 'string' || !data.responseData.translatedText.trim()) {
            throw new ProviderError('The translation service could not translate this text. Please retry.', 502, 'translation_provider_error', true)
        }
        output.push(whitespace[1] + data.responseData.translatedText + whitespace[3])
    }
    return { translatedText: output.join(''), provider: 'mymemory', detectedSourceLang: req.sourceLang }
}
