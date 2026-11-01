import { handleTranslate } from '../backend/dist/routes/translate.js'
import { vercelHandler } from '../scripts/vercel-handler.mjs'
export default vercelHandler(handleTranslate)
