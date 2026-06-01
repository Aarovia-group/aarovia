// ============================================
// AAROVIA CRM - GLOBAL TYPE DEFINITIONS
// ============================================

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SALES_MANAGER'
  | 'SALES_EXECUTIVE'
  | 'TELECALLER'
  | 'ACCOUNTS'
  | 'CRM_TEAM'
  | 'POST_SALES'

export type LeadStatus =
  | 'NEW'
  | 'FOLLOWUP'
  | 'INTERESTED'
  | 'QUALIFIED'
  | 'SITE_VISIT_FIXED'
  | 'SITE_VISIT_DONE'
  | 'OPPORTUNITY'
  | 'OPPORTUNITY_FOLLOW'
  | 'OPPORTUNITY_INTERESTED'
  | 'OPPORTUNITY_NOT_INTERESTED'
  | 'OPPORTUNITY_CLOSED'
  | 'BOOKED'

export type LeadSource =
  | 'MAGICBRICKS'
  | 'FACEBOOK'
  | 'META_ADS'
  | 'GOOGLE_ADS'
  | 'ACRES_99'
  | 'WEBSITE'
  | 'DIRECT_CALL'
  | 'WALK_IN'
  | 'REFERRAL'
  | 'WHATSAPP'

export type PropertyType = 'VILLA' | 'APARTMENT' | 'PLOT' | 'FARMLAND' | 'COMMERCIAL'

export type InventoryStatus = 'AVAILABLE' | 'BLOCKED' | 'SOLD' | 'RESERVED'

export type QuotationStatus = 'DRAFT' | 'SHARED' | 'NEGOTIATION' | 'APPROVED' | 'CONVERTED'

export type AgreementStatus = 'PENDING' | 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'REGISTERED'

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL_PAID' | 'OVERDUE'

export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'IN_APP'

export type DocumentCategory =
  | 'AGREEMENT'
  | 'PAN_CARD'
  | 'AADHAAR'
  | 'PAYMENT_RECEIPT'
  | 'QUOTATION'
  | 'BROCHURE'
  | 'OTHER'

// ---- Entity Types ----

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: Role
  avatar?: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  location: string
  city: string
  state: string
  reraNumber?: string
  totalUnits: number
  availableUnits: number
  minPrice?: number
  maxPrice?: number
  propertyTypes: PropertyType[]
  amenities: string[]
  brochureUrl?: string
  sitemapUrl?: string
  images: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Lead {
  id: string
  name: string
  mobile: string
  email?: string
  budget?: number
  city?: string
  source: LeadSource
  status: LeadStatus
  propertyType?: PropertyType
  remarks?: string
  tags: string[]
  score: number
  nextFollowupDate?: string
  isDuplicate: boolean
  isActive: boolean
  projectId?: string
  project?: Pick<Project, 'id' | 'name'>
  assignedToId?: string
  assignedTo?: Pick<User, 'id' | 'name' | 'avatar'>
  createdById?: string
  createdAt: string
  updatedAt: string
  _count?: {
    activities: number
    callLogs: number
    tasks: number
  }
}

export interface LeadDetail extends Lead {
  activities: Activity[]
  callLogs: CallLog[]
  notes: Note[]
  tasks: Task[]
  quotations: Quotation[]
  siteVisits: SiteVisit[]
  emailLogs: EmailLog[]
  whatsappLogs: WhatsappLog[]
  booking?: Booking
}

export interface Activity {
  id: string
  type: string
  description: string
  metadata?: Record<string, any>
  createdAt: string
  leadId?: string
  userId?: string
  user?: Pick<User, 'id' | 'name'>
}

export interface CallLog {
  id: string
  duration?: number
  outcome?: string
  notes?: string
  recordingUrl?: string
  calledAt: string
  leadId: string
  userId: string
  user?: Pick<User, 'name'>
}

export interface Note {
  id: string
  content: string
  createdAt: string
  leadId: string
}

export interface Task {
  id: string
  title: string
  description?: string
  dueDate: string
  isCompleted: boolean
  priority: string
  createdAt: string
  updatedAt: string
  leadId?: string
  userId: string
}

export interface Inventory {
  id: string
  unitNumber: string
  tower?: string
  floor?: number
  area: number
  facing?: string
  baseRate: number
  finalRate?: number
  status: InventoryStatus
  propertyType: PropertyType
  bedrooms?: number
  bathrooms?: number
  floorPlanUrl?: string
  notes?: string
  projectId: string
  project?: Pick<Project, 'id' | 'name'>
  customerId?: string
  customer?: Pick<Customer, 'id' | 'name' | 'mobile'>
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  email?: string
  mobile: string
  alternatePhone?: string
  panNumber?: string
  aadhaarNumber?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  isKycVerified: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    bookings: number
    documents: number
  }
}

export interface CustomerDetail extends Customer {
  bookings: BookingWithRelations[]
  documents: Document[]
  payments: Payment[]
}

