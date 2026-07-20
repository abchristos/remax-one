-- CreateTable
CREATE TABLE "AgentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AGENT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    CONSTRAINT "AgentAlias_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_email_key" ON "AgentProfile"("email");

-- CreateIndex
CREATE INDEX "AgentAlias_name_idx" ON "AgentAlias"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AgentAlias_agentId_name_key" ON "AgentAlias"("agentId", "name");

-- CreateIndex
CREATE INDEX "AuditLog_email_createdAt_idx" ON "AuditLog"("email", "createdAt");
