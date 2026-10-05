ALTER TABLE "invoices"
ADD COLUMN IF NOT EXISTS "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 5;

UPDATE "invoices"
SET "gstRate" = CASE
  WHEN "amount" > 0 THEN ("gstAmount" / "amount") * 100
  ELSE 0
END;
