import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false
type Recognizer = (audio: Float32Array, options: Record<string, unknown>) => Promise<{ text: string }>
let recognizer: Promise<Recognizer> | undefined
self.onmessage = async (event: MessageEvent<{ audio: Float32Array; language: string }>) => {
    try {
        recognizer ??= (pipeline as unknown as (task: string, model: string, options: Record<string, unknown>) => Promise<Recognizer>)('automatic-speech-recognition', 'onnx-community/whisper-tiny', { dtype: 'q8', device: 'wasm' })
        const model = await recognizer
        // Pipeline overloads include unrelated tasks; this worker only creates ASR.
        const transcribe = model as unknown as (audio: Float32Array, options: Record<string, unknown>) => Promise<{ text: string }>
        const result = await transcribe(event.data.audio, {
            language: event.data.language === 'fr' ? 'french' : 'english',
            task: 'transcribe', chunk_length_s: 30, stride_length_s: 5,
        })
        self.postMessage({ text: result.text.trim() })
    } catch {
        recognizer = undefined
        self.postMessage({ error: 'Free transcription could not run on this device. Check your internet connection for the first model download, then retry with a shorter recording.' })
    }
}
