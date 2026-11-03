import { apiUrl } from './api'
import { translateInBrowser } from './browserTranslation'
import type { ContentLanguage } from './types'

/** Kinyarwanda uses the approved free MyMemory API; English/French stays on-device. */
export async function translateForFree(text: string, from: ContentLanguage, to: ContentLanguage, signal?: AbortSignal, onStatus?: (status: string) => void): Promise<string> {
    signal?.throwIfAborted()
    if (from === to) return text
    if (from === 'rw' || to === 'rw') {
        onStatus?.('Translating with MyMemory…')
        let message = 'The free online translation service is unavailable. Please try again later.'
        try {
            const response = await fetch(apiUrl('/api/translate-free'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, sourceLang: from, targetLang: to }),
                signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(110000)]) : AbortSignal.timeout(110000),
            })
            const result = await response.json()
            if (response.ok && typeof result.translatedText === 'string' && result.translatedText.trim()) return result.translatedText
            if (typeof result.error === 'string') message = result.error
        } catch { signal?.throwIfAborted() }
        throw new Error(message)
    }
    return translateInBrowser(text, from, to, signal, onStatus)
}
