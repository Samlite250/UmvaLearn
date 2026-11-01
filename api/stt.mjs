import { handleSTT } from '../backend/dist/routes/stt.js'
import { vercelHandler } from '../scripts/vercel-handler.mjs'
export default vercelHandler(handleSTT)
