/** Kinyarwanda speech via Pindo VoiceAI. Public endpoints are rate limited. */
import { ProviderError } from './errors.js'
const BASE_URL = 'https://api.pindo.io'
function access(path: string) {
    const token = process.env.PINDO_ACCESS_TOKEN?.trim()
    return { url: `${BASE_URL}${path}${token ? '' : '/public'}`, headers: token ? { Authorization: `Bearer ${token}` } : undefined }
}
async function result(response: Response) {
    const data = await response.json().catch(() => null)
    if (!response.ok || !data || data.error || data.status === 'error') {
        throw new ProviderError(response.status === 429 ? 'Kinyarwanda speech is busy. Please wait and retry.' : 'The Kinyarwanda speech service is unavailable. Please try again.', response.status === 429 ? 429 : 502, 'kinyarwanda_provider_error', true)
    }
    return data.data
}
export async function synthesizeKinyarwanda(text: string) {
    const endpoint = access('/ai/tts/rw')
    const data = await result(await fetch(endpoint.url, {
        method: 'POST', headers: { ...endpoint.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: 'rw', speech_rate: 1 }), signal: AbortSignal.timeout(60000),
    }))
    const url = new URL(data?.generated_audio_url)
    if (url.protocol !== 'https:' || !(url.hostname.endsWith('.amazonaws.com') || url.hostname === 'api.pindo.io' || url.hostname.endsWith('.pindo.io'))) {
        throw new ProviderError('The speech service returned an invalid audio URL.', 502, 'invalid_audio_url')
    }
    const audio = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' })
    if (!audio.ok) throw new ProviderError('Unable to download the generated Kinyarwanda audio.', 502, 'audio_download_failed', true)
    return { audioBase64: Buffer.from(await audio.arrayBuffer()).toString('base64'), audioMimeType: 'audio/wav', provider: 'pindo/tts/rw' }
}
export async function transcribeKinyarwanda(audioBase64: string, mimeType: string, extension: string) {
    const endpoint = access('/ai/stt/rw')
    const form = new FormData()
    form.append('audio', new Blob([Buffer.from(audioBase64, 'base64')], { type: mimeType }), `audio.${extension}`)
    const data = await result(await fetch(endpoint.url, { method: 'POST', headers: endpoint.headers, body: form, signal: AbortSignal.timeout(60000) }))
    if (typeof data?.text !== 'string' || !data.text.trim()) throw new ProviderError('No Kinyarwanda speech was detected. Please try a clearer recording.', 422, 'no_speech_detected')
    return { transcript: data.text.trim(), provider: 'pindo/stt/rw' }
}
