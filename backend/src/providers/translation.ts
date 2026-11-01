import { translateLocally } from './local.js'
import { translateWithMyMemory } from './mymemory.js'
import { openAIError, ProviderError } from './errors.js'
/** Translation adapters for English, French, and Kinyarwanda. Local by default. */
export interface TranslateRequest { text: string; sourceLang: string; targetLang: string }
export interface TranslateResult { translatedText: string; detectedSourceLang?: string; provider: string }

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', fr: 'French', rw: 'Kinyarwanda' }
type ChatCompletion = { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> }

async function translateWithOpenAI(req: TranslateRequest): Promise<TranslateResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new ProviderError('OpenAI is not configured. Set OPENAI_API_KEY on the backend.', 503, 'openai_not_configured')
    const source = LANGUAGE_NAMES[req.sourceLang]
    const target = LANGUAGE_NAMES[req.targetLang]
    if (!source || !target) throw new Error('Unsupported translation language.')

    const model = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini'
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: `Translate faithfully from ${source} to ${target}. Preserve meaning, names, formatting, and tone. Return only the translated text with no notes, labels, or quotation marks.` },
                { role: 'user', content: req.text },
            ],
            temperature: 0,
            max_tokens: 4000,
        }),
    })
    if (!response.ok) await openAIError(response)
    const data = await response.json() as ChatCompletion
    const translatedText = data.choices?.[0]?.message?.content?.trim()
    if (!translatedText) throw new Error('OpenAI returned an empty translation.')
    return { translatedText, detectedSourceLang: req.sourceLang, provider: `openai/${model}` }
}

/** The local provider never falls back to a remote service. */
export async function translateText(req: TranslateRequest): Promise<TranslateResult> {
    const provider = process.env.TRANSLATION_PROVIDER || 'local'
    if (!LANGUAGE_NAMES[req.sourceLang] || !LANGUAGE_NAMES[req.targetLang]) throw new Error('Unsupported translation language.')
    if (provider === 'local') return translateLocally(req)
    if (provider === 'mymemory') return translateWithMyMemory(req)
    if (!['auto', 'openai'].includes(provider)) throw new ProviderError('Invalid TRANSLATION_PROVIDER configuration.', 503, 'translation_configuration_error')
    try { return await translateWithOpenAI(req) } catch (error) {
        if (provider === 'auto' && error instanceof ProviderError && ['openai_quota_exhausted', 'openai_not_configured'].includes(error.code)) return translateWithMyMemory(req)
        throw error
    }
}
