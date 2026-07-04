import express from 'express'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import indexRoutes from './routes/index.js'
import apiRoutes from './routes/api.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3000

app.set('view engine', 'ejs')
app.set('views', join(__dirname, 'views'))

app.use(express.json())
app.use(express.static(join(__dirname, '..', 'public')))

app.use('/', indexRoutes)
app.use('/api', apiRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Shortlink running on http://localhost:${PORT}`)
})

export default app
