import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { upload, uploadDocument, uploadProjectImage, uploadAvatar, uploadLogo } from '../services/upload.service'
import prisma from '../utils/prisma'

const router = Router()
router.use(authenticate)

// Upload a document (PDF, images, DOCX)
router.post('/document', authorize('SUPER_ADMIN', 'ADMIN', 'CRM_TEAM', 'POST_SALES', 'ACCOUNTS'), upload.single('file'), uploadDocument)

// Upload project image
router.post('/project-image', upload.single('file'), uploadProjectImage)

// Upload user avatar
router.post('/avatar', upload.single('file'), uploadAvatar)

// Upload CRM branding logo
router.post('/logo', upload.single('file'), uploadLogo)

// Save document record to database after upload
router.post('/save-document', authorize('SUPER_ADMIN', 'ADMIN', 'CRM_TEAM', 'POST_SALES', 'ACCOUNTS'), async (req: any, res) => {
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
