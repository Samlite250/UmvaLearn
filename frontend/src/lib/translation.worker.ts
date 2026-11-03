import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false
const languages = new Set(['en', 'fr'])
type Translator = (text: string, options: Record<string, unknown>) => Promise<Array<{ translation_text: string }>>
let translatorPromise: Promise<Translator> | undefined
self.onmessage = async ({ data }: MessageEvent<{ text: string; from: string; to: string }>) => {
    try {
        if (!languages.has(data.from) || !languages.has(data.to)) throw new Error('Unsupported language')
        const model = `Xenova/opus-mt-${data.from}-${data.to}`
        translatorPromise ??= (pipeline as unknown as (task: string, model: string, options: Record<string, unknown>) => Promise<Translator>)(
            'translation', model, {
                dtype: 'q8', device: 'wasm',
                progress_callback: (event: { status?: string; progress?: number }) => self.postMessage({
                    status: event.status === 'progress' && typeof event.progress === 'number'
                        ? `Downloading a translation model file: ${Math.round(event.progress)}%. Keep this page open.`
                        : 'Loading the translation model. Keep this page open.',
                }),
            },
        )
        const translator = await translatorPromise
        self.postMessage({ status: 'Translating on your device…' })
        const output: string[] = []
        let remaining = data.text
        while (remaining) {
            let cut = remaining.length > 300 ? remaining.lastIndexOf(' ', 300) : remaining.length
            if (cut < 150) cut = Math.min(300, remaining.length)
            else if (cut < remaining.length) cut++
            if (cut < remaining.length && /[\uD800-\uDBFF]/.test(remaining[cut - 1])) cut--
            const segment = remaining.slice(0, cut)
            remaining = remaining.slice(cut)
            const match = segment.match(/^(\s*)([\s\S]*?)(\s*)$/)!
            if (!match[2]) { output.push(segment); continue }
            const result = await translator(match[2], {
                max_new_tokens: 256, num_beams: 1,
            })
            if (!result[0]?.translation_text?.trim()) throw new Error('Empty translation')
            output.push(match[1] + result[0].translation_text + match[3])
        }
        self.postMessage({ text: output.join('') })
    } catch {
        translatorPromise = undefined
        self.postMessage({ error: 'Free translation could not run on this device. The first use downloads a large language model. Check your connection and available memory, or try a computer with an updated browser.' })
    }
}
