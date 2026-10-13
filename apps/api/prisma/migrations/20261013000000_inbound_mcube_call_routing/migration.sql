CREATE TYPE "IncomingCallChannel" AS ENUM ('DIGITAL', 'ATL_BTL');

ALTER TABLE "call_logs"
  ALTER COLUMN "userId" DROP NOT NULL,
  ADD COLUMN "callId" TEXT,
  ADD COLUMN "caller" TEXT,
  ADD COLUMN "did" TEXT,
  ADD COLUMN "direction" TEXT,
  ADD COLUMN "endTime" TIMESTAMP(3),
  ADD COLUMN "rawPayload" JSONB;

CREATE UNIQUE INDEX "call_logs_callId_key" ON "call_logs"("callId");

CREATE TABLE "incoming_call_dids" (
  "id" TEXT NOT NULL,
  "did" TEXT NOT NULL,
  "channel" "IncomingCallChannel" NOT NULL,
  "outgoingDid" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "roundRobinCursor" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "projectId" TEXT,
  CONSTRAINT "incoming_call_dids_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "incoming_call_did_agents" (
  "incomingCallDidId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "incoming_call_did_agents_pkey" PRIMARY KEY ("incomingCallDidId", "userId")
);

CREATE UNIQUE INDEX "incoming_call_dids_did_key" ON "incoming_call_dids"("did");
CREATE UNIQUE INDEX "incoming_call_did_agents_incomingCallDidId_position_key"
  ON "incoming_call_did_agents"("incomingCallDidId", "position");
CREATE INDEX "incoming_call_did_agents_userId_idx" ON "incoming_call_did_agents"("userId");

ALTER TABLE "incoming_call_dids"
  ADD CONSTRAINT "incoming_call_dids_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incoming_call_did_agents"
  ADD CONSTRAINT "incoming_call_did_agents_incomingCallDidId_fkey"
  FOREIGN KEY ("incomingCallDidId") REFERENCES "incoming_call_dids"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "incoming_call_did_agents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
