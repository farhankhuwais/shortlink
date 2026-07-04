const MAX_URL_LENGTH = 2048

const PRIVATE_IPS = [
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  '10.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
  '192.168.',
]

function isPrivateHost(hostname) {
  return PRIVATE_IPS.some(prefix =>
    hostname.startsWith(prefix)
  )
}

export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' }
  }

  url = url.trim()

  if (url.length > MAX_URL_LENGTH) {
    return { valid: false, error: 'URL exceeds 2048 characters' }
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only http/https URLs are allowed' }
  }

  if (isPrivateHost(parsed.hostname)) {
    return { valid: false, error: 'URLs pointing to private networks are not allowed' }
  }

  return { valid: true, error: null, url: parsed.href }
}
