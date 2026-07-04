import { getLink, incrementClicks } from '../services/link.js'

export function redirectUrl(req, res) {
  const { code } = req.params

  const originalUrl = getLink(code)

  if (!originalUrl) {
    return res.status(404).render('404')
  }

  incrementClicks(code)

  res.redirect(301, originalUrl)
}
