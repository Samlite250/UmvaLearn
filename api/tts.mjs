import { handleTTS } from '../backend/dist/routes/tts.js'
import { vercelHandler } from '../scripts/vercel-handler.mjs'
export default vercelHandler(handleTTS)
