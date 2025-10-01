/**
 * Real Economic Data Fetcher - FRED API Integration
 *
 * CRITICAL: This fetcher uses ONLY real economic data from FRED API.
 * NO SYNTHETIC DATA. NO FALLBACKS. NO ESTIMATIONS.
 *
 * When FRED API is unavailable, methods return empty arrays with explicit warnings.
 * Follows REAL DATA ONLY ENFORCEMENT policy from CLAUDE.md
 */

import { FREDAPIClient, HOUSING_SERIES, EMPLOYMENT_SERIES, type FREDDataPoint } from './fred-api-client';

export interface RealHousingData {
  date: string;
  caseSillerIndex: number | null;
  housingStarts: number | null;
  monthsSupply: number | null;
  newHomeSales: number | null;
  priceChangeMonthly?: number | null;
  priceChangeYearly?: number | null;
  dataAvailability: {
    caseSillerAvailable: boolean;
    housingStartsAvailable: boolean;
    monthsSupplyAvailable: boolean;
    newHomeSalesAvailable: boolean;
  };
}

export interface RealLaborData {
  date: string;
  initialClaims: number | null;
  continuedClaims: number | null;
  claims4Week: number | null;
  unemploymentRate: number | null;
  nonfarmPayrolls: number | null;
  laborParticipation: number | null;
  jobOpenings: number | null;
  weeklyChangeInitial?: number | null;
  weeklyChangeContinued?: number | null;
  monthlyChangePayrolls?: number | null;
  dataAvailability: {
    claimsAvailable: boolean;
    unemploymentAvailable: boolean;
    payrollsAvailable: boolean;
    participationAvailable: boolean;
    openingsAvailable: boolean;
  };
}

export interface DataProvenanceRecord {
  source: 'FRED' | 'UNAVAILABLE';
  seriesId: string;
  lastUpdated: string | null;
  dataPoints: number;
  apiSuccess: boolean;
  errorMessage?: string;
}

export class RealEconomicDataFetcher {
  private fredClient: FREDAPIClient | null = null;
  private provenanceLog: DataProvenanceRecord[] = [];

  constructor(fredApiKey?: string) {
    try {
      const key = fredApiKey || process.env.FRED_API_KEY;

      if (!key) {
        console.warn('⚠️ FRED_API_KEY not provided - economic data will be unavailable');
        console.warn('⚠️ NO SYNTHETIC DATA will be generated as fallback');
        this.fredClient = null;
        return;
      }

      this.fredClient = new FREDAPIClient({ apiKey: key });
      console.log('✅ FRED API Client initialized for real economic data');

    } catch (error) {
      console.error('❌ Failed to initialize FRED API client:', error);
      console.warn('⚠️ Economic data will be unavailable - NO SYNTHETIC FALLBACK');
      this.fredClient = null;
    }
  }

  /**
   * Fetch real housing market data from FRED API ONLY
   *
   * CRITICAL: Returns empty array if FRED API unavailable - NO SYNTHETIC DATA
   */
  async fetchRealHousingData(months: number = 12): Promise<RealHousingData[]> {
    if (!this.fredClient) {
      console.log('⚠️ FRED API unavailable - no housing data accessed');
      console.log('⚠️ NO SYNTHETIC DATA generated as fallback');
      return [];
    }

    try {
      console.log('🏠 Fetching REAL housing data from FRED API...');

      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch REAL economic data from FRED
      const [caseSillerData, housingStartsData, monthsSupplyData, newHomeSalesData] = await Promise.all([
        this.fetchWithProvenance(HOUSING_SERIES.CASE_SHILLER, startDate, endDate),
        this.fetchWithProvenance(HOUSING_SERIES.HOUSING_STARTS, startDate, endDate),
        this.fetchWithProvenance(HOUSING_SERIES.MONTHS_SUPPLY, startDate, endDate),
        this.fetchWithProvenance(HOUSING_SERIES.NEW_HOME_SALES, startDate, endDate)
      ]);

      console.log(`📊 Retrieved REAL FRED data: Case-Shiller=${caseSillerData.length}, Starts=${housingStartsData.length}, Supply=${monthsSupplyData.length}, Sales=${newHomeSalesData.length} points`);

      // Merge data by date
      const mergedData = this.mergeHousingDataByDate(
        caseSillerData,
        housingStartsData,
        monthsSupplyData,
        newHomeSalesData
      );

      console.log(`✅ Processed ${mergedData.length} real housing data points from FRED`);
      return mergedData;

    } catch (error) {
      console.error('❌ Error fetching real housing data from FRED:', error);
      console.log('⚠️ Returning empty array - NO SYNTHETIC FALLBACK');
      return [];
    }
  }

