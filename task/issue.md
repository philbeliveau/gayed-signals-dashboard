_points(series_id, observation_date DESC, created_at DESC);'
2025-06-30 21:54:49,603 - core.database - INFO - Performance indexes created successfully
2025-06-30 21:54:49,603 - core.database - INFO - Database tables, RLS policies, and performance indexes created successfully
2025-06-30 21:54:49,603 - main - INFO - Database tables created successfully
2025-06-30 21:54:49,603 - main - INFO - Temporary directory initialized
INFO:     Application startup complete.
2025-06-30 21:54:56,999 - api.routes.economic_data - INFO - Fetching housing summary, region: national, period: TimePeriod.TWELVE_MONTHS
2025-06-30 21:54:57,000 - api.routes.economic_data - INFO - Fetching real housing market data from FRED service...
2025-06-30 21:54:57,000 - services.fred_service - INFO - Fetching comprehensive housing market data from FRED...
2025-06-30 21:54:57,010 - services.fred_service - ERROR - Error fetching FRED series CSUSHPINSA: Error 22 connecting to localhost:6379. 22.
2025-06-30 21:54:57,010 - services.fred_service - ERROR - Error fetching housing series CASE_SHILLER: Error 22 connecting to localhost:6379. 22.
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching FRED series HOUST: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching housing series HOUSING_STARTS: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching FRED series MSACSR: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching housing series MONTHS_SUPPLY: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching FRED series HSN1F: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching housing series NEW_HOME_SALES: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching FRED series EXHOSLUSM495S: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching housing series EXISTING_HOME_SALES: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching FRED series PERMIT: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching housing series HOUSING_PERMITS: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching FRED series MORTGAGE30US: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching housing series MORTGAGE_RATES: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching FRED series USSTHPI: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - services.fred_service - ERROR - Error fetching housing series HOUSE_PRICE_INDEX: '_AsyncRESP2Parser' object has no attribute '_connected'
2025-06-30 21:54:57,011 - api.routes.economic_data - INFO - Successfully retrieved housing data from FRED
2025-06-30 21:54:57,112 - api.routes.economic_data - INFO - Successfully generated housing summary for region national
INFO:     127.0.0.1:58753 - "GET /api/v1/economic/housing/summary?region=national&period=12m&fast=false HTTP/1.1" 200 O