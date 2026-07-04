import { LRUCache } from 'lru-cache'

const cache = new LRUCache({
  max: parseInt(process.env.CACHE_MAX || '10000'),
  ttl: 1000 * 60 * 60,
})

export default cache