  /**
   * Fetch real labor market data from FRED API ONLY
   *
   * CRITICAL: Returns empty array if FRED API unavailable - NO SYNTHETIC DATA
   */
  async fetchRealLaborData(weeks: number = 52): Promise<RealLaborData[]> {
    if (!this.fredClient) {
      console.log('⚠️ FRED API unavailable - no labor data accessed');
      console.log('⚠️ NO SYNTHETIC DATA generated as fallback');
      return [];
    }

    try {
      console.log('👥 Fetching REAL labor data from FRED API...');

      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch REAL economic data from FRED
      const [initialClaimsData, continuedClaimsData, claims4WkData, unemploymentData, payrollsData, participationData, openingsData] = await Promise.all([
        this.fetchWithProvenance(EMPLOYMENT_SERIES.INITIAL_CLAIMS, startDate, endDate),
        this.fetchWithProvenance(EMPLOYMENT_SERIES.CONTINUED_CLAIMS, startDate, endDate),
        this.fetchWithProvenance(EMPLOYMENT_SERIES.CLAIMS_4WK_AVG, startDate, endDate),
        this.fetchWithProvenance(EMPLOYMENT_SERIES.UNEMPLOYMENT_RATE, startDate, endDate),
        this.fetchWithProvenance(EMPLOYMENT_SERIES.NONFARM_PAYROLLS, startDate, endDate),
        this.fetchWithProvenance(EMPLOYMENT_SERIES.LABOR_PARTICIPATION, startDate, endDate),
        this.fetchWithProvenance(EMPLOYMENT_SERIES.JOB_OPENINGS, startDate, endDate)
      ]);

      console.log(`📊 Retrieved REAL FRED data: Claims=${initialClaimsData.length}, Unemployment=${unemploymentData.length}, Payrolls=${payrollsData.length} points`);

      // Merge data by date
      const mergedData = this.mergeLaborDataByDate(
        initialClaimsData,
        continuedClaimsData,
        claims4WkData,
        unemploymentData,
        payrollsData,
        participationData,
        openingsData
      );

      console.log(`✅ Processed ${mergedData.length} real labor data points from FRED`);
      return mergedData;

    } catch (error) {
      console.error('❌ Error fetching real labor data from FRED:', error);
      console.log('⚠️ Returning empty array - NO SYNTHETIC FALLBACK');
      return [];
    }
  }

