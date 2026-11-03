/** Decode recordings and uploads locally; speech is never sent to a paid API. */
export async function transcribeInBrowser(blob: Blob, language: string, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted()
    const context = new AudioContext({ sampleRate: 16000 })
    let audio: Float32Array
    try {
        const decoded = await context.decodeAudioData(await blob.arrayBuffer())
        const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000)
        const source = offline.createBufferSource()
        source.buffer = decoded
        source.connect(offline.destination)
        source.start()
        audio = (await offline.startRendering()).getChannelData(0)
    } finally { await context.close() }
    signal?.throwIfAborted()
    const worker = new Worker(new URL('./transcription.worker.ts', import.meta.url), { type: 'module' })
    return new Promise((resolve, reject) => {
        const finish = () => { clearTimeout(timeout); signal?.removeEventListener('abort', abort); worker.terminate() }
        const abort = () => { finish(); reject(new DOMException('Transcription cancelled', 'AbortError')) }
        const timeout = setTimeout(() => { finish(); reject(new Error('Transcription took too long. Try a shorter recording on this device.')) }, 600000)
        signal?.addEventListener('abort', abort, { once: true })
        worker.onmessage = ({ data }: MessageEvent<{ text?: string; error?: string }>) => {
            finish()
            if (data.error) reject(new Error(data.error))
            else if (!data.text?.trim()) reject(new Error('No speech detected. Please try a clearer recording.'))
            else resolve(data.text)
        }
        worker.onerror = () => { finish(); reject(new Error('This browser could not start free transcription. Try an updated browser with WebAssembly support.')) }
        worker.postMessage({ audio, language }, [audio.buffer])
    })
}
