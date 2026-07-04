import { randomBytes } from 'node:crypto'

const CODE_LENGTH = 7

export function generateShortCode() {
  return randomBytes(CODE_LENGTH)
    .toString('base64url')
    .slice(0, CODE_LENGTH)
}