export interface Quotation {
  id: string
  quotationNumber: string
  status: QuotationStatus
  propertyType: PropertyType
  baseRate: number
  area: number
  baseAmount: number
  floorRise: number
  plcCharges: number
  maintenanceCharges: number
  parkingCharges: number
  clubhouseCharges: number
  legalCharges: number
  gstRate: number
  gstAmount: number
  discount: number
  totalAmount: number
  bookingAmount: number
  validUntil?: string
  notes?: string
  pdfUrl?: string
  leadId?: string
  lead?: Pick<Lead, 'id' | 'name' | 'mobile' | 'email'>
  inventoryId?: string
  inventory?: Pick<Inventory, 'id' | 'unitNumber' | 'tower'>
  projectId?: string
  project?: Pick<Project, 'id' | 'name'>
  createdById?: string
  createdBy?: Pick<User, 'id' | 'name'>
  paymentMilestones?: PaymentMilestone[]
  createdAt: string
  updatedAt: string
}

export interface PaymentMilestone {
  id: string
  name: string
  percentage: number
  amount: number
  dueDate?: string
  isPaid: boolean
  paidDate?: string
  quotationId: string
  bookingId?: string
}

export interface Booking {
  id: string
  bookingNumber: string
  bookingDate: string
  agreementStatus: AgreementStatus
  totalAmount: number
  collectedAmount: number
  dueAmount: number
  agreementUrl?: string
  notes?: string
  leadId: string
  lead?: Pick<Lead, 'id' | 'name' | 'source'>
  customerId: string
  customer?: Pick<Customer, 'id' | 'name' | 'mobile' | 'email' | 'isKycVerified'>
  inventoryId: string
  inventory?: Pick<Inventory, 'id' | 'unitNumber' | 'tower' | 'floor' | 'area'>
  quotationId?: string
  quotation?: Pick<Quotation, 'id' | 'quotationNumber' | 'totalAmount'>
  createdAt: string
  updatedAt: string
  _count?: {
    payments: number
    invoices: number
  }
}

export interface BookingWithRelations extends Booking {
  invoices: Invoice[]
  payments: Payment[]
  milestones: PaymentMilestone[]
  documents: Document[]
  siteVisits: SiteVisit[]
}

export interface Invoice {
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  amount: number
  gstAmount: number
  totalAmount: number
  dueDate?: string
  paidDate?: string
  pdfUrl?: string
  notes?: string
  bookingId: string
  booking?: Pick<Booking, 'id'> & {
    customer?: Pick<Customer, 'name' | 'mobile'>
  }
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMode: string
  transactionId?: string
  receiptUrl?: string
  notes?: string
  bookingId: string
  booking?: Pick<Booking, 'id'> & {
    customer?: Pick<Customer, 'name'>
    inventory?: Pick<Inventory, 'unitNumber'>
  }
  customerId: string
  createdAt: string
}

export interface SiteVisit {
  id: string
  scheduledAt: string
  visitedAt?: string
  feedback?: string
  isCompleted: boolean
  notes?: string
  leadId: string
  bookingId?: string
  createdAt: string
}

export interface Document {
  id: string
  name: string
  category: DocumentCategory
  url: string
  size?: number
  mimeType?: string
  version: number
  customerId?: string
  bookingId?: string
  createdAt: string
}

export interface EmailLog {
  id: string
  to: string
  subject: string
  status: string
  openedAt?: string
  createdAt: string
  leadId?: string
  lead?: Pick<Lead, 'name'>
}

export interface WhatsappLog {
  id: string
  to: string
  message: string
  status: string
  createdAt: string
  leadId?: string
  lead?: Pick<Lead, 'name'>
}

export interface Notification {
  id: string
  title: string
  message: string
  channel: NotificationChannel
  isRead: boolean
  metadata?: Record<string, any>
  createdAt: string
  userId: string
}

// ---- API Response Types ----

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface DashboardStats {
  totalLeads: number
  newLeadsToday: number
  followupsDue: number
  siteVisitsThisMonth: number
  bookingsThisMonth: number
  totalBookings: number
  collectionsThisMonth: number
  dueAmount: number
  inventoryAvailable: number
  inventorySold: number
  leadGrowth: number
  bookingGrowth: number
}

export interface TeamPerformance extends Pick<User, 'id' | 'name' | 'role' | 'avatar'> {
  leads: number
  bookings: number
  callLogs: number
  siteVisits: number
  conversionRate: string
}

export interface LeadSourceAnalytics {
  source: LeadSource
  count: number
  percentage: string
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  transactions: number
}

// ---- Form Types ----

export interface CreateLeadForm {
  name: string
  mobile: string
  email?: string
  budget?: number
  city?: string
  source: LeadSource
  status?: LeadStatus
  propertyType?: PropertyType
  projectId?: string
  assignedToId?: string
  remarks?: string
  tags?: string[]
  nextFollowupDate?: string
}

export interface CreateQuotationForm {
  leadId?: string
  projectId?: string
  inventoryId?: string
  propertyType: PropertyType
  baseRate: number
  area: number
  floorRise?: number
  plcCharges?: number
  maintenanceCharges?: number
  parkingCharges?: number
  clubhouseCharges?: number
  legalCharges?: number
  gstRate?: number
  discount?: number
  bookingAmount?: number
  validDays?: number
  notes?: string
}

export interface CreateBookingForm {
  leadId: string
  customerId: string
  inventoryId: string
  quotationId?: string
  totalAmount: number
  bookingAmount?: number
  notes?: string
}

export interface CreateCustomerForm {
  name: string
  mobile: string
  email?: string
  alternatePhone?: string
  panNumber?: string
  aadhaarNumber?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
}

export interface AddPaymentForm {
  amount: number
  paymentMode: string
  transactionId?: string
  notes?: string
}
