import { Router } from 'express'
import { redirectUrl } from '../controllers/redirect.js'

const router = Router()

router.get('/', (req, res) => {
  res.render('index')
})

router.get('/:code', redirectUrl)

export default router
