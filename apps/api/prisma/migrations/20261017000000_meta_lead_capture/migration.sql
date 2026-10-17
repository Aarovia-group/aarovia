ALTER TABLE "leads" ADD COLUMN "metaLeadId" TEXT;

CREATE UNIQUE INDEX "leads_metaLeadId_key" ON "leads"("metaLeadId");

CREATE TABLE "meta_webhook_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" JSONB,
    "signatureValid" BOOLEAN,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "leadId" TEXT,

    CONSTRAINT "meta_webhook_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "meta_webhook_logs"
ADD CONSTRAINT "meta_webhook_logs_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
