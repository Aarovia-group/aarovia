import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { upload, uploadDocument, uploadProjectImage, uploadAvatar, uploadBrandingLogo } from '../services/upload.service'
import prisma from '../utils/prisma'

const router = Router()
router.use(authenticate)

// Upload a document (PDF, images, DOCX)
router.post('/document', upload.single('file'), uploadDocument)

// Upload project image
router.post('/project-image', upload.single('file'), uploadProjectImage)

// Upload user avatar
router.post('/avatar', upload.single('file'), uploadAvatar)
router.post('/branding-logo', authorize('SUPER_ADMIN', 'ADMIN'), upload.single('file'), uploadBrandingLogo)

// Save document record to database after upload
router.post('/save-document', async (req: any, res) => {
  try {
    const { name, category, url, mimeType, size, customerId, bookingId } = req.body
    const doc = await prisma.document.create({
      data: { name, category, url, mimeType, size: size ? parseInt(size) : null, customerId, bookingId },
    })
    res.status(201).json({ success: true, data: doc })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save document record', error })
  }
})

export default router
