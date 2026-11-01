import { openAIError, ProviderError } from './errors.js'
/**
 * Provider adapter for level-based explanations.
 * Primary: OpenAI GPT-4o-mini via Vercel function.
 * Falls back to a clear unavailable state when the key is missing.
 */

export interface ExplainRequest {
    text: string
    level: 'primary' | 'secondary' | 'university'
    language: string
}

export interface ExplainResult {
    explanation: string
    level: string
    provider: string
}

const LEVEL_PROMPTS = {
    primary: 'Explain this text using simple vocabulary, short sentences, and familiar everyday examples suitable for primary school children (ages 6–12).',
    secondary: 'Explain this text clearly with key terms defined, practical examples, and level-appropriate detail suitable for secondary school students (ages 13–18).',
    university: 'Explain this text with deeper analytical detail, academic terminology, and scholarly context appropriate for university-level students.',
}

export async function explainText(req: ExplainRequest): Promise<ExplainResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new ProviderError('OpenAI is not configured. Set OPENAI_API_KEY on the backend.', 503, 'openai_not_configured')

    const systemPrompt = `You are a helpful educational assistant for UmvaLearn, a multilingual study tool. 
${LEVEL_PROMPTS[req.level]}
Respond ONLY in: ${req.language}.
Do not replace or alter the original text — only provide an explanation.
Do not fabricate facts, citations, or curriculum claims.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Explain the following:\n\n${req.text}` },
            ],
            max_tokens: 800,
            temperature: 0.3,
        }),
    })

    if (!response.ok) await openAIError(response)

    const data = await response.json()
    return {
        explanation: data.choices[0].message.content,
        level: req.level,
        provider: 'openai/gpt-4o-mini',
    }
}
