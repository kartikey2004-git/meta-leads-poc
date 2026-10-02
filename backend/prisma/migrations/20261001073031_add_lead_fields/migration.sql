-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "metaLeadId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "customFields" JSONB,
    "createdTime" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_metaLeadId_key" ON "Lead"("metaLeadId");

-- CreateIndex
CREATE INDEX "Lead_formId_idx" ON "Lead"("formId");

-- CreateIndex
CREATE INDEX "Lead_createdTime_idx" ON "Lead"("createdTime");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
