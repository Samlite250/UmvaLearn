import { readApiResponse } from '@/lib/apiResponse'
import { transcribeInBrowser } from '@/lib/browserTranscription'
import { useEffect, useRef, useState } from 'react'
import { apiUrl } from '@/lib/api'
import type { ContentLanguage } from '@/lib/types'

export function SpeechInput({ language, onText }: { language: ContentLanguage; onText: (text: string) => void }) {
    const [recording, setRecording] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const recorder = useRef<MediaRecorder | null>(null)
    const stream = useRef<MediaStream | null>(null)
    const input = useRef<HTMLInputElement | null>(null)
    const request = useRef<AbortController | null>(null)
    useEffect(() => () => {
        request.current?.abort()
        if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state !== 'inactive') recorder.current.stop() }
        stream.current?.getTracks().forEach(track => track.stop())
    }, [])
    const transcribe = async (audio: Blob, spokenLanguage: ContentLanguage) => {
        if (!audio.size || audio.size > 25 * 1024 * 1024) { setError('Choose a nonempty audio file smaller than 25 MB.'); return }
        setBusy(true); setError('')
        const controller = new AbortController(); request.current = controller
        try {
            if (spokenLanguage !== 'rw') {
                const text = await transcribeInBrowser(audio, spokenLanguage, controller.signal)
                if (!controller.signal.aborted) onText(text)
                return
            }
            const bytes = new Uint8Array(await audio.arrayBuffer())
            let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte)
            const response = await fetch(apiUrl('/api/stt'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioBase64: btoa(binary), mimeType: audio.type || 'audio/mpeg', language: spokenLanguage }), signal: controller.signal })
            const data = await readApiResponse(response, ['transcript'])
            if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Transcription failed')
            onText(data.transcript)
        } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Transcription failed') }
        finally { if (!controller.signal.aborted) setBusy(false) }
    }
    const record = async () => {
        if (recording) { recorder.current?.stop(); setRecording(false); return }
        try {
            setError('')
            stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
            const media = new MediaRecorder(stream.current); recorder.current = media
            const chunks: Blob[] = []
            const spokenLanguage = language
            media.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
            media.onstop = () => {
                stream.current?.getTracks().forEach(track => track.stop())
                setRecording(false)
                void transcribe(new Blob(chunks, { type: media.mimeType }), spokenLanguage)
            }
            media.start(); setRecording(true)
        } catch { stream.current?.getTracks().forEach(track => track.stop()); setError('Unable to record. Allow microphone access and use a browser that supports recording.') }
    }
    return <div className="space-y-2">
        <div className="flex gap-3 items-center">
            <button className="text-sm text-emerald-700 font-semibold" disabled={busy} onClick={() => void record()}>{recording ? 'Stop and transcribe' : 'Record speech'}</button>
            <button className="text-sm text-emerald-700" disabled={busy || recording} onClick={() => input.current?.click()}>Upload audio</button>
            <input ref={input} type="file" accept="audio/*" className="hidden" aria-label="Upload audio for translation" onChange={event => { const file = event.target.files?.[0]; if (file) void transcribe(file, language); event.target.value = '' }} />
            {busy && <span role="status" className="text-sm">Transcribing. First use downloads a speech model; this may take a few minutes.</span>}
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
}
