export const errorHandler = (err, req, res, next) => {
  const status  = err.status  || 500
  const message = err.message || 'Something went wrong'
  console.error(`❌ ${req.method} ${req.url} — ${message}`)
  res.status(status).json({ message })
}