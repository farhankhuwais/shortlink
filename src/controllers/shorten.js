import { createLink } from '../services/link.js'
import { validateUrl } from '../utils/validator.js'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

export function shortenUrl(req, res) {
  const { url } = req.body

  const validation = validateUrl(url)
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error })
  }

  try {
    const link = createLink(validation.url)
    res.json({
      shortUrl: `${BASE_URL}/${link.short_code}`,
      shortCode: link.short_code,
      originalUrl: link.original_url,
    })
  } catch (err) {
    console.error('Shorten error:', err)
    res.status(500).json({ error: 'Failed to create short link' })
  }
}

export async function previewUrl(req, res) {
  const { url } = req.query

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      return res.json({ title: null, domain: new URL(url).hostname })
    }

    const html = await response.text()
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : null

    res.json({
      title,
      domain: new URL(url).hostname,
    })
  } catch {
    res.json({ title: null, domain: new URL(url).hostname })
  }
}
