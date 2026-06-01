import { z } from 'zod'

export const createLeadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().min(10, 'Enter a valid mobile number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  budget: z.union([z.number().positive(), z.literal(''), z.null()]).optional(),
  city: z.string().optional(),
  source: z.string().min(1, 'Source is required'),
  status: z.string().optional(),
  propertyType: z.string().optional(),
  remarks: z.string().optional(),
  nextFollowupDate: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  email: z.string().email().optional().or(z.literal('')),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN (e.g. ABCDE1234F)').optional().or(z.literal('')),
  aadhaarNumber: z.string().length(12, 'Aadhaar must be 12 digits').optional().or(z.literal('')),
  city: z.string().optional(),
  state: z.string().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
