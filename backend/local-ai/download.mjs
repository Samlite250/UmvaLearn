import { loadTranslator, MODEL } from './runtime.mjs'
console.log(`Downloading ${MODEL} to the workspace. This may take several minutes.`)
const reported = new Set()
const progress = new Map()
const translator = await loadTranslator({ download: true, progress_callback: event => {
    if (event.status === 'progress') {
        const percent = Math.floor((event.progress || 0) / 20) * 20
        if (percent > (progress.get(event.file) || 0)) { progress.set(event.file, percent); console.log(`${event.file}: ${percent}%`) }
    }
    if (event.status === 'done' && !reported.has(event.file)) { reported.add(event.file); console.log(`Downloaded ${event.file}`) }
} })
console.log('Local translation model loaded successfully.')
await translator.dispose()
