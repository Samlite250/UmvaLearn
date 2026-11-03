import type { ContentLanguage } from './types'

let idle: { worker: Worker; model: string; timer: ReturnType<typeof setTimeout> } | undefined

/** Release the last model when it has not been used for two minutes. */
export function clearTranslationCache() {
    if (!idle) return
    clearTimeout(idle.timer)
    idle.worker.terminate()
    idle = undefined
}

/** Runs on the visitor's device. Text is not sent to an external translation API. */
export async function translateInBrowser(text: string, from: ContentLanguage, to: ContentLanguage, signal?: AbortSignal, onStatus?: (status: string) => void): Promise<string> {
    signal?.throwIfAborted()
    if (from === to) return text
    if (from === 'rw' || to === 'rw') throw new Error('Use the platform’s free online translator for Kinyarwanda.')
    const model = `${from}-${to}`
    let worker: Worker
    if (idle?.model === model) {
        clearTimeout(idle.timer)
        worker = idle.worker
        idle = undefined
    } else {
        clearTranslationCache()
        worker = new Worker(new URL('./translation.worker.ts', import.meta.url), { type: 'module' })
    }
    return new Promise((resolve, reject) => {
        const finish = (reuse = false) => {
            clearTimeout(timeout)
            signal?.removeEventListener('abort', abort)
            worker.onmessage = null
            worker.onerror = null
            if (reuse) {
                clearTranslationCache()
                idle = { worker, model, timer: setTimeout(clearTranslationCache, 120000) }
            } else worker.terminate()
        }
        const abort = () => { finish(); reject(new DOMException('Translation cancelled', 'AbortError')) }
        const timeout = setTimeout(() => { finish(); reject(new Error('Translation took too long. Try a shorter text on this device.')) }, 600000)
        signal?.addEventListener('abort', abort, { once: true })
        worker.onmessage = ({ data }: MessageEvent<{ text?: string; error?: string; status?: string }>) => {
            if (data.status) { onStatus?.(data.status); return }
            if (data.error) { finish(); reject(new Error(data.error)) }
            else if (!data.text?.trim()) { finish(); reject(new Error('The translation was empty. Please retry.')) }
            else { finish(true); resolve(data.text) }
        }
        worker.onerror = () => { finish(); reject(new Error('This browser could not start free translation. Try an updated browser with WebAssembly support.')) }
        worker.postMessage({ text, from, to })
    })
}
