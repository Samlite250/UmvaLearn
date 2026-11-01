import { transcribeKinyarwanda } from './pindo.js'
import { openAIError, ProviderError } from './errors.js'
/** OpenAI audio transcription adapter. */
export interface STTRequest { audioBase64: string; mimeType: string; language: string; maxDurationSeconds?: number }
export interface STTResult { transcript: string; confidence?: number; provider: string }

const SUPPORTED_LANGUAGES = new Set(['en', 'fr', 'rw'])
const extensionForMimeType = (mimeType: string): string => {
    if (mimeType.includes('webm')) return 'webm'
    if (mimeType.includes('ogg')) return 'ogg'
    if (mimeType.includes('wav')) return 'wav'
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a'
    return 'mp3'
}
type OpenAITranscription = { text?: string; error?: { message?: string } }

export async function transcribeAudio(req: STTRequest): Promise<STTResult> {
    if (req.language === 'rw') return transcribeKinyarwanda(req.audioBase64, req.mimeType, extensionForMimeType(req.mimeType))
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new ProviderError('OpenAI is not configured. Set OPENAI_API_KEY on the backend.', 503, 'openai_not_configured')
    if (!SUPPORTED_LANGUAGES.has(req.language)) throw new Error(`Unsupported language for speech-to-text: ${req.language}`)

    const bytes = Buffer.from(req.audioBase64, 'base64')
    if (!bytes.length) throw new Error('The uploaded audio is empty or invalid.')
    const mimeType = req.mimeType || 'audio/mpeg'
    const model = process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1'
    const form = new FormData()
    form.append('file', new Blob([bytes], { type: mimeType }), `audio.${extensionForMimeType(mimeType)}`)
    form.append('model', model)
    form.append('language', req.language)
    form.append('response_format', 'json')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form,
    })
    if (!response.ok) await openAIError(response)
    const data = await response.json() as OpenAITranscription
    return { transcript: data.text?.trim() || '[No speech detected]', provider: `openai/${model}` }
}