  /**
   * Test API connectivity - verifies FRED API is accessible
   */
  async testAPIConnectivity(): Promise<{ fred: boolean; message: string }> {
    if (!this.fredClient) {
      return {
        fred: false,
        message: 'FRED API client not initialized - API key missing or invalid'
      };
    }

    try {
      // Test FRED with a simple series fetch
      const testData = await this.fredClient.getSeriesObservations(EMPLOYMENT_SERIES.UNEMPLOYMENT_RATE, { limit: 1 });
      const success = Array.isArray(testData) && testData.length > 0;

      console.log('🔑 FRED API:', success ? '✅ Connected' : '❌ Failed');

      return {
        fred: success,
        message: success ? 'FRED API connected successfully' : 'FRED API connection failed'
      };
    } catch (error) {
      console.log('🔑 FRED API: ❌ Connection Error:', error instanceof Error ? error.message : 'Unknown error');
      return {
        fred: false,
        message: `FRED API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get data provenance log for audit trail
   */
  getProvenanceLog(): DataProvenanceRecord[] {
    return [...this.provenanceLog];
  }

  /**
   * Clear provenance log
   */
  clearProvenanceLog(): void {
    this.provenanceLog = [];
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Fetch data with provenance tracking for audit trail
   */
  private async fetchWithProvenance(seriesId: string, startDate: string, endDate: string): Promise<FREDDataPoint[]> {
    if (!this.fredClient) {
      this.provenanceLog.push({
        source: 'UNAVAILABLE',
        seriesId,
        lastUpdated: null,
        dataPoints: 0,
        apiSuccess: false,
        errorMessage: 'FRED API client not initialized'
      });
      return [];
    }

    try {
      const data = await this.fredClient.getSeriesObservations(seriesId, {
        startDate,
        endDate,
        sortOrder: 'asc'
      });

      this.provenanceLog.push({
        source: 'FRED',
        seriesId,
        lastUpdated: data.length > 0 ? data[data.length - 1].date : null,
        dataPoints: data.length,
        apiSuccess: true
      });

      return data;

    } catch (error) {
      this.provenanceLog.push({
        source: 'UNAVAILABLE',
        seriesId,
        lastUpdated: null,
        dataPoints: 0,
        apiSuccess: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      console.error(`❌ Failed to fetch FRED series ${seriesId}:`, error);
      return [];
    }
  }

  /**
   * Merge housing data by date
   */
  private mergeHousingDataByDate(
    caseSillerData: FREDDataPoint[],
    housingStartsData: FREDDataPoint[],
    monthsSupplyData: FREDDataPoint[],
    newHomeSalesData: FREDDataPoint[]
  ): RealHousingData[] {
    const dataByDate = new Map<string, RealHousingData>();

    // Helper to add data point
    const addDataPoint = (date: string) => {
      if (!dataByDate.has(date)) {
        dataByDate.set(date, {
          date,
          caseSillerIndex: null,
          housingStarts: null,
          monthsSupply: null,
          newHomeSales: null,
          dataAvailability: {
            caseSillerAvailable: false,
            housingStartsAvailable: false,
            monthsSupplyAvailable: false,
            newHomeSalesAvailable: false
          }
        });
      }
    };

    // Merge Case-Shiller data
    caseSillerData.forEach(point => {
      addDataPoint(point.date);
      const entry = dataByDate.get(point.date)!;
      entry.caseSillerIndex = typeof point.value === 'number' ? point.value : parseFloat(point.value as string);
      entry.dataAvailability.caseSillerAvailable = true;
    });

    // Merge Housing Starts data
    housingStartsData.forEach(point => {
      addDataPoint(point.date);
      const entry = dataByDate.get(point.date)!;
      entry.housingStarts = typeof point.value === 'number' ? point.value : parseFloat(point.value as string);
      entry.dataAvailability.housingStartsAvailable = true;
    });

    // Merge Months Supply data
    monthsSupplyData.forEach(point => {
      addDataPoint(point.date);
      const entry = dataByDate.get(point.date)!;
      entry.monthsSupply = typeof point.value === 'number' ? point.value : parseFloat(point.value as string);
      entry.dataAvailability.monthsSupplyAvailable = true;
    });

    // Merge New Home Sales data
    newHomeSalesData.forEach(point => {
      addDataPoint(point.date);
      const entry = dataByDate.get(point.date)!;
      entry.newHomeSales = typeof point.value === 'number' ? point.value : parseFloat(point.value as string);
      entry.dataAvailability.newHomeSalesAvailable = true;
    });

    // Convert to array and sort by date (newest first)
    return Array.from(dataByDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Merge labor data by date
   */
  private mergeLaborDataByDate(
    initialClaimsData: FREDDataPoint[],
    continuedClaimsData: FREDDataPoint[],
    claims4WkData: FREDDataPoint[],
    unemploymentData: FREDDataPoint[],
    payrollsData: FREDDataPoint[],
    participationData: FREDDataPoint[],
    openingsData: FREDDataPoint[]
  ): RealLaborData[] {
    const dataByDate = new Map<string, RealLaborData>();

    // Helper to add data point
    const addDataPoint = (date: string) => {
      if (!dataByDate.has(date)) {
        dataByDate.set(date, {
          date,
          initialClaims: null,
          continuedClaims: null,
          claims4Week: null,
          unemploymentRate: null,
          nonfarmPayrolls: null,
          laborParticipation: null,
          jobOpenings: null,
          dataAvailability: {
            claimsAvailable: false,
            unemploymentAvailable: false,
            payrollsAvailable: false,
            participationAvailable: false,
            openingsAvailable: false
          }
        });
      }
    };

    // Merge all data sources
    initialClaimsData.forEach(point => {
      addDataPoint(point.date);
      const entry = dataByDate.get(point.date)!;
      entry.initialClaims = typeof point.value === 'number' ? point.value : parseFloat(point.value as string);
      entry.dataAvailability.claimsAvailable = true;
    });

    continuedClaimsData.forEach(point => {
      addDataPoint(point.date);
      const entry = dataByDate.get(point.date)!;
      entry.continuedClaims = typeof point.value === 'number' ? point.value : parseFloat(point.value as string);
      entry.dataAvailability.claimsAvailable = true;
    });

    claims4WkData.forEach(point => {
      addDataPoint(point.date);
      const entry = dataByDate.get(point.date)!;
      entry.claims4Week = typeof point.value === 'number' ? point.value : parseFloat(point.value as string);
    });

    unemploymentData.forEach(point => {
      addDataPoint(point.date);
      const entry = dataByDate.get(point.date)!;
      entry.unemploymentRate = typeof point.value === 'number' ? point.value : parseFloat(point.value as string);
      entry.dataAvailability.unemploymentAvailable = true;
    });

    payrollsData.forEach(point => {
      addDataPoint(point.date);
      const entry = dataByDate.get(point.date)!;
      entry.nonfarmPayrolls = typeof point.value === 'number' ? point.value : parseFloat(point.value as string);
      entry.dataAvailability.payrollsAvailable = true;
    });

    participationData.forEach(point => {
      addDataPoint(point.date);
      const entry = dataByDate.get(point.date)!;
      entry.laborParticipation = typeof point.value === 'number' ? point.value : parseFloat(point.value as string);
      entry.dataAvailability.participationAvailable = true;
    });

    openingsData.forEach(point => {
      addDataPoint(point.date);
      const entry = dataByDate.get(point.date)!;
      entry.jobOpenings = typeof point.value === 'number' ? point.value : parseFloat(point.value as string);
      entry.dataAvailability.openingsAvailable = true;
    });

    // Convert to array and sort by date (newest first)
    return Array.from(dataByDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  }
}
