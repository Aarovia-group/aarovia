import uploadRoutes from './upload.routes'

// This file patches the index.ts to add the upload route.
// In production, add this line to src/index.ts:
//   app.use('/api/upload', uploadRoutes)
export { uploadRoutes }
