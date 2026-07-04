import { Router } from 'express'
import { shortenUrl, previewUrl } from '../controllers/shorten.js'
import { rateLimiter } from '../middleware/rateLimit.js'

const router = Router()

router.get('/preview', previewUrl)
router.post('/shorten', rateLimiter, shortenUrl)

export default router
