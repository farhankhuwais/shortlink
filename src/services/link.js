import db from '../config/db.js'
import cache from '../config/cache.js'
import { generateShortCode } from '../utils/hash.js'

export function createLink(originalUrl) {
  let shortCode
  let attempts = 0

  do {
    shortCode = generateShortCode()
    attempts++
    if (attempts > 10) {
      throw new Error('Failed to generate unique short code')
    }
  } while (db.prepare('SELECT 1 FROM links WHERE short_code = ?').get(shortCode))

  const stmt = db.prepare(
    'INSERT INTO links (short_code, original_url) VALUES (?, ?)'
  )
  const result = stmt.run(shortCode, originalUrl)

  const link = {
    id: result.lastInsertRowid,
    short_code: shortCode,
    original_url: originalUrl,
    clicks: 0,
    is_favorite: 0,
  }

  cache.set(shortCode, originalUrl)

  return link
}

export function getLink(shortCode) {
  const cached = cache.get(shortCode)
  if (cached) return cached

  const row = db.prepare(
    'SELECT original_url FROM links WHERE short_code = ?'
  ).get(shortCode)

  if (row) {
    cache.set(shortCode, row.original_url)
    return row.original_url
  }

  return null
}

export function incrementClicks(shortCode) {
  db.prepare(
    "UPDATE links SET clicks = clicks + 1, updated_at = datetime('now') WHERE short_code = ?"
  ).run(shortCode)
}
