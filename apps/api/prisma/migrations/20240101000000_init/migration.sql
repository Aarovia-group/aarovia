-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'TELECALLER', 'ACCOUNTS', 'CRM_TEAM', 'POST_SALES');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'FOLLOWUP', 'INTERESTED', 'QUALIFIED', 'SITE_VISIT_FIXED', 'SITE_VISIT_DONE', 'OPPORTUNITY', 'OPPORTUNITY_FOLLOW', 'OPPORTUNITY_INTERESTED', 'OPPORTUNITY_NOT_INTERESTED', 'OPPORTUNITY_CLOSED', 'BOOKED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('MAGICBRICKS', 'FACEBOOK', 'META_ADS', 'GOOGLE_ADS', 'ACRES_99', 'WEBSITE', 'DIRECT_CALL', 'WALK_IN', 'REFERRAL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('VILLA', 'APARTMENT', 'PLOT', 'FARMLAND', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'BLOCKED', 'SOLD', 'RESERVED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SHARED', 'NEGOTIATION', 'APPROVED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('PENDING', 'INITIATED', 'IN_PROGRESS', 'COMPLETED', 'REGISTERED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIAL_PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'IN_APP');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('AGREEMENT', 'PAN_CARD', 'AADHAAR', 'PAYMENT_RECEIPT', 'QUOTATION', 'BROCHURE', 'OTHER');

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SALES_EXECUTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: projects
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "reraNumber" TEXT,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "availableUnits" INTEGER NOT NULL DEFAULT 0,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "propertyTypes" TEXT[],
    "amenities" TEXT[],
    "brochureUrl" TEXT,
    "sitemapUrl" TEXT,
    "images" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: leads
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "budget" DOUBLE PRECISION,
    "city" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "propertyType" "PropertyType",
    "remarks" TEXT,
    "tags" TEXT[],
    "score" INTEGER NOT NULL DEFAULT 0,
    "nextFollowupDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable: customers
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "mobile" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "panNumber" TEXT,
    "aadhaarNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "isKycVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: inventory
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "tower" TEXT,
    "floor" INTEGER,
    "area" DOUBLE PRECISION NOT NULL,
    "facing" TEXT,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "finalRate" DOUBLE PRECISION,
    "status" "InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "propertyType" "PropertyType" NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "floorPlanUrl" TEXT,
    "notes" TEXT,
    "projectId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: quotations
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "propertyType" "PropertyType" NOT NULL,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "floorRise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plcCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maintenanceCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parkingCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clubhouseCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "legalCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "bookingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "pdfUrl" TEXT,
    "leadId" TEXT,
    "inventoryId" TEXT,
    "projectId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bookings
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agreementStatus" "AgreementStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "collectedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueAmount" DOUBLE PRECISION NOT NULL,
    "agreementUrl" TEXT,
    "notes" TEXT,
    "leadId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "quotationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: invoices
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "amount" DOUBLE PRECISION NOT NULL,
    "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "notes" TEXT,
    "bookingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payments
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMode" TEXT NOT NULL,
    "transactionId" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "bookingId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: settings
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: activities, call_logs, notes, tasks, site_visits, documents, email_templates, email_logs, whatsapp_logs, login_history, payment_milestones
CREATE TABLE "activities" ("id" TEXT NOT NULL, "type" TEXT NOT NULL, "description" TEXT NOT NULL, "metadata" JSONB, "leadId" TEXT, "userId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "activities_pkey" PRIMARY KEY ("id"));
CREATE TABLE "call_logs" ("id" TEXT NOT NULL, "duration" INTEGER, "outcome" TEXT, "notes" TEXT, "recordingUrl" TEXT, "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "leadId" TEXT NOT NULL, "userId" TEXT NOT NULL, CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id"));
CREATE TABLE "notes" ("id" TEXT NOT NULL, "content" TEXT NOT NULL, "leadId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "notes_pkey" PRIMARY KEY ("id"));
CREATE TABLE "tasks" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "dueDate" TIMESTAMP(3) NOT NULL, "isCompleted" BOOLEAN NOT NULL DEFAULT false, "priority" TEXT NOT NULL DEFAULT 'MEDIUM', "leadId" TEXT, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"));
CREATE TABLE "site_visits" ("id" TEXT NOT NULL, "scheduledAt" TIMESTAMP(3) NOT NULL, "visitedAt" TIMESTAMP(3), "feedback" TEXT, "isCompleted" BOOLEAN NOT NULL DEFAULT false, "notes" TEXT, "leadId" TEXT NOT NULL, "bookingId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id"));
CREATE TABLE "documents" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "category" "DocumentCategory" NOT NULL, "url" TEXT NOT NULL, "size" INTEGER, "mimeType" TEXT, "version" INTEGER NOT NULL DEFAULT 1, "customerId" TEXT, "bookingId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "documents_pkey" PRIMARY KEY ("id"));
CREATE TABLE "email_logs" ("id" TEXT NOT NULL, "to" TEXT NOT NULL, "subject" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'SENT', "openedAt" TIMESTAMP(3), "leadId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id"));
CREATE TABLE "whatsapp_logs" ("id" TEXT NOT NULL, "to" TEXT NOT NULL, "message" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'SENT', "leadId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id"));
CREATE TABLE "login_history" ("id" TEXT NOT NULL, "ipAddress" TEXT, "userAgent" TEXT, "device" TEXT, "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "userId" TEXT NOT NULL, CONSTRAINT "login_history_pkey" PRIMARY KEY ("id"));
CREATE TABLE "payment_milestones" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "percentage" DOUBLE PRECISION NOT NULL, "amount" DOUBLE PRECISION NOT NULL, "dueDate" TIMESTAMP(3), "isPaid" BOOLEAN NOT NULL DEFAULT false, "paidDate" TIMESTAMP(3), "quotationId" TEXT NOT NULL, "bookingId" TEXT, CONSTRAINT "payment_milestones_pkey" PRIMARY KEY ("id"));
CREATE TABLE "email_templates" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "subject" TEXT NOT NULL, "body" TEXT NOT NULL, "propertyType" "PropertyType", "variables" TEXT[], "isActive" BOOLEAN NOT NULL DEFAULT true, "projectId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id"));

-- Unique constraints
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "inventory_projectId_unitNumber_key" ON "inventory"("projectId", "unitNumber");
CREATE UNIQUE INDEX "quotations_quotationNumber_key" ON "quotations"("quotationNumber");
CREATE UNIQUE INDEX "bookings_bookingNumber_key" ON "bookings"("bookingNumber");
CREATE UNIQUE INDEX "bookings_leadId_key" ON "bookings"("leadId");
CREATE UNIQUE INDEX "bookings_inventoryId_key" ON "bookings"("inventoryId");
CREATE UNIQUE INDEX "bookings_quotationId_key" ON "bookings"("quotationId");
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- Foreign Keys
ALTER TABLE "leads" ADD CONSTRAINT "leads_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
