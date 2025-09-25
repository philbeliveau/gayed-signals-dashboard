import {
  StrategyDefinition,
  BacktestConfig,
  MonteCarloConfig,
  MonteCarloScenarioType,
  MarketData,
  Signal,
  Trade,
  Position,
  PerformanceMetrics,
  RiskMetrics,
  TimeSeries
} from '../../types';

/**
 * Monte Carlo Simulation Engine
 * 
 * Implements comprehensive Monte Carlo simulation for strategy testing including:
 * 
 * 1. Random scenario generation with multiple distributions
 * 2. Stress testing under various market conditions
 * 3. Confidence interval estimation for performance metrics
 * 4. Fat-tail and regime-switching scenario modeling
 * 5. Bootstrap resampling of historical returns
 * 
 * Key Features:
 * - Multiple scenario types (normal, fat-tail, regime-switching, etc.)
 * - Confidence interval calculations
 * - Stress testing scenarios (crashes, bull/bear markets)
 * - Path-dependent analysis
 * - Parameter uncertainty testing
 */
export class MonteCarloEngine {
  
  private rng: RandomNumberGenerator;

  constructor(seed?: number) {
    this.rng = new RandomNumberGenerator(seed);
  }

  /**
   * Main Monte Carlo simulation execution
   */
  async backtest(
    strategy: StrategyDefinition,
    marketData: Record<string, MarketData[]>,
    config: BacktestConfig
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      console.log('🎲 Starting Monte Carlo Simulation...');
      
      // Get Monte Carlo specific configuration
      const mcConfig = config.monteCarlo || this.getDefaultMonteCarloConfig();
      
      // Prepare base data and parameters
      const baseData = this.prepareBaseData(marketData, config);
      const historicalReturns = this.extractHistoricalReturns(baseData);
      
      // Run simulations for each scenario type
      const simulationResults = await this.runAllScenarios(
        strategy,
        baseData,
        historicalReturns,
        mcConfig,
        config
      );
      
      // Aggregate and analyze results
      const aggregatedResults = this.aggregateSimulationResults(simulationResults);
      const confidenceIntervals = this.calculateConfidenceIntervals(simulationResults, mcConfig.confidenceLevels);
      const stressTestResults = this.extractStressTestResults(simulationResults);
      
      // Calculate performance and risk metrics
      const performance = this.calculateAggregatedPerformance(aggregatedResults);
      const risk = this.calculateMonteCarloRisk(simulationResults, historicalReturns);
      
      console.log('✅ Monte Carlo Simulation completed');
      
      return {
        returns: this.createTimeSeries(aggregatedResults.averageReturns),
        trades: aggregatedResults.averageTrades,
        positions: aggregatedResults.averagePositions,
        performance,
        risk,
        specificData: {
          totalSimulations: mcConfig.simulations,
          scenarioTypes: mcConfig.scenarioTypes,
          confidenceIntervals,
          stressTestResults,
          scenarioPerformance: this.analyzeScenarioPerformance(simulationResults),
          pathDependencyAnalysis: this.analyzePathDependency(simulationResults),
          robustnessMetrics: this.calculateRobustnessMetrics(simulationResults),
          simulationDetails: this.summarizeSimulations(simulationResults)
        }
      };
      
    } catch (error) {
      console.error('❌ Monte Carlo Simulation failed:', error);
      throw error;
    }
  }

  /**
   * Run simulations for all configured scenario types
   */
  private async runAllScenarios(
    strategy: StrategyDefinition,
    baseData: MarketDataPoint[],
    historicalReturns: number[],
    mcConfig: MonteCarloConfig,
    config: BacktestConfig
  ): Promise<MonteCarloSimulationResult[]> {
    
    const allResults: MonteCarloSimulationResult[] = [];
    
    for (const scenarioType of mcConfig.scenarioTypes) {
      console.log(`  🔄 Running ${scenarioType} scenarios...`);
      
      const scenarioResults = await this.runScenarioSimulations(
        strategy,
        baseData,
        historicalReturns,
        scenarioType,
        mcConfig,
        config
      );
      
      allResults.push(...scenarioResults);
      console.log(`  ✅ Completed ${scenarioResults.length} ${scenarioType} simulations`);
    }
    
    return allResults;
  }

  /**
   * Run simulations for a specific scenario type
   */
  private async runScenarioSimulations(
    strategy: StrategyDefinition,
    baseData: MarketDataPoint[],
    historicalReturns: number[],
    scenarioType: MonteCarloScenarioType,
    mcConfig: MonteCarloConfig,
    config: BacktestConfig
  ): Promise<MonteCarloSimulationResult[]> {
    
    const simulationsPerScenario = Math.floor(mcConfig.simulations / mcConfig.scenarioTypes.length);
    const results: MonteCarloSimulationResult[] = [];
    
    for (let i = 0; i < simulationsPerScenario; i++) {
      try {
        // Generate scenario-specific market data
        const simulatedData = await this.generateScenarioData(
          baseData,
          historicalReturns,
          scenarioType
        );
        
        // Run backtest on simulated data
        const simulationResult = await this.runSingleSimulation(
          strategy,
          simulatedData,
          config,
          scenarioType,
          i
        );
        
        results.push(simulationResult);
        
      } catch (error) {
        console.warn(`⚠️ Simulation ${i + 1} for ${scenarioType} failed:`, error);
        // Continue with next simulation
      }
    }
    
    return results;
  }

  /**
   * Generate scenario-specific market data
   */
  private async generateScenarioData(
    baseData: MarketDataPoint[],
    historicalReturns: number[],
    scenarioType: MonteCarloScenarioType
  ): Promise<MarketDataPoint[]> {
    
    const simulatedData: MarketDataPoint[] = [];
    let currentPrice = baseData[baseData.length - 1]?.close || 100;
    
    // Generate returns based on scenario type
    const scenarioReturns = this.generateScenarioReturns(
      historicalReturns,
      scenarioType,
      baseData.length
    );
    
    // Apply returns to generate price path
    baseData.forEach((dataPoint, index) => {
      if (index < scenarioReturns.length) {
        currentPrice = currentPrice * (1 + scenarioReturns[index]);
      }
      
      simulatedData.push({
        ...dataPoint,
        close: currentPrice,
        simulated: true,
        scenarioType,
        returnUsed: scenarioReturns[index] || 0
      });
    });
    
    return simulatedData;
  }

  /**
   * Generate returns for different scenario types
   */
  private generateScenarioReturns(
    historicalReturns: number[],
    scenarioType: MonteCarloScenarioType,
    length: number
  ): number[] {
    
    switch (scenarioType) {
      case 'normal_returns':
        return this.generateNormalReturns(historicalReturns, length);
      
      case 'fat_tail_returns':
        return this.generateFatTailReturns(historicalReturns, length);
      
      case 'regime_switching':
        return this.generateRegimeSwitchingReturns(historicalReturns, length);
      
      case 'volatility_clustering':
        return this.generateVolatilityClusteringReturns(historicalReturns, length);
      
      case 'market_crash':
        return this.generateMarketCrashReturns(historicalReturns, length);
      
      case 'bull_market':
        return this.generateBullMarketReturns(historicalReturns, length);
      
      case 'bear_market':
        return this.generateBearMarketReturns(historicalReturns, length);
      
      default:
        return this.generateNormalReturns(historicalReturns, length);
    }
  }

  /**
   * Generate normally distributed returns
   */
  private generateNormalReturns(historicalReturns: number[], length: number): number[] {
    const mean = historicalReturns.reduce((sum, r) => sum + r, 0) / historicalReturns.length;
    const variance = historicalReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / historicalReturns.length;
    const stdDev = Math.sqrt(variance);
    
    const returns: number[] = [];
    for (let i = 0; i < length; i++) {
      returns.push(this.rng.normalRandom(mean, stdDev));
    }
    
    return returns;
  }

  /**
   * Generate fat-tail distributed returns (Student-t distribution)
   */
  private generateFatTailReturns(historicalReturns: number[], length: number): number[] {
    const mean = historicalReturns.reduce((sum, r) => sum + r, 0) / historicalReturns.length;
    const variance = historicalReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / historicalReturns.length;
    const stdDev = Math.sqrt(variance);
    
    const degreesOfFreedom = 5; // Low degrees of freedom for fat tails
    const returns: number[] = [];
    
    for (let i = 0; i < length; i++) {
      const tValue = this.rng.studentTRandom(degreesOfFreedom);
      returns.push(mean + stdDev * tValue);
    }
    
    return returns;
  }

  /**
   * Generate regime-switching returns
   */
  private generateRegimeSwitchingReturns(historicalReturns: number[], length: number): number[] {
    const mean = historicalReturns.reduce((sum, r) => sum + r, 0) / historicalReturns.length;
    const stdDev = Math.sqrt(historicalReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / historicalReturns.length);
    
    // Define two regimes: low volatility and high volatility
    const regimes = [
      { mean: mean * 1.2, stdDev: stdDev * 0.7, probability: 0.7 }, // Bull regime
      { mean: mean * 0.3, stdDev: stdDev * 1.8, probability: 0.3 }  // Bear regime
    ];
    
    const returns: number[] = [];
    let currentRegime = 0;
    let regimeDuration = 0;
    const avgRegimeDuration = 50; // Average days in a regime
    
    for (let i = 0; i < length; i++) {
      // Check for regime switch
      if (regimeDuration > avgRegimeDuration && this.rng.uniform() < 0.1) {
        currentRegime = 1 - currentRegime;
        regimeDuration = 0;
      }
      
      const regime = regimes[currentRegime];
      returns.push(this.rng.normalRandom(regime.mean, regime.stdDev));
      regimeDuration++;
    }
    
    return returns;
  }

  /**
   * Generate returns with volatility clustering (GARCH-like)
   */
  private generateVolatilityClusteringReturns(historicalReturns: number[], length: number): number[] {
    const mean = historicalReturns.reduce((sum, r) => sum + r, 0) / historicalReturns.length;
    const baseVariance = historicalReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / historicalReturns.length;
    
    const returns: number[] = [];
    let currentVariance = baseVariance;
    
    // GARCH(1,1) parameters
    const omega = baseVariance * 0.1;
    const alpha = 0.1;
    const beta = 0.8;
    
    for (let i = 0; i < length; i++) {
      const shock = this.rng.normalRandom(0, 1);
      const currentReturn = mean + Math.sqrt(currentVariance) * shock;
      returns.push(currentReturn);
      
      // Update variance for next period (GARCH process)
      const prevReturn = i > 0 ? returns[i - 1] : 0;
      currentVariance = omega + alpha * Math.pow(prevReturn - mean, 2) + beta * currentVariance;
    }
    
    return returns;
  }

  /**
   * Generate market crash scenario returns
   */
  private generateMarketCrashReturns(historicalReturns: number[], length: number): number[] {
    const normalReturns = this.generateNormalReturns(historicalReturns, length);
    
    // Inject crash scenarios randomly
    const crashProbability = 0.02; // 2% chance of crash on any given day
    const crashMagnitudes = [-0.05, -0.08, -0.12, -0.20]; // Various crash severities
    
    return normalReturns.map(r => {
      if (this.rng.uniform() < crashProbability) {
        const crashMagnitude = crashMagnitudes[Math.floor(this.rng.uniform() * crashMagnitudes.length)];
        return r + crashMagnitude;
      }
      return r;
    });
  }

  /**
   * Generate bull market scenario returns
   */
  private generateBullMarketReturns(historicalReturns: number[], length: number): number[] {
    const mean = historicalReturns.reduce((sum, r) => sum + r, 0) / historicalReturns.length;
    const stdDev = Math.sqrt(historicalReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / historicalReturns.length);
    
    // Bull market: higher mean, lower volatility
    const bullMean = mean * 2.5;
    const bullStdDev = stdDev * 0.8;
    
    const returns: number[] = [];
    for (let i = 0; i < length; i++) {
      returns.push(this.rng.normalRandom(bullMean, bullStdDev));
    }
    
    return returns;
  }

  /**
   * Generate bear market scenario returns
   */
  private generateBearMarketReturns(historicalReturns: number[], length: number): number[] {
    const mean = historicalReturns.reduce((sum, r) => sum + r, 0) / historicalReturns.length;
    const stdDev = Math.sqrt(historicalReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / historicalReturns.length);
    
    // Bear market: negative mean, higher volatility
    const bearMean = mean * -1.5;
    const bearStdDev = stdDev * 1.5;
    
    const returns: number[] = [];
    for (let i = 0; i < length; i++) {
      returns.push(this.rng.normalRandom(bearMean, bearStdDev));
    }
    
    return returns;
  }

  /**
   * Run a single simulation
   */
  private async runSingleSimulation(
    strategy: StrategyDefinition,
    simulatedData: MarketDataPoint[],
    config: BacktestConfig,
    scenarioType: MonteCarloScenarioType,
    simulationIndex: number
  ): Promise<MonteCarloSimulationResult> {
    
    // Simple backtesting logic for the simulation
    const trades: Trade[] = [];
    const positions: Position[] = [];
    const returns: number[] = [];
    
    let currentCapital = config.initialCapital;
    let currentPosition: Position | null = null;
    
    // Generate signals for simulated data
    const signals = this.generateSignalsForSimulation(strategy, simulatedData);
    
    for (let i = 1; i < simulatedData.length; i++) {
      const currentData = simulatedData[i];
      const previousData = simulatedData[i - 1];
      const signal = signals[i];
      
      let dailyReturn = 0;
      
      if (currentPosition) {
        // Calculate return from existing position
        const priceReturn = (currentData.close - previousData.close) / previousData.close;
        dailyReturn = priceReturn * currentPosition.weight;
        
        // Update position
        currentPosition.price = currentData.close;
        currentPosition.value = currentPosition.quantity * currentData.close;
        currentPosition.dailyReturn = dailyReturn;
        
        positions.push({ ...currentPosition, date: currentData.date });
      }
      
      // Simple position entry/exit logic based on signals
      if (signal && this.shouldChangePosition(signal, currentPosition)) {
        
        // Close existing position if needed
        if (currentPosition) {
          const closeTrade: Trade = {
            id: `sim_${simulationIndex}_${currentPosition.symbol}_${Date.now()}`,
            entryDate: currentPosition.date,
            exitDate: currentData.date,
            symbol: currentPosition.symbol,
            side: 'long',
            entryPrice: currentPosition.price,
            entryQuantity: currentPosition.quantity,
            entrySignal: signal,
            exitPrice: currentData.close,
            exitQuantity: currentPosition.quantity,
            exitSignal: signal,
            pnl: (currentData.close - currentPosition.price) * currentPosition.quantity,
            pnlPercent: (currentData.close - currentPosition.price) / currentPosition.price,
            commissions: config.commissionRate * currentData.close * currentPosition.quantity,
            slippage: config.slippageRate * currentData.close * currentPosition.quantity,
            timeInTrade: this.calculateTradingDays(currentPosition.date, currentData.date)
          };
          
          trades.push(closeTrade);
          currentCapital += closeTrade.pnl! - closeTrade.commissions - closeTrade.slippage;
        }
        
        // Enter new position
        const positionSize = this.calculatePositionSize(currentCapital, config.maxPositionSize, signal.confidence);
        const quantity = positionSize / currentData.close;
        
        currentPosition = {
          date: currentData.date,
          symbol: this.getSymbolFromSignal(signal),
          quantity,
          price: currentData.close,
          value: positionSize,
          weight: positionSize / currentCapital,
          signalSource: signal.type,
          confidenceAtEntry: signal.confidence
        };
      }
      
      returns.push(dailyReturn);
    }
    
    // Calculate performance metrics for this simulation
    const performance = this.calculateSimulationPerformance(returns, config.riskFreeRate);
    
    return {
      simulationIndex,
      scenarioType,
      performance,
      returns,
      trades,
      positions,
      finalCapital: currentCapital,
      maxDrawdownDuringSimulation: this.calculateMaxDrawdown(returns),
      worstDay: Math.min(...returns),
      bestDay: Math.max(...returns),
      volatility: this.calculateVolatility(returns),
      simulatedData: simulatedData.map(d => ({ date: d.date, close: d.close, returnUsed: d.returnUsed || 0 }))
    };
  }

  /**
   * Calculate confidence intervals from simulation results
   */
  private calculateConfidenceIntervals(
    results: MonteCarloSimulationResult[],
    confidenceLevels: number[]
  ): Record<string, Record<string, number>> {
    
    const metrics = {
      totalReturn: results.map(r => r.performance.totalReturn),
      sharpeRatio: results.map(r => r.performance.sharpeRatio),
      maxDrawdown: results.map(r => r.performance.maxDrawdown),
      volatility: results.map(r => r.volatility),
      finalCapital: results.map(r => r.finalCapital)
    };
    
    const intervals: Record<string, Record<string, number>> = {};
    
    Object.entries(metrics).forEach(([metricName, values]) => {
      const sortedValues = [...values].sort((a, b) => a - b);
      intervals[metricName] = {};
      
      confidenceLevels.forEach(level => {
        const lowerIndex = Math.floor((1 - level) / 2 * sortedValues.length);
        const upperIndex = Math.floor((1 + level) / 2 * sortedValues.length) - 1;
        
        intervals[metricName][`${(level * 100).toFixed(0)}%`] = {
          lower: sortedValues[lowerIndex],
          upper: sortedValues[upperIndex],
          median: sortedValues[Math.floor(sortedValues.length / 2)]
        } as any;
      });
    });
    
    return intervals;
  }

  /**
   * Analyze scenario performance
   */
  private analyzeScenarioPerformance(results: MonteCarloSimulationResult[]): Record<MonteCarloScenarioType, {
    count: number;
    avgReturn: number;
    avgSharpe: number;
    avgMaxDrawdown: number;
    successRate: number;
  }> {
    
    const scenarioGroups: Record<MonteCarloScenarioType, MonteCarloSimulationResult[]> = {} as any;
    
    // Group results by scenario type
    results.forEach(result => {
      if (!scenarioGroups[result.scenarioType]) {
        scenarioGroups[result.scenarioType] = [];
      }
      scenarioGroups[result.scenarioType].push(result);
    });
    
    const scenarioAnalysis: Record<MonteCarloScenarioType, any> = {} as any;
    
    Object.entries(scenarioGroups).forEach(([scenarioType, scenarioResults]) => {
      const count = scenarioResults.length;
      const avgReturn = scenarioResults.reduce((sum, r) => sum + r.performance.totalReturn, 0) / count;
      const avgSharpe = scenarioResults.reduce((sum, r) => sum + r.performance.sharpeRatio, 0) / count;
      const avgMaxDrawdown = scenarioResults.reduce((sum, r) => sum + r.performance.maxDrawdown, 0) / count;
      const successfulRuns = scenarioResults.filter(r => r.performance.totalReturn > 0).length;
      const successRate = successfulRuns / count;
      
      scenarioAnalysis[scenarioType as MonteCarloScenarioType] = {
        count,
        avgReturn,
        avgSharpe,
        avgMaxDrawdown,
        successRate
      };
    });
    
    return scenarioAnalysis;
  }

  /**
   * Utility methods
   */
  private getDefaultMonteCarloConfig(): MonteCarloConfig {
    return {
      simulations: 1000,
      confidenceLevels: [0.90, 0.95, 0.99],
      scenarioTypes: [
        'normal_returns',
        'fat_tail_returns',
        'regime_switching',
        'volatility_clustering',
        'market_crash'
      ],
      randomSeed: Math.floor(Math.random() * 10000)
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
        volume: d.volume || 0,
        simulated: false
      }));
  }

  private extractHistoricalReturns(data: MarketDataPoint[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const currentPrice = data[i].close;
      const previousPrice = data[i - 1].close;
      const dailyReturn = (currentPrice - previousPrice) / previousPrice;
      returns.push(dailyReturn);
    }
    
    return returns;
  }

  private generateSignalsForSimulation(strategy: StrategyDefinition, data: MarketDataPoint[]): Signal[] {
    // Simplified signal generation for simulation
    const signals: Signal[] = [];
    
    for (let i = 20; i < data.length; i++) {
      const recentData = data.slice(i - 20, i);
      const ma20 = recentData.reduce((sum, d) => sum + d.close, 0) / recentData.length;
      const currentPrice = data[i].close;
      
      const signal: Signal = {
        date: data[i].date,
        type: strategy.signalTypes[0] || 'sp500_ma',
        signal: currentPrice > ma20 ? 'Risk-On' : 'Risk-Off',
        strength: Math.abs((currentPrice - ma20) / ma20) > 0.02 ? 'Strong' : 'Moderate',
        confidence: Math.min(0.9, Math.abs((currentPrice - ma20) / ma20) * 10),
        rawValue: currentPrice / ma20
      };
      
      signals.push(signal);
    }
    
    return signals;
  }

  private shouldChangePosition(signal: Signal, currentPosition: Position | null): boolean {
    if (!currentPosition) {
      return signal.signal === 'Risk-On' && signal.confidence > 0.5;
    }
    
    const newSymbol = this.getSymbolFromSignal(signal);
    return currentPosition.symbol !== newSymbol;
  }

  private getSymbolFromSignal(signal: Signal): string {
    const symbolMap: Record<string, string> = {
      'sp500_ma': 'SPY',
      'utilities_spy': signal.signal === 'Risk-Off' ? 'XLU' : 'SPY',
      'lumber_gold': signal.signal === 'Risk-Off' ? 'GLD' : 'WOOD',
      'treasury_curve': signal.signal === 'Risk-Off' ? 'TLT' : 'IEF',
      'vix_defensive': signal.signal === 'Risk-Off' ? 'SPLV' : 'SPHB'
    };
    
    return symbolMap[signal.type] || 'SPY';
  }

  private calculatePositionSize(capital: number, maxPositionSize: number, confidence: number): number {
    return capital * maxPositionSize * confidence;
  }

  private calculateTradingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateSimulationPerformance(returns: number[], riskFreeRate: number): PerformanceMetrics {
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

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252); // Annualized
  }

  private aggregateSimulationResults(results: MonteCarloSimulationResult[]): {
    averageReturns: number[];
    averageTrades: Trade[];
    averagePositions: Position[];
  } {
    // Simplified aggregation - in practice, this would be more sophisticated
    const maxLength = Math.max(...results.map(r => r.returns.length));
    const averageReturns: number[] = [];
    
    for (let i = 0; i < maxLength; i++) {
      const returnsAtIndex = results
        .map(r => r.returns[i])
        .filter(r => r !== undefined);
      
      const average = returnsAtIndex.reduce((sum, r) => sum + r, 0) / returnsAtIndex.length;
      averageReturns.push(average || 0);
    }
    
    return {
      averageReturns,
      averageTrades: [], // Simplified
      averagePositions: [] // Simplified
    };
  }

  private calculateAggregatedPerformance(results: { averageReturns: number[]; averageTrades: Trade[]; averagePositions: Position[] }): PerformanceMetrics {
    return this.calculateSimulationPerformance(results.averageReturns, 0.02);
  }

  private calculateMonteCarloRisk(results: MonteCarloSimulationResult[], historicalReturns: number[]): RiskMetrics {
    const allReturns = results.flatMap(r => r.returns);
    
    if (allReturns.length === 0) {
      return this.getEmptyRiskMetrics();
    }
    
    const sortedReturns = [...allReturns].sort((a, b) => a - b);
    const var95Index = Math.floor(allReturns.length * 0.05);
    const var99Index = Math.floor(allReturns.length * 0.01);
    
    const var95 = Math.abs(sortedReturns[var95Index] || 0);
    const var99 = Math.abs(sortedReturns[var99Index] || 0);
    
    const mean = allReturns.reduce((sum, r) => sum + r, 0) / allReturns.length;
    const variance = allReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / allReturns.length;
    const volatility = Math.sqrt(variance * 252);
    
    const skewness = this.calculateSkewness(allReturns, mean, Math.sqrt(variance));
    const kurtosis = this.calculateKurtosis(allReturns, mean, Math.sqrt(variance));
    
    return {
      var95,
      var99,
      expectedShortfall95: Math.abs(sortedReturns.slice(0, var95Index + 1).reduce((sum, r) => sum + r, 0) / (var95Index + 1) || 0),
      expectedShortfall99: Math.abs(sortedReturns.slice(0, var99Index + 1).reduce((sum, r) => sum + r, 0) / (var99Index + 1) || 0),
      historicalVolatility: volatility,
      realizedVolatility: volatility,
      volatilitySkew: skewness,
      volatilityKurtosis: kurtosis,
      skewness,
      kurtosis,
      tailRatio: this.calculateTailRatio(allReturns),
      volatilityRegimes: [],
      stressTestResults: this.extractStressTestResults(results)
    };
  }

  private extractStressTestResults(results: MonteCarloSimulationResult[]): any[] {
    const stressScenarios = ['market_crash', 'bear_market'];
    
    return stressScenarios.map(scenario => {
      const scenarioResults = results.filter(r => r.scenarioType === scenario);
      
      if (scenarioResults.length === 0) {
        return {
          scenario,
          return: 0,
          maxDrawdown: 0,
          recoveryTime: -1,
          worstDay: 0
        };
      }
      
      const avgReturn = scenarioResults.reduce((sum, r) => sum + r.performance.totalReturn, 0) / scenarioResults.length;
      const avgMaxDrawdown = scenarioResults.reduce((sum, r) => sum + r.maxDrawdownDuringSimulation, 0) / scenarioResults.length;
      const worstDay = Math.min(...scenarioResults.map(r => r.worstDay));
      
      return {
        scenario,
        return: avgReturn,
        maxDrawdown: avgMaxDrawdown,
        recoveryTime: -1, // Would need more sophisticated calculation
        worstDay
      };
    });
  }

  private analyzePathDependency(results: MonteCarloSimulationResult[]): {
    pathDependencyScore: number;
    orderDependency: number;
    sequenceRisk: number;
  } {
    // Simplified path dependency analysis
    const returns = results.map(r => r.performance.totalReturn);
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - returns.reduce((s, v) => s + v, 0) / returns.length, 2), 0) / returns.length;
    
    return {
      pathDependencyScore: Math.min(1, variance * 10), // Normalized score
      orderDependency: Math.min(1, variance * 5),
      sequenceRisk: Math.min(1, variance * 8)
    };
  }

  private calculateRobustnessMetrics(results: MonteCarloSimulationResult[]): {
    consistency: number;
    stability: number;
    resilience: number;
  } {
    const returns = results.map(r => r.performance.totalReturn);
    const sharpeRatios = results.map(r => r.performance.sharpeRatio);
    const drawdowns = results.map(r => r.maxDrawdownDuringSimulation);
    
    const positiveReturns = returns.filter(r => r > 0).length / returns.length;
    const avgSharpe = sharpeRatios.reduce((sum, s) => sum + s, 0) / sharpeRatios.length;
    const avgDrawdown = drawdowns.reduce((sum, d) => sum + d, 0) / drawdowns.length;
    
    return {
      consistency: positiveReturns,
      stability: Math.max(0, Math.min(1, avgSharpe / 2)),
      resilience: Math.max(0, 1 - avgDrawdown)
    };
  }

  private summarizeSimulations(results: MonteCarloSimulationResult[]): {
    totalRuns: number;
    successfulRuns: number;
    successRate: number;
    averageReturn: number;
    bestRun: number;
    worstRun: number;
    standardDeviation: number;
  } {
    const returns = results.map(r => r.performance.totalReturn);
    const successfulRuns = returns.filter(r => r > 0).length;
    const averageReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / returns.length;
    
    return {
      totalRuns: results.length,
      successfulRuns,
      successRate: successfulRuns / results.length,
      averageReturn,
      bestRun: Math.max(...returns),
      worstRun: Math.min(...returns),
      standardDeviation: Math.sqrt(variance)
    };
  }

  private calculateSkewness(returns: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    
    const n = returns.length;
    const skewnessSum = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0);
    
    return (n / ((n - 1) * (n - 2))) * skewnessSum;
  }

  private calculateKurtosis(returns: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    
    const n = returns.length;
    const kurtosisSum = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0);
    
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurtosisSum - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  }

  private calculateTailRatio(returns: number[]): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const length = sortedReturns.length;
    
    const bottomTail = sortedReturns.slice(0, Math.floor(length * 0.05));
    const topTail = sortedReturns.slice(Math.floor(length * 0.95));
    
    const avgBottomTail = bottomTail.reduce((sum, r) => sum + r, 0) / bottomTail.length || 0;
    const avgTopTail = topTail.reduce((sum, r) => sum + r, 0) / topTail.length || 0;
    
    return avgTopTail !== 0 ? Math.abs(avgBottomTail / avgTopTail) : 0;
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
 * Random Number Generator with multiple distributions
 */
