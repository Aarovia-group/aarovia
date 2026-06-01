import { v2 as cloudinary } from 'cloudinary'
import { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Multer storage (memory - files go directly to Cloudinary)
const storage = multer.memoryStorage()

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

// Upload a single file buffer to Cloudinary
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
): Promise<{ url: string; publicId: string; format: string; size: number }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `aarovia-crm/${folder}`,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error)
        if (!result) return reject(new Error('Upload failed'))
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          size: result.bytes,
        })
      }
    )
    stream.end(buffer)
  })
}

// Delete a file from Cloudinary
export const deleteFromCloudinary = async (publicId: string) => {
  return cloudinary.uploader.destroy(publicId)
}

// Upload document endpoint
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' })
    }

    const { category = 'OTHER', customerId, bookingId } = req.body
    const isPdf = req.file.mimetype === 'application/pdf'
    const isImage = req.file.mimetype.startsWith('image/')

    const folder = isPdf ? 'documents' : isImage ? 'images' : 'files'
    const resourceType = isImage ? 'image' : 'raw'

    const { url, publicId, format, size } = await uploadToCloudinary(
      req.file.buffer,
      folder,
      resourceType
    )

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url,
        publicId,
        name: req.file.originalname,
        mimeType: req.file.mimetype,
        size,
        format,
        category,
        customerId: customerId || null,
        bookingId: bookingId || null,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message,
    })
  }
}

// Upload project image endpoint
export const uploadProjectImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' })
    }

    const { url, publicId } = await uploadToCloudinary(
      req.file.buffer,
      'projects',
      'image'
    )

    res.json({
      success: true,
      data: { url, publicId },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message })
  }
}

// Upload profile avatar
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' })
    }

    const { url, publicId } = await uploadToCloudinary(
      req.file.buffer,
      'avatars',
      'image'
    )

    res.json({
      success: true,
      data: { url, publicId },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message })
  }
}
