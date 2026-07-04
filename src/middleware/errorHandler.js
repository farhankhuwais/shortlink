export function errorHandler(err, req, res, _next) {
  console.error(`${new Date().toISOString()} - ${err.message}`)
  console.error(err.stack)

  const status = err.status || 500
  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  })
}

export function notFound(req, res) {
  res.status(404).render('404')
}
