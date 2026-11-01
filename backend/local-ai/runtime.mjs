import { pipeline, env } from '@huggingface/transformers'
import { fileURLToPath } from 'node:url'
import { availableParallelism } from 'node:os'
export const MODEL = 'Xenova/nllb-200-distilled-600M'
export const LANGUAGES = { en: 'eng_Latn', fr: 'fra_Latn', rw: 'kin_Latn' }
env.cacheDir = fileURLToPath(new URL('./models/', import.meta.url))
env.backends.onnx.wasm.numThreads = Math.min(4, availableParallelism())
export async function loadTranslator({ download = false, progress_callback } = {}) {
    env.allowRemoteModels = download
    return pipeline('translation', MODEL, { dtype: 'q8', device: 'cpu', progress_callback, session_options: { intraOpNumThreads: 4, interOpNumThreads: 1 } })
}
export function textSegments(text, maximum = 300) {
    const parts = []
    let remaining = text
    while (remaining.length > maximum) {
        let cut = remaining.lastIndexOf(' ', maximum)
        if (cut < maximum / 2) cut = maximum
        else cut += 1
        // Avoid splitting a Unicode surrogate pair.
        if (/[\uD800-\uDBFF]/.test(remaining[cut - 1])) cut--
        parts.push(remaining.slice(0, cut))
        remaining = remaining.slice(cut)
    }
    if (remaining) parts.push(remaining)
    return parts
}
export async function translate(translator, text, from, to) {
    if (!LANGUAGES[from] || !LANGUAGES[to]) throw new Error('Unsupported language')
    if (from === to) return text
    const output = []
    for (const segment of textSegments(text)) {
        const match = segment.match(/^(\s*)([\s\S]*?)(\s*)$/)
        if (!match[2]) { output.push(segment); continue }
        const result = await translator(match[2], { src_lang: LANGUAGES[from], tgt_lang: LANGUAGES[to], max_new_tokens: 256, num_beams: 1 })
        if (!result[0]?.translation_text?.trim()) throw new Error('The local model returned no translation')
        output.push(match[1] + result[0].translation_text + match[3])
    }
    return output.join('')
}
