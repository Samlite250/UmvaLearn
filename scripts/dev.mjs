import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const services = [
    ['local translation', 'backend/local-ai/server.mjs', root],
    ['API', 'dist/server.js', fileURLToPath(new URL('../backend/', import.meta.url))],
    ['frontend', 'node_modules/vite/bin/vite.js', fileURLToPath(new URL('../frontend/', import.meta.url))],
]
const children = services.map(([label, entry, cwd]) => {
    const child = spawn(process.execPath, [entry], { cwd, stdio: 'inherit', windowsHide: true })
    child.on('error', error => { console.error(`${label}: ${error.message}`); stop(1) })
    child.on('exit', code => { if (!stopping) { console.error(`${label} stopped (${code}).`); stop(code || 1) } })
    return child
})
let stopping = false
function stop(code = 0) { if (stopping) return; stopping = true; for (const child of children) child.kill(); process.exitCode = code }
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
