import { z } from 'zod'

// ============================================
// AUTH VALIDATIONS
// ============================================
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES']).optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// ============================================
// LEAD VALIDATIONS
// ============================================
export const createLeadSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  email: z.string().email().optional().or(z.literal('')),
  budget: z.number().positive().optional().nullable(),
  city: z.string().optional(),
  source: z.enum(['MAGICBRICKS', 'FACEBOOK', 'META_ADS', 'GOOGLE_ADS', 'ACRES_99', 'WEBSITE', 'DIRECT_CALL', 'WALK_IN', 'REFERRAL', 'WHATSAPP']),
  status: z.enum(['NEW', 'FOLLOWUP', 'INTERESTED', 'QUALIFIED', 'SITE_VISIT_FIXED', 'SITE_VISIT_DONE', 'OPPORTUNITY', 'OPPORTUNITY_FOLLOW', 'OPPORTUNITY_INTERESTED', 'OPPORTUNITY_NOT_INTERESTED', 'OPPORTUNITY_CLOSED', 'BOOKED']).optional(),
  propertyType: z.enum(['VILLA', 'APARTMENT', 'PLOT', 'FARMLAND', 'COMMERCIAL']).optional().nullable(),
  projectId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  remarks: z.string().optional(),
  tags: z.array(z.string()).optional(),
  nextFollowupDate: z.string().optional().nullable(),
})

export const updateLeadStatusSchema = z.object({
  status: z.enum(['NEW', 'FOLLOWUP', 'INTERESTED', 'QUALIFIED', 'SITE_VISIT_FIXED', 'SITE_VISIT_DONE', 'OPPORTUNITY', 'OPPORTUNITY_FOLLOW', 'OPPORTUNITY_INTERESTED', 'OPPORTUNITY_NOT_INTERESTED', 'OPPORTUNITY_CLOSED', 'BOOKED']),
  remarks: z.string().optional(),
})

export const addCallLogSchema = z.object({
  outcome: z.string().optional(),
  duration: z.number().int().positive().optional().nullable(),
  notes: z.string().optional(),
  recordingUrl: z.string().url().optional().nullable(),
})

// ============================================
// CUSTOMER VALIDATIONS
// ============================================
export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  email: z.string().email().optional().or(z.literal('')),
  alternatePhone: z.string().optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format').optional().or(z.literal('')),
  aadhaarNumber: z.string().length(12, 'Aadhaar must be 12 digits').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
})

// ============================================
// INVENTORY VALIDATIONS
// ============================================
export const createInventorySchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  tower: z.string().optional(),
  floor: z.number().int().min(0).optional().nullable(),
  area: z.number().positive('Area must be positive'),
  facing: z.string().optional(),
  baseRate: z.number().positive('Base rate must be positive'),
  finalRate: z.number().positive().optional().nullable(),
  propertyType: z.enum(['VILLA', 'APARTMENT', 'PLOT', 'FARMLAND', 'COMMERCIAL']),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().int().min(0).optional().nullable(),
  projectId: z.string().min(1, 'Project is required'),
  notes: z.string().optional(),
})

// ============================================
// QUOTATION VALIDATIONS
// ============================================
export const createQuotationSchema = z.object({
  propertyType: z.enum(['VILLA', 'APARTMENT', 'PLOT', 'FARMLAND', 'COMMERCIAL']),
  baseRate: z.number().positive('Base rate must be positive'),
  area: z.number().positive('Area must be positive'),
  floorRise: z.number().min(0).optional().default(0),
  plcCharges: z.number().min(0).optional().default(0),
  maintenanceCharges: z.number().min(0).optional().default(0),
  parkingCharges: z.number().min(0).optional().default(0),
  clubhouseCharges: z.number().min(0).optional().default(0),
  legalCharges: z.number().min(0).optional().default(0),
  gstRate: z.number().min(0).max(28).optional().default(5),
  discount: z.number().min(0).optional().default(0),
  bookingAmount: z.number().min(0).optional().default(0),
  leadId: z.string().optional().nullable(),
  inventoryId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  notes: z.string().optional(),
  validUntil: z.string().optional().nullable(),
})

// ============================================
// BOOKING VALIDATIONS
// ============================================
export const createBookingSchema = z.object({
  leadId: z.string().min(1, 'Lead is required'),
  customerId: z.string().min(1, 'Customer is required'),
  inventoryId: z.string().min(1, 'Unit selection is required'),
  quotationId: z.string().optional().nullable(),
  totalAmount: z.number().positive('Total amount must be positive'),
  bookingAmount: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
})

export const addPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMode: z.enum(['CHEQUE', 'NEFT', 'RTGS', 'UPI', 'CASH', 'DD', 'BOOKING']),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
})

// ============================================
// INVOICE VALIDATIONS
// ============================================
export const createInvoiceSchema = z.object({
  bookingId: z.string().min(1, 'Booking is required'),
  amount: z.number().positive('Amount must be positive'),
  gstRate: z.number().min(0).max(28).optional().default(5),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional(),
})

// ============================================
// PROJECT VALIDATIONS
// ============================================
export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name is required'),
  description: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  reraNumber: z.string().optional(),
  minPrice: z.number().positive().optional().nullable(),
  maxPrice: z.number().positive().optional().nullable(),
  propertyTypes: z.array(z.enum(['VILLA', 'APARTMENT', 'PLOT', 'FARMLAND', 'COMMERCIAL'])).optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
})

// ============================================
// TYPE EXPORTS
// ============================================
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type CreateInventoryInput = z.infer<typeof createInventorySchema>
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>
export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