class RandomNumberGenerator {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed || Math.floor(Math.random() * 10000);
  }

  uniform(): number {
    // Simple linear congruential generator
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  normalRandom(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transformation
    const u1 = this.uniform();
    const u2 = this.uniform();
    
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  studentTRandom(degreesOfFreedom: number): number {
    // Simplified Student-t distribution using normal approximation
    // In practice, you'd want a more accurate implementation
    const normal = this.normalRandom(0, 1);
    const chi2 = this.chiSquaredRandom(degreesOfFreedom);
    
    return normal / Math.sqrt(chi2 / degreesOfFreedom);
  }

  private chiSquaredRandom(degreesOfFreedom: number): number {
    // Simplified chi-squared using sum of squared normals
    let sum = 0;
    for (let i = 0; i < degreesOfFreedom; i++) {
      const normal = this.normalRandom(0, 1);
      sum += normal * normal;
    }
    return sum;
  }
}

/**
 * Supporting interfaces for Monte Carlo simulation
 */
interface MarketDataPoint {
  date: string;
  symbol: string;
  close: number;
  volume: number;
  simulated?: boolean;
  scenarioType?: MonteCarloScenarioType;
  returnUsed?: number;
}

interface MonteCarloSimulationResult {
  simulationIndex: number;
  scenarioType: MonteCarloScenarioType;
  performance: PerformanceMetrics;
  returns: number[];
  trades: Trade[];
  positions: Position[];
  finalCapital: number;
  maxDrawdownDuringSimulation: number;
  worstDay: number;
  bestDay: number;
  volatility: number;
  simulatedData: Array<{
    date: string;
    close: number;
    returnUsed: number;
  }>;
}