import { handleExplain } from '../backend/dist/routes/explain.js'
import { vercelHandler } from '../scripts/vercel-handler.mjs'
export default vercelHandler(handleExplain)
