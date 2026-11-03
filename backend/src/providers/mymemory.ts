import type { TranslateRequest, TranslateResult } from './translation.js'
import { ProviderError } from './errors.js'

function decodeTranslation(text: string): string {
    const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0' }
    return text.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, code: string) => {
        if (!code.startsWith('#')) return named[code.toLowerCase()] ?? entity
        const value = code.charAt(1).toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
        return value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff) ? String.fromCodePoint(value) : entity
    })
}

async function requestTranslation(url: URL): Promise<string> {
    // Retry a transient provider failure once; never retry or bypass quota errors.
    for (let attempt = 0; attempt < 2; attempt++) {
        let response: Response
        try { response = await fetch(url, { signal: AbortSignal.timeout(30000) }) }
        catch {
            if (attempt === 0) continue
            throw new ProviderError('The free translation service could not be reached. Please retry later.', 502, 'translation_provider_error', true)
        }
        const data = await response.json().catch(() => null)
        if (response.status === 429 || Number(data?.responseStatus) === 429 || data?.quotaFinished) {
            throw new ProviderError('The free translation service has reached its daily usage limit. Please try again later. No paid fallback was used.', 429, 'translation_quota_exhausted', false)
        }
        if (response.ok && Number(data?.responseStatus) === 200 && typeof data?.responseData?.translatedText === 'string' && data.responseData.translatedText.trim()) {
            return decodeTranslation(data.responseData.translatedText)
        }
    }
    throw new ProviderError('The translation service could not translate this text. Please retry.', 502, 'translation_provider_error', true)
}

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
        output.push(whitespace[1] + await requestTranslation(url) + whitespace[3])
    }
    return { translatedText: output.join(''), provider: 'mymemory', detectedSourceLang: req.sourceLang }
}
