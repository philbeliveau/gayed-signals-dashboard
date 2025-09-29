-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentTitle" VARCHAR(500) NOT NULL,
    "contentContent" TEXT NOT NULL,
    "contentUrl" TEXT,
    "contentAuthor" VARCHAR(200),
    "contentPublishedAt" TIMESTAMP(3),
    "contentMetadata" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'initialized',
    "consensusReached" BOOLEAN NOT NULL DEFAULT false,
    "finalRecommendation" TEXT,
    "confidenceScore" REAL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "agentName" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "confidenceLevel" REAL,
    "messageOrder" INTEGER NOT NULL,
    "citedSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signalReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "public"."users"("clerkId");

-- CreateIndex
CREATE INDEX "conversations_userId_createdAt_idx" ON "public"."conversations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "conversations_status_createdAt_idx" ON "public"."conversations"("status", "createdAt");

-- CreateIndex
CREATE INDEX "conversations_contentType_createdAt_idx" ON "public"."conversations"("contentType", "createdAt");

-- CreateIndex
CREATE INDEX "agent_messages_conversationId_messageOrder_idx" ON "public"."agent_messages"("conversationId", "messageOrder");

-- CreateIndex
CREATE INDEX "agent_messages_agentType_timestamp_idx" ON "public"."agent_messages"("agentType", "timestamp");

-- CreateIndex
CREATE INDEX "agent_messages_timestamp_idx" ON "public"."agent_messages"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_messages" ADD CONSTRAINT "agent_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
