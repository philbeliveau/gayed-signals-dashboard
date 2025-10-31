-- CreateTable
CREATE TABLE "validation_results" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_count" INTEGER NOT NULL,
    "errors" JSONB[] NOT NULL,
    "warnings" JSONB[] NOT NULL,
    "score" DECIMAL(5,4) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "validation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "validation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarantined_data" (
    "id" TEXT NOT NULL,
    "original_data" JSONB NOT NULL,
    "validation_errors" JSONB[] NOT NULL,
    "source" TEXT NOT NULL,
    "symbol" TEXT,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "action" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quarantined_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_metrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_validations" INTEGER NOT NULL,
    "passed_count" INTEGER NOT NULL,
    "failed_count" INTEGER NOT NULL,
    "warning_count" INTEGER NOT NULL,
    "average_score" DECIMAL(5,4) NOT NULL,
    "p95_score" DECIMAL(5,4) NOT NULL,
    "p99_score" DECIMAL(5,4) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "validation_results_timestamp_idx" ON "validation_results"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "validation_results_score_idx" ON "validation_results"("score");

-- CreateIndex
CREATE UNIQUE INDEX "validation_rules_name_key" ON "validation_rules"("name");

-- CreateIndex
CREATE INDEX "validation_rules_category_idx" ON "validation_rules"("category");

-- CreateIndex
CREATE INDEX "validation_rules_enabled_idx" ON "validation_rules"("enabled");

-- CreateIndex
CREATE INDEX "quarantined_data_symbol_idx" ON "quarantined_data"("symbol");

-- CreateIndex
CREATE INDEX "quarantined_data_reviewed_idx" ON "quarantined_data"("reviewed");

-- CreateIndex
CREATE INDEX "quarantined_data_timestamp_idx" ON "quarantined_data"("timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "validation_metrics_date_key" ON "validation_metrics"("date");

-- CreateIndex
CREATE INDEX "validation_metrics_date_idx" ON "validation_metrics"("date" DESC);
