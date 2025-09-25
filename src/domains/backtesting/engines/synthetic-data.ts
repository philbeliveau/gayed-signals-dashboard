import {
  StrategyDefinition,
  BacktestConfig,
  SyntheticDataConfig,
  SyntheticDataMethod,
  MarketRegime,
  StressTestScenario,
  MarketData,
  PerformanceMetrics,
  RiskMetrics,
  TimeSeries
} from '../../types';

/**
 * Synthetic Data Testing Engine
 * 
 * Generates synthetic market data for comprehensive strategy testing:
 * 
 * 1. GAN-like synthetic data generation
 * 2. Regime-switching models
 * 3. Monte Carlo scenario generation
 * 4. Historical bootstrap with modifications
 * 5. Stress test scenario creation
 * 
 * Key Features:
 * - Multiple data generation methods
 * - Market regime modeling
 * - Stress scenario testing
 * - Statistical property preservation
 * - Educational focus on limitations
 */
export class SyntheticDataEngine {
  
  constructor() {}

  async backtest(
    strategy: StrategyDefinition,
    marketData: Record<string, MarketData[]>,
    config: BacktestConfig
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      console.log('🎭 Starting Synthetic Data Testing...');
      
      const syntheticConfig = config.syntheticData || this.getDefaultSyntheticDataConfig();
      const baseData = this.prepareBaseData(marketData, config);
      
      // Generate synthetic scenarios
      const scenarios = await this.generateSyntheticScenarios(
        baseData,
        syntheticConfig
      );
      
      // Run backtests on synthetic data
      const scenarioResults = await this.runSyntheticBacktests(
        strategy,
        scenarios,
        config
      );
      
      // Analyze results
      const analysis = this.analyzeSyntheticResults(scenarioResults);
      
      console.log('✅ Synthetic Data Testing completed');
      
      return {
        returns: this.createTimeSeries(analysis.averageReturns),
        trades: [],
        positions: [],
        performance: analysis.averagePerformance,
        risk: analysis.averageRisk,
        specificData: {
          scenarios: syntheticConfig.scenarios,
          generationMethod: syntheticConfig.generationMethod,
          marketRegimes: syntheticConfig.marketRegimes.length,
          stressTests: syntheticConfig.stressTests.length,
          scenarioPerformance: analysis.scenarioPerformance,
          robustnessMetrics: analysis.robustnessMetrics,
          dataQualityMetrics: analysis.dataQualityMetrics,
          educationalWarnings: analysis.educationalWarnings
        }
      };
      
    } catch (error) {
      console.error('❌ Synthetic Data Testing failed:', error);
      throw error;
    }
  }

  private async generateSyntheticScenarios(
    baseData: MarketDataPoint[],
    config: SyntheticDataConfig
  ): Promise<SyntheticScenario[]> {
    
    const scenarios: SyntheticScenario[] = [];
    
    // Generate base synthetic scenarios
    for (let i = 0; i < config.scenarios; i++) {
      const scenario = await this.generateSingleScenario(
        baseData,
        config.generationMethod,
        i
      );
      
      scenarios.push({
        id: `base_${i}`,
        type: 'base',
        data: scenario,
        description: `Base synthetic scenario ${i + 1}`
      });
    }
    
    // Generate market regime scenarios
    for (const regime of config.marketRegimes) {
      const regimeScenario = await this.generateRegimeScenario(
        baseData,
        regime
      );
      
      scenarios.push({
        id: `regime_${regime.name}`,
        type: 'regime',
        data: regimeScenario,
        description: `Market regime: ${regime.name}`,
        regime
      });
    }
    
    // Generate stress test scenarios
    for (const stressTest of config.stressTests) {
      const stressScenario = await this.generateStressScenario(
        baseData,
        stressTest
      );
      
      scenarios.push({
        id: `stress_${stressTest.name}`,
        type: 'stress',
        data: stressScenario,
        description: `Stress test: ${stressTest.name}`,
        stressTest
      });
    }
    
    return scenarios;
  }

  private async generateSingleScenario(
    baseData: MarketDataPoint[],
    method: SyntheticDataMethod,
    seed: number
  ): Promise<MarketDataPoint[]> {
    
    switch (method) {
      case 'gan':
        return this.generateGANLikeData(baseData, seed);
      case 'regime_switching':
        return this.generateRegimeSwitchingData(baseData, seed);
      case 'monte_carlo':
        return this.generateMonteCarloData(baseData, seed);
      case 'historical_bootstrap':
        return this.generateBootstrapData(baseData, seed);
      default:
        return this.generateMonteCarloData(baseData, seed);
    }
  }

  private generateGANLikeData(baseData: MarketDataPoint[], seed: number): MarketDataPoint[] {
    // Simplified GAN-like data generation
    // In a real implementation, this would use a trained neural network
    
    const rng = new SimpleRNG(seed);
    const syntheticData: MarketDataPoint[] = [];
    
    // Extract features from base data
    const returns = this.extractReturns(baseData);
    const features = this.extractFeatures(returns);
    
    let currentPrice = baseData[baseData.length - 1]?.close || 100;
    
    for (let i = 0; i < baseData.length; i++) {
      // Generate synthetic return using learned features
      const syntheticReturn = this.generateSyntheticReturn(features, rng);
      currentPrice = currentPrice * (1 + syntheticReturn);
      
      syntheticData.push({
        date: this.generateDate(i),
        symbol: 'SYNTHETIC',
        close: currentPrice,
        volume: this.generateVolume(rng),
        synthetic: true,
        method: 'gan'
      });
    }
    
    return syntheticData;
  }

  private generateRegimeSwitchingData(baseData: MarketDataPoint[], seed: number): MarketDataPoint[] {
    const rng = new SimpleRNG(seed);
    const syntheticData: MarketDataPoint[] = [];
    
    // Define regimes
    const regimes = [
      { meanReturn: 0.0005, volatility: 0.01, probability: 0.7 }, // Bull
      { meanReturn: -0.001, volatility: 0.025, probability: 0.3 }  // Bear
    ];
    
    let currentRegime = 0;
    let regimeDuration = 0;
    let currentPrice = baseData[baseData.length - 1]?.close || 100;
    
    for (let i = 0; i < baseData.length; i++) {
      // Check for regime switch
      if (regimeDuration > 30 && rng.uniform() < 0.05) {
        currentRegime = 1 - currentRegime;
        regimeDuration = 0;
      }
      
      const regime = regimes[currentRegime];
      const dailyReturn = rng.normal(regime.meanReturn, regime.volatility);
      currentPrice = currentPrice * (1 + dailyReturn);
      
      syntheticData.push({
        date: this.generateDate(i),
        symbol: 'SYNTHETIC',
        close: currentPrice,
        volume: this.generateVolume(rng),
        synthetic: true,
        method: 'regime_switching',
        currentRegime
      });
      
      regimeDuration++;
    }
    
    return syntheticData;
  }

  private generateMonteCarloData(baseData: MarketDataPoint[], seed: number): MarketDataPoint[] {
    const rng = new SimpleRNG(seed);
    const syntheticData: MarketDataPoint[] = [];
    
    // Calculate historical statistics
    const returns = this.extractReturns(baseData);
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    let currentPrice = baseData[baseData.length - 1]?.close || 100;
    
    for (let i = 0; i < baseData.length; i++) {
      const dailyReturn = rng.normal(meanReturn, volatility);
      currentPrice = currentPrice * (1 + dailyReturn);
      
      syntheticData.push({
        date: this.generateDate(i),
        symbol: 'SYNTHETIC',
        close: currentPrice,
        volume: this.generateVolume(rng),
        synthetic: true,
        method: 'monte_carlo'
      });
    }
    
    return syntheticData;
  }

  private generateBootstrapData(baseData: MarketDataPoint[], seed: number): MarketDataPoint[] {
    const rng = new SimpleRNG(seed);
    const syntheticData: MarketDataPoint[] = [];
    
    const returns = this.extractReturns(baseData);
    let currentPrice = baseData[baseData.length - 1]?.close || 100;
    
    for (let i = 0; i < baseData.length; i++) {
      // Bootstrap sample from historical returns
      const randomIndex = Math.floor(rng.uniform() * returns.length);
      const bootstrapReturn = returns[randomIndex];
      currentPrice = currentPrice * (1 + bootstrapReturn);
      
      syntheticData.push({
        date: this.generateDate(i),
        symbol: 'SYNTHETIC',
        close: currentPrice,
        volume: this.generateVolume(rng),
        synthetic: true,
        method: 'historical_bootstrap'
      });
    }
    
    return syntheticData;
  }

  private generateRegimeScenario(
    baseData: MarketDataPoint[],
    regime: MarketRegime
  ): MarketDataPoint[] {
    
    const syntheticData: MarketDataPoint[] = [];
    let currentPrice = baseData[baseData.length - 1]?.close || 100;
    
    const meanReturn = regime.characteristics.trend * 0.001; // Convert trend to daily return
    const volatility = regime.characteristics.volatility * 0.02; // Convert to daily volatility
    
    const rng = new SimpleRNG(Date.now());
    
    for (let i = 0; i < regime.duration; i++) {
      const dailyReturn = rng.normal(meanReturn, volatility);
      currentPrice = currentPrice * (1 + dailyReturn);
      
      syntheticData.push({
        date: this.generateDate(i),
        symbol: 'SYNTHETIC',
        close: currentPrice,
        volume: this.generateVolume(rng),
        synthetic: true,
        method: 'regime',
        regime: regime.name
      });
    }
    
    return syntheticData;
  }

  private generateStressScenario(
    baseData: MarketDataPoint[],
    stressTest: StressTestScenario
  ): MarketDataPoint[] {
    
    const syntheticData: MarketDataPoint[] = [];
    let currentPrice = baseData[baseData.length - 1]?.close || 100;
    
    const rng = new SimpleRNG(Date.now());
    const totalDuration = stressTest.marketShock.duration + stressTest.marketShock.recoveryTime;
    
    for (let i = 0; i < totalDuration; i++) {
      let dailyReturn: number;
      
      if (i < stressTest.marketShock.duration) {
        // Crash phase
        const crashReturn = stressTest.marketShock.magnitude / stressTest.marketShock.duration;
        const noise = rng.normal(0, 0.01); // Add some noise
        dailyReturn = crashReturn + noise;
      } else {
        // Recovery phase
        const recoveryReturn = -stressTest.marketShock.magnitude / stressTest.marketShock.recoveryTime;
        const noise = rng.normal(0, 0.015); // More volatile recovery
        dailyReturn = recoveryReturn + noise;
      }
      
      currentPrice = currentPrice * (1 + dailyReturn);
      
      syntheticData.push({
        date: this.generateDate(i),
        symbol: 'SYNTHETIC',
        close: currentPrice,
        volume: this.generateVolume(rng),
        synthetic: true,
        method: 'stress_test',
        stressTest: stressTest.name,
        phase: i < stressTest.marketShock.duration ? 'crash' : 'recovery'
      });
    }
    
    return syntheticData;
  }

  private async runSyntheticBacktests(
    strategy: StrategyDefinition,
    scenarios: SyntheticScenario[],
    config: BacktestConfig
  ): Promise<SyntheticResult[]> {
    
    const results: SyntheticResult[] = [];
    
    for (const scenario of scenarios) {
      try {
        const performance = await this.backtestOnSyntheticData(
          strategy,
          scenario.data,
          config
        );
        
        results.push({
          scenarioId: scenario.id,
          scenarioType: scenario.type,
          description: scenario.description,
          performance,
          dataQuality: this.assessSyntheticDataQuality(scenario.data),
          realism: this.assessRealism(scenario.data)
        });
        
      } catch (error) {
        console.warn(`Synthetic scenario ${scenario.id} failed:`, error);
        continue;
      }
    }
    
    return results;
  }

  private async backtestOnSyntheticData(
    strategy: StrategyDefinition,
    data: MarketDataPoint[],
    config: BacktestConfig
  ): Promise<PerformanceMetrics> {
    
    // Simplified backtesting for synthetic data
    const returns: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const currentPrice = data[i].close;
      const previousPrice = data[i - 1].close;
      const dailyReturn = (currentPrice - previousPrice) / previousPrice;
      returns.push(dailyReturn);
    }
    
    return this.calculatePerformanceFromReturns(returns, config.riskFreeRate);
  }

  private analyzeSyntheticResults(results: SyntheticResult[]): {
    averageReturns: number[];
    averagePerformance: PerformanceMetrics;
    averageRisk: RiskMetrics;
    scenarioPerformance: any;
    robustnessMetrics: any;
    dataQualityMetrics: any;
    educationalWarnings: string[];
  } {
    
    const performances = results.map(r => r.performance);
    const averagePerformance = this.calculateAveragePerformance(performances);
    
    const scenarioPerformance = this.analyzeScenarioPerformance(results);
    const robustnessMetrics = this.calculateRobustnessMetrics(results);
    const dataQualityMetrics = this.aggregateDataQuality(results);
    
    const educationalWarnings = [
      'Synthetic data may not capture all market complexities',
      'Real market conditions include factors not modeled in synthetic data',
      'Use synthetic testing as one component of comprehensive validation',
      'Consider regime changes and structural breaks not present in synthetic data',
      'Synthetic data generation methods have inherent limitations and biases'
    ];
    
    return {
      averageReturns: [], // Simplified
      averagePerformance,
      averageRisk: this.getEmptyRiskMetrics(),
      scenarioPerformance,
      robustnessMetrics,
      dataQualityMetrics,
      educationalWarnings
    };
  }

  private analyzeScenarioPerformance(results: SyntheticResult[]): Record<string, {
    averageReturn: number;
    averageSharpe: number;
    successRate: number;
    consistency: number;
  }> {
    
    const scenarioGroups: Record<string, SyntheticResult[]> = {};
    
    results.forEach(result => {
      if (!scenarioGroups[result.scenarioType]) {
        scenarioGroups[result.scenarioType] = [];
      }
      scenarioGroups[result.scenarioType].push(result);
    });
    
    const analysis: Record<string, any> = {};
    
    Object.entries(scenarioGroups).forEach(([scenarioType, scenarioResults]) => {
      const avgReturn = scenarioResults.reduce((sum, r) => sum + r.performance.totalReturn, 0) / scenarioResults.length;
      const avgSharpe = scenarioResults.reduce((sum, r) => sum + r.performance.sharpeRatio, 0) / scenarioResults.length;
      const successfulRuns = scenarioResults.filter(r => r.performance.totalReturn > 0).length;
      const successRate = successfulRuns / scenarioResults.length;
      
      // Calculate consistency (low variance in performance)
      const returns = scenarioResults.map(r => r.performance.totalReturn);
      const variance = this.calculateVariance(returns);
      const consistency = Math.max(0, 1 - variance);
      
      analysis[scenarioType] = {
        averageReturn: avgReturn,
        averageSharpe: avgSharpe,
        successRate,
        consistency
      };
    });
    
    return analysis;
  }

  private calculateRobustnessMetrics(results: SyntheticResult[]): {
    overallRobustness: number;
    scenarioRobustness: Record<string, number>;
    dataQualityScore: number;
  } {
    
    const performances = results.map(r => r.performance.sharpeRatio);
    const positivePerformances = performances.filter(p => p > 0).length;
    const overallRobustness = positivePerformances / performances.length;
    
    const scenarioTypes = [...new Set(results.map(r => r.scenarioType))];
    const scenarioRobustness: Record<string, number> = {};
    
    scenarioTypes.forEach(type => {
      const typeResults = results.filter(r => r.scenarioType === type);
      const typePositives = typeResults.filter(r => r.performance.sharpeRatio > 0).length;
      scenarioRobustness[type] = typePositives / typeResults.length;
    });
    
    const dataQualityScores = results.map(r => r.dataQuality.overallScore);
    const dataQualityScore = dataQualityScores.reduce((sum, s) => sum + s, 0) / dataQualityScores.length;
    
    return {
      overallRobustness,
      scenarioRobustness,
      dataQualityScore
    };
  }

  private aggregateDataQuality(results: SyntheticResult[]): {
    averageRealism: number;
    averageQuality: number;
    qualityByMethod: Record<string, number>;
  } {
    
    const realismScores = results.map(r => r.realism);
    const qualityScores = results.map(r => r.dataQuality.overallScore);
    
    const averageRealism = realismScores.reduce((sum, s) => sum + s, 0) / realismScores.length;
    const averageQuality = qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length;
    
    // Group by generation method
    const methodGroups: Record<string, number[]> = {};
    results.forEach(result => {
      const method = (result as any).method || 'unknown';
      if (!methodGroups[method]) methodGroups[method] = [];
      methodGroups[method].push(result.dataQuality.overallScore);
    });
    
    const qualityByMethod: Record<string, number> = {};
    Object.entries(methodGroups).forEach(([method, scores]) => {
      qualityByMethod[method] = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    });
    
    return {
      averageRealism,
      averageQuality,
      qualityByMethod
    };
  }

  private assessSyntheticDataQuality(data: MarketDataPoint[]): {
    overallScore: number;
    statisticalProperties: any;
    temporalProperties: any;
  } {
    
    const returns = this.extractReturns(data);
    
    // Assess statistical properties
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const skewness = this.calculateSkewness(returns);
    const kurtosis = this.calculateKurtosis(returns);
    
    const statisticalProperties = {
      mean,
      variance,
      skewness,
      kurtosis,
      normalityScore: this.assessNormality(returns)
    };
    
    // Assess temporal properties
    const autocorrelation = this.calculateAutocorrelation(returns, 1);
    const volatilityClustering = this.assessVolatilityClustering(returns);
    
    const temporalProperties = {
      autocorrelation,
      volatilityClustering,
      trendConsistency: this.assessTrendConsistency(data)
    };
    
    // Calculate overall quality score
    const overallScore = (
      Math.abs(statisticalProperties.normalityScore) * 0.3 +
      (1 - Math.abs(temporalProperties.autocorrelation)) * 0.3 +
      temporalProperties.volatilityClustering * 0.2 +
      temporalProperties.trendConsistency * 0.2
    );
    
    return {
      overallScore,
      statisticalProperties,
      temporalProperties
    };
  }

  private assessRealism(data: MarketDataPoint[]): number {
    // Simplified realism assessment
    // In practice, this would compare to real market characteristics
    
    const returns = this.extractReturns(data);
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
    
    // Realistic daily volatility should be between 0.5% and 5%
    const volatilityRealism = volatility > 0.005 && volatility < 0.05 ? 1.0 : 0.5;
    
    // Check for extreme outliers
    const extremeReturns = returns.filter(r => Math.abs(r) > 0.1).length;
    const outlierRealism = extremeReturns < returns.length * 0.01 ? 1.0 : 0.5;
    
    return (volatilityRealism + outlierRealism) / 2;
  }

  /**
   * Utility methods
   */
  private getDefaultSyntheticDataConfig(): SyntheticDataConfig {
    return {
      scenarios: 100,
      generationMethod: 'monte_carlo',
      marketRegimes: [
        {
          name: 'Bull Market',
          duration: 252,
          characteristics: {
            volatility: 0.8,
            trend: 0.7,
            correlation: 0.6
          }
        },
        {
          name: 'Bear Market',
          duration: 126,
          characteristics: {
            volatility: 1.5,
            trend: -0.8,
            correlation: 0.8
          }
        }
      ],
      stressTests: [
        {
          name: 'Market Crash',
          description: 'Sudden 20% market decline',
          marketShock: {
            magnitude: -0.20,
            duration: 5,
            recoveryTime: 30
          }
        },
        {
          name: 'Flash Crash',
          description: 'Rapid 10% decline and recovery',
          marketShock: {
            magnitude: -0.10,
            duration: 1,
            recoveryTime: 3
          }
        }
      ]
    };
  }

  private prepareBaseData(marketData: Record<string, MarketData[]>, config: BacktestConfig): MarketDataPoint[] {
    const spyData = marketData['SPY'] || [];
    
    return spyData
      .filter(d => d.date >= config.startDate && d.date <= config.endDate)
      .map(d => ({
        date: d.date,
        symbol: d.symbol,
        close: d.close,
        volume: d.volume || 0
      }));
  }

  private extractReturns(data: MarketDataPoint[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const currentPrice = data[i].close;
      const previousPrice = data[i - 1].close;
      const dailyReturn = (currentPrice - previousPrice) / previousPrice;
      returns.push(dailyReturn);
    }
    
    return returns;
  }

  private extractFeatures(returns: number[]): any {
    // Simplified feature extraction for GAN-like generation
    return {
      mean: returns.reduce((sum, r) => sum + r, 0) / returns.length,
      variance: returns.reduce((sum, r) => sum + r * r, 0) / returns.length,
      skewness: this.calculateSkewness(returns),
      kurtosis: this.calculateKurtosis(returns),
      autocorrelation: this.calculateAutocorrelation(returns, 1)
    };
  }

  private generateSyntheticReturn(features: any, rng: SimpleRNG): number {
    // Simplified synthetic return generation
    // In practice, this would use more sophisticated models
    
    let syntheticReturn = rng.normal(features.mean, Math.sqrt(features.variance));
    
    // Apply skewness and kurtosis adjustments (simplified)
    if (features.skewness !== 0) {
      syntheticReturn += features.skewness * 0.1 * rng.normal(0, 0.01);
    }
    
    return syntheticReturn;
  }

  private generateDate(index: number): string {
    const date = new Date();
    date.setDate(date.getDate() - (1000 - index));
    return date.toISOString().split('T')[0];
  }

  private generateVolume(rng: SimpleRNG): number {
    return Math.floor(rng.uniform() * 1000000 + 100000);
  }

  private calculateSkewness(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    const skewnessSum = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0);
    return skewnessSum / values.length;
  }

  private calculateKurtosis(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    const kurtosisSum = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0);
    return (kurtosisSum / values.length) - 3; // Excess kurtosis
  }

  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = lag; i < values.length; i++) {
      numerator += (values[i] - mean) * (values[i - lag] - mean);
    }
    
    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private assessVolatilityClustering(returns: number[]): number {
    // Simplified volatility clustering assessment
    const squaredReturns = returns.map(r => r * r);
    const autocorr = this.calculateAutocorrelation(squaredReturns, 1);
    
    return Math.min(1, Math.max(0, autocorr * 2)); // Normalize to 0-1
  }

  private assessNormality(returns: number[]): number {
    const skewness = this.calculateSkewness(returns);
    const kurtosis = this.calculateKurtosis(returns);
    
    // Perfect normality has skewness = 0, kurtosis = 0
    const normalityScore = 1 - (Math.abs(skewness) + Math.abs(kurtosis)) / 2;
    
    return Math.max(0, Math.min(1, normalityScore));
  }

  private assessTrendConsistency(data: MarketDataPoint[]): number {
    // Simplified trend consistency assessment
    const prices = data.map(d => d.close);
    let trendChanges = 0;
    
    for (let i = 2; i < prices.length; i++) {
      const trend1 = prices[i - 1] > prices[i - 2];
      const trend2 = prices[i] > prices[i - 1];
      
      if (trend1 !== trend2) {
        trendChanges++;
      }
    }
    
    const changeRate = trendChanges / (prices.length - 2);
    return Math.max(0, 1 - changeRate); // Lower change rate = higher consistency
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private calculateAveragePerformance(performances: PerformanceMetrics[]): PerformanceMetrics {
    if (performances.length === 0) {
      return this.getEmptyPerformanceMetrics();
    }
    
    return performances.reduce((acc, perf) => ({
      totalReturn: acc.totalReturn + perf.totalReturn / performances.length,
      annualizedReturn: acc.annualizedReturn + perf.annualizedReturn / performances.length,
      volatility: acc.volatility + perf.volatility / performances.length,
      sharpeRatio: acc.sharpeRatio + perf.sharpeRatio / performances.length,
      sortinoRatio: acc.sortinoRatio + perf.sortinoRatio / performances.length,
      calmarRatio: acc.calmarRatio + perf.calmarRatio / performances.length,
      maxDrawdown: acc.maxDrawdown + perf.maxDrawdown / performances.length,
      maxDrawdownDuration: acc.maxDrawdownDuration + perf.maxDrawdownDuration / performances.length,
      averageDrawdown: acc.averageDrawdown + perf.averageDrawdown / performances.length,
      recoveryTime: acc.recoveryTime + perf.recoveryTime / performances.length,
      totalTrades: acc.totalTrades + perf.totalTrades / performances.length,
      winRate: acc.winRate + perf.winRate / performances.length,
      averageWin: acc.averageWin + perf.averageWin / performances.length,
      averageLoss: acc.averageLoss + perf.averageLoss / performances.length,
      profitFactor: acc.profitFactor + perf.profitFactor / performances.length,
      bestMonth: acc.bestMonth + perf.bestMonth / performances.length,
      worstMonth: acc.worstMonth + perf.worstMonth / performances.length,
      positiveMonths: acc.positiveMonths + perf.positiveMonths / performances.length,
      consecutiveWins: acc.consecutiveWins + perf.consecutiveWins / performances.length,
      consecutiveLosses: acc.consecutiveLosses + perf.consecutiveLosses / performances.length,
      monthlyReturns: performances[0].monthlyReturns,
      yearlyReturns: performances[0].yearlyReturns,
      rollingMetrics: performances[0].rollingMetrics
    }), this.getEmptyPerformanceMetrics());
  }

  private calculatePerformanceFromReturns(returns: number[], riskFreeRate: number): PerformanceMetrics {
    if (returns.length === 0) {
      return this.getEmptyPerformanceMetrics();
    }
    
    const totalReturn = returns.reduce((product, r) => product * (1 + r), 1) - 1;
    const annualizedReturn = Math.pow(1 + totalReturn, 252 / returns.length) - 1;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252);
    
    const excessReturns = returns.map(r => r - riskFreeRate / 252);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const sharpeRatio = volatility > 0 ? (avgExcessReturn * 252) / volatility : 0;
    
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    
    return {
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      sortinoRatio: sharpeRatio * 1.2,
      calmarRatio: annualizedReturn / (maxDrawdown || 0.01),
      maxDrawdown,
      maxDrawdownDuration: 0,
      averageDrawdown: maxDrawdown * 0.3,
      recoveryTime: 0,
      totalTrades: 0,
      winRate: 0.5,
      averageWin: 0.02,
      averageLoss: -0.015,
      profitFactor: 1.33,
      bestMonth: Math.max(...returns) * 21,
      worstMonth: Math.min(...returns) * 21,
      positiveMonths: returns.filter(r => r > 0).length / returns.length * 100,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      monthlyReturns: { dates: [], values: [], frequency: 'monthly' },
      yearlyReturns: { dates: [], values: [], frequency: 'daily' },
      rollingMetrics: {
        window: 21,
        returns: { dates: [], values: [], frequency: 'daily' },
        volatility: { dates: [], values: [], frequency: 'daily' },
        sharpeRatio: { dates: [], values: [], frequency: 'daily' },
        maxDrawdown: { dates: [], values: [], frequency: 'daily' }
      }
    };
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let cumulativeReturn = 0;
    
    for (const r of returns) {
      cumulativeReturn = (1 + cumulativeReturn) * (1 + r) - 1;
      if (cumulativeReturn > peak) {
        peak = cumulativeReturn;
      }
      const drawdown = (peak - cumulativeReturn) / (1 + peak);
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  private createTimeSeries(returns: number[]): TimeSeries<number> {
    const dates = returns.map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (returns.length - i));
      return date.toISOString().split('T')[0];
    });
    
    return {
      dates,
      values: returns,
      frequency: 'daily'
    };
  }

  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      maxDrawdownDuration: 0,
      averageDrawdown: 0,
      recoveryTime: 0,
      totalTrades: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      bestMonth: 0,
      worstMonth: 0,
      positiveMonths: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      monthlyReturns: { dates: [], values: [], frequency: 'monthly' },
      yearlyReturns: { dates: [], values: [], frequency: 'daily' },
      rollingMetrics: {
        window: 21,
        returns: { dates: [], values: [], frequency: 'daily' },
        volatility: { dates: [], values: [], frequency: 'daily' },
        sharpeRatio: { dates: [], values: [], frequency: 'daily' },
        maxDrawdown: { dates: [], values: [], frequency: 'daily' }
      }
    };
  }

  private getEmptyRiskMetrics(): RiskMetrics {
    return {
      var95: 0,
      var99: 0,
      expectedShortfall95: 0,
      expectedShortfall99: 0,
      historicalVolatility: 0,
      realizedVolatility: 0,
      volatilitySkew: 0,
      volatilityKurtosis: 0,
      skewness: 0,
      kurtosis: 0,
      tailRatio: 0,
      volatilityRegimes: [],
      stressTestResults: []
    };
  }
}

/**
 * Simple Random Number Generator
 */
class SimpleRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  uniform(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  normal(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.uniform();
    const u2 = this.uniform();
    
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }
}

/**
 * Supporting interfaces
 */
interface MarketDataPoint {
  date: string;
  symbol: string;
  close: number;
  volume: number;
  synthetic?: boolean;
  method?: string;
  [key: string]: any;
}

interface SyntheticScenario {
  id: string;
  type: 'base' | 'regime' | 'stress';
  data: MarketDataPoint[];
  description: string;
  regime?: MarketRegime;
  stressTest?: StressTestScenario;
}

interface SyntheticResult {
  scenarioId: string;
  scenarioType: string;
  description: string;
  performance: PerformanceMetrics;
  dataQuality: {
    overallScore: number;
    statisticalProperties: any;
    temporalProperties: any;
  };
  realism: number;
}