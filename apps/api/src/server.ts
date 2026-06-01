import app from './index'

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Aarovia CRM API running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
})
