import { synthesizeKinyarwanda } from './pindo.js'
/** English and French use ElevenLabs; Kinyarwanda uses Pindo. */
export interface TTSRequest {
    text: string
    language: string
    voice?: string   // ElevenLabs voice ID (optional — defaults to lang default)
    speed?: number   // Playback rate is controlled by the audio player.
}

export interface TTSResult {
    audioBase64: string
    audioMimeType: string
    provider: string
}

// Default voice IDs per language (ElevenLabs pre-built multilingual voices)
// These are stable ElevenLabs stock voices — no cloning required
const DEFAULT_VOICES: Record<string, string> = {
    en: 'EXAVITQu4vr4xnSDxMaL',   // Sarah — clear, natural English
    fr: 'EXAVITQu4vr4xnSDxMaL', // Sarah multilingual voice
}

const ELEVENLABS_MODEL = 'eleven_multilingual_v2'
const BASE_URL = 'https://api.elevenlabs.io/v1'

export async function synthesizeSpeech(req: TTSRequest): Promise<TTSResult> {
    if (req.language === 'rw') return synthesizeKinyarwanda(req.text)
    if (!['en', 'fr'].includes(req.language)) throw new Error('Speech is not available for this language.')
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY is not configured. Add it to your backend .env file.')
    }

    const voiceId = req.voice ?? DEFAULT_VOICES[req.language] ?? DEFAULT_VOICES['en']

    const url = `${BASE_URL}/text-to-speech/${voiceId}`

    const body = {
        text: req.text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.80,
            style: 0.35,
            use_speaker_boost: true,
        },
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(`ElevenLabs TTS API error ${response.status}: ${errText}`)
    }

    // ElevenLabs returns raw audio bytes — convert to base64
    const audioBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(audioBuffer).toString('base64')

    return {
        audioBase64: base64,
        audioMimeType: 'audio/mpeg',
        provider: 'elevenlabs/eleven_multilingual_v2',
    }
}
