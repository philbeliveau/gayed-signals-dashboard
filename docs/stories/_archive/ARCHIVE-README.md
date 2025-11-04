# Archived Stories

This directory contains stories that have been superseded, merged, or are no longer relevant to the current architecture.

## Archived Stories

### 4.0h.backtest-real-data-signals.OLD.md
- **Archived Date:** 2025-11-03
- **Reason:** Superseded by Story 4.0i (Backtesting Railway Backend Integration)
- **Status:** Draft (never implemented)
- **Why Superseded:**
  - Story 4.0i provides comprehensive Railway backend integration for backtesting
  - Story 4.0h referenced using UnifiedDataService directly (incorrect pattern for frontend)
  - Story 4.0i includes all features from 4.0h plus Railway backend, data quality validation, and provenance tracking
  - Both stories aimed to remove synthetic data and use real market data for backtesting

**Migration Path:** Implement Story 4.0i instead, which includes all 4.0h requirements plus Railway backend integration.

### 4.0h.backtest-data-integration.OLD.md
- **Archived Date:** (Previous archive)
- **Reason:** Renamed/restructured into current story format
- **Status:** Superseded by later iterations

---

**Note:** Archived stories are kept for historical reference and should not be implemented. Always refer to the active stories in the parent `stories/` directory.
