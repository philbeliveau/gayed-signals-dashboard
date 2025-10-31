-- CreateTable
CREATE TABLE "market_data" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(10,4),
    "high" DECIMAL(10,4),
    "low" DECIMAL(10,4),
    "close" DECIMAL(10,4) NOT NULL,
    "volume" BIGINT,
    "source" TEXT NOT NULL,
    "fetchTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validationStatus" TEXT,
    "qualityScore" DECIMAL(3,2),

    CONSTRAINT "market_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_provenance" (
    "id" TEXT NOT NULL,
    "fetchId" TEXT NOT NULL,
    "marketDataId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "symbols" TEXT[],
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apiSuccess" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "confidence" DECIMAL(5,2) NOT NULL,
    "requestMetadata" JSONB,
    "responseMetadata" JSONB,

    CONSTRAINT "data_provenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_source_health" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "healthScore" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "lastSuccess" TIMESTAMP(3),
    "lastFailure" TIMESTAMP(3),
    "errorRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_source_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache_metadata" (
    "key" TEXT NOT NULL,
    "dataHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cache_metadata_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "signal_history" (
    "id" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "signalValue" TEXT NOT NULL,
    "confidence" DECIMAL(5,2) NOT NULL,
    "rawValue" DECIMAL(10,4),
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataProvenanceId" TEXT,
    "inputDataIds" TEXT[],
    "calculationMetadata" JSONB,
    "qualityMetrics" JSONB,

    CONSTRAINT "signal_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_data_symbol_date_idx" ON "market_data"("symbol", "date");

-- CreateIndex
CREATE UNIQUE INDEX "market_data_symbol_date_source_key" ON "market_data"("symbol", "date", "source");

-- CreateIndex
CREATE INDEX "data_provenance_fetchId_idx" ON "data_provenance"("fetchId");

-- CreateIndex
CREATE INDEX "data_provenance_source_fetchedAt_idx" ON "data_provenance"("source", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "data_provenance_fetchId_key" ON "data_provenance"("fetchId");

-- CreateIndex
CREATE INDEX "data_source_health_enabled_healthScore_idx" ON "data_source_health"("enabled", "healthScore");

-- CreateIndex
CREATE UNIQUE INDEX "data_source_health_name_key" ON "data_source_health"("name");

-- CreateIndex
CREATE INDEX "cache_metadata_expiresAt_idx" ON "cache_metadata"("expiresAt");

-- CreateIndex
CREATE INDEX "signal_history_signalType_calculatedAt_idx" ON "signal_history"("signalType", "calculatedAt");

-- AddForeignKey
ALTER TABLE "data_provenance" ADD CONSTRAINT "data_provenance_marketDataId_fkey" FOREIGN KEY ("marketDataId") REFERENCES "market_data"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
