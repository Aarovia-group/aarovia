ALTER TABLE "whatsapp_logs"
ADD COLUMN "providerMessageId" TEXT,
ADD COLUMN "providerError" TEXT;

CREATE INDEX "whatsapp_logs_providerMessageId_idx"
ON "whatsapp_logs"("providerMessageId");

ALTER TABLE "whatsapp_logs"
ALTER COLUMN "status" SET DEFAULT 'PENDING';
