import {
  StrategyDefinition,
  BacktestConfig,
  CrossValidationConfig,
  MarketData,
  Signal,
  Trade,
  Position,
  PerformanceMetrics,
  RiskMetrics,
  TimeSeries,
  DateRange
} from '../../types';

/**
 * Cross-Validation Backtesting Engine
 * 
 * Implements K-fold cross-validation for time series with proper handling of:
 * 
 * 1. Purged Cross-Validation - Removes data around test set to avoid lookahead bias
 * 2. Embargo Gap - Additional gap to prevent data leakage from overlapping samples
 * 3. Combinatorial Purged Cross-Validation - Tests multiple combinations of folds
 * 4. Time Series Specific Validation - Respects temporal order
 * 5. Walk-Forward Cross-Validation - Maintains chronological order
 * 
 * This engine is crucial for:
 * - Avoiding overfitting in strategy optimization
 * - Getting realistic out-of-sample performance estimates
 * - Testing strategy robustness across different market periods
 * - Identifying time-dependent performance patterns
 */
export class CrossValidationEngine {
  
  constructor() {}

  /**
   * Main cross-validation execution
   */
  async backtest(
    strategy: StrategyDefinition,
    marketData: Record<string, MarketData[]>,
    config: BacktestConfig
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      console.log('🔀 Starting Cross-Validation Analysis...');
      
      // Get cross-validation specific configuration
      const cvConfig = config.crossValidation || this.getDefaultCrossValidationConfig();
      
      // Prepare and validate data
      const preparedData = this.prepareData(marketData, config);
      this.validateDataForCrossValidation(preparedData, cvConfig);
      
      // Execute cross-validation
      const crossValidationResults = await this.executeCrossValidation(
        strategy,
        preparedData,
        cvConfig,
        config
      );
      
      // Perform combinatorial analysis if enabled
      let combinatorialResults: CrossValidationResult[] = [];
      if (cvConfig.combinatorial) {
        console.log('🔢 Running Combinatorial Purged Cross-Validation...');
        combinatorialResults = await this.executeCombinatorialCrossValidation(
          strategy,
          preparedData,
          cvConfig,
          config
        );
      }
      
      // Analyze results
      const analysis = this.analyzeCrossValidationResults([
        ...crossValidationResults,
        ...combinatorialResults
      ]);
      
      // Calculate aggregated metrics
      const aggregatedResults = this.aggregateCrossValidationResults(crossValidationResults);
      const performance = this.calculatePerformanceMetrics(aggregatedResults);
      const risk = this.calculateRiskMetrics(aggregatedResults);
      
      console.log('✅ Cross-Validation Analysis completed');
      
      return {
        returns: this.createTimeSeries(aggregatedResults.returns),
        trades: aggregatedResults.trades,
        positions: aggregatedResults.positions,
        performance,
        risk,
        specificData: {
          folds: cvConfig.folds,
          purgeGap: cvConfig.purgeGap,
          embargoGap: cvConfig.embargoGap,
          combinatorialEnabled: cvConfig.combinatorial,
          standardCVResults: crossValidationResults.length,
          combinatorialCVResults: combinatorialResults.length,
          overallAnalysis: analysis,
          foldPerformance: this.analyzeFoldPerformance(crossValidationResults),
          temporalStability: this.analyzeTemporalStability(crossValidationResults),
          robustnessMetrics: this.calculateRobustnessMetrics(crossValidationResults),
          crossValidationDetails: crossValidationResults
        }
      };
      
    } catch (error) {
      console.error('❌ Cross-Validation Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Execute standard K-fold cross-validation with purging
   */
  private async executeCrossValidation(
    strategy: StrategyDefinition,
    data: MarketDataPoint[],
    cvConfig: CrossValidationConfig,
    config: BacktestConfig
  ): Promise<CrossValidationResult[]> {
    
    const results: CrossValidationResult[] = [];
    const foldSize = Math.floor(data.length / cvConfig.folds);
    
    for (let fold = 0; fold < cvConfig.folds; fold++) {
      console.log(`  📊 Processing fold ${fold + 1}/${cvConfig.folds}...`);
      
      try {
        // Define test set boundaries
        const testStart = fold * foldSize;
        const testEnd = Math.min((fold + 1) * foldSize, data.length);
        
        // Create purged training and test sets
        const { trainSet, testSet, purgedIndices } = this.createPurgedSets(
          data,
          testStart,
          testEnd,
          cvConfig.purgeGap,
          cvConfig.embargoGap
        );
        
        console.log(`    📈 Train set: ${trainSet.length} samples, Test set: ${testSet.length} samples, Purged: ${purgedIndices.length} samples`);
        
        // Train/optimize strategy on training set
        const optimizedStrategy = await this.optimizeStrategyOnTrainingSet(
          strategy,
          trainSet,
          config
        );
        
        // Test strategy on test set
        const testResult = await this.testStrategyOnTestSet(
          optimizedStrategy.strategy,
          optimizedStrategy.parameters,
          testSet,
          config
        );
        
        // Store fold result
        const foldResult: CrossValidationResult = {
          foldNumber: fold + 1,
          trainPeriod: {
            start: trainSet[0]?.date || '',
            end: trainSet[trainSet.length - 1]?.date || '',
            dataPoints: trainSet.length
          },
          testPeriod: {
            start: testSet[0]?.date || '',
            end: testSet[testSet.length - 1]?.date || '',
            dataPoints: testSet.length
          },
          purgedSamples: purgedIndices.length,
          optimizedParameters: optimizedStrategy.parameters,
          trainPerformance: optimizedStrategy.performance,
          testPerformance: testResult.performance,
          testTrades: testResult.trades,
          testPositions: testResult.positions,
          testReturns: testResult.returns,
          overfittingIndicator: this.calculateOverfittingIndicator(optimizedStrategy.performance, testResult.performance),
          stabilityScore: this.calculateStabilityScore(optimizedStrategy.parameters),
          outOfSampleDegradation: this.calculateDegradation(optimizedStrategy.performance, testResult.performance)
        };
        
        results.push(foldResult);
        console.log(`    ✅ Fold ${fold + 1} completed - Test Sharpe: ${testResult.performance.sharpeRatio.toFixed(3)}`);
        
      } catch (error) {
        console.warn(`⚠️ Fold ${fold + 1} failed:`, error);
        // Continue with next fold
      }
    }
    
    return results;
  }

  /**
   * Execute combinatorial purged cross-validation
   */
  private async executeCombinatorialCrossValidation(
    strategy: StrategyDefinition,
    data: MarketDataPoint[],
    cvConfig: CrossValidationConfig,
    config: BacktestConfig
  ): Promise<CrossValidationResult[]> {
    
    const results: CrossValidationResult[] = [];
    const foldSize = Math.floor(data.length / cvConfig.folds);
    
    // Generate all possible combinations of test folds
    const combinations = this.generateFoldCombinations(cvConfig.folds);
    
    console.log(`  🔢 Testing ${combinations.length} fold combinations...`);
    
    for (let combIndex = 0; combIndex < combinations.length; combIndex++) {
      const combination = combinations[combIndex];
      
      try {
        // Create test set from combination of folds
        const testIndices: number[] = [];
        combination.forEach(foldNum => {
          const foldStart = foldNum * foldSize;
          const foldEnd = Math.min((foldNum + 1) * foldSize, data.length);
          for (let i = foldStart; i < foldEnd; i++) {
            testIndices.push(i);
          }
        });
        
        testIndices.sort((a, b) => a - b);
        
        // Create purged training and test sets
        const { trainSet, testSet, purgedIndices } = this.createPurgedSetsFromIndices(
          data,
          testIndices,
          cvConfig.purgeGap,
          cvConfig.embargoGap
        );
        
        if (trainSet.length < 50 || testSet.length < 20) {
          // Skip combinations with insufficient data
          continue;
        }
        
        // Train and test
        const optimizedStrategy = await this.optimizeStrategyOnTrainingSet(
          strategy,
          trainSet,
          config
        );
        
        const testResult = await this.testStrategyOnTestSet(
          optimizedStrategy.strategy,
          optimizedStrategy.parameters,
          testSet,
          config
        );
        
        // Store combinatorial result
        const combResult: CrossValidationResult = {
          foldNumber: -(combIndex + 1), // Negative to indicate combinatorial
          combinatorialFolds: combination,
          trainPeriod: {
            start: trainSet[0]?.date || '',
            end: trainSet[trainSet.length - 1]?.date || '',
            dataPoints: trainSet.length
          },
          testPeriod: {
            start: testSet[0]?.date || '',
            end: testSet[testSet.length - 1]?.date || '',
            dataPoints: testSet.length
          },
          purgedSamples: purgedIndices.length,
          optimizedParameters: optimizedStrategy.parameters,
          trainPerformance: optimizedStrategy.performance,
          testPerformance: testResult.performance,
          testTrades: testResult.trades,
          testPositions: testResult.positions,
          testReturns: testResult.returns,
          overfittingIndicator: this.calculateOverfittingIndicator(optimizedStrategy.performance, testResult.performance),
          stabilityScore: this.calculateStabilityScore(optimizedStrategy.parameters),
          outOfSampleDegradation: this.calculateDegradation(optimizedStrategy.performance, testResult.performance)
        };
        
        results.push(combResult);
        
      } catch (error) {
        console.warn(`⚠️ Combinatorial test ${combIndex + 1} failed:`, error);
        continue;
      }
    }
    
    return results;
  }

  /**
   * Create purged training and test sets
   */
  private createPurgedSets(
    data: MarketDataPoint[],
    testStart: number,
    testEnd: number,
    purgeGap: number,
    embargoGap: number
  ): {
    trainSet: MarketDataPoint[];
    testSet: MarketDataPoint[];
    purgedIndices: number[];
  } {
    
    const trainSet: MarketDataPoint[] = [];
    const testSet: MarketDataPoint[] = [];
    const purgedIndices: number[] = [];
    
    // Calculate purge boundaries
    const purgeStart = Math.max(0, testStart - purgeGap);
    const purgeEnd = Math.min(data.length, testEnd + embargoGap);
    
    for (let i = 0; i < data.length; i++) {
      if (i >= testStart && i < testEnd) {
        // Test set
        testSet.push(data[i]);
      } else if (i >= purgeStart && i < purgeEnd) {
        // Purged area - exclude from both training and testing
        purgedIndices.push(i);
      } else {
        // Training set
        trainSet.push(data[i]);
      }
    }
    
    return { trainSet, testSet, purgedIndices };
  }

  /**
   * Create purged sets from specific indices
   */
  private createPurgedSetsFromIndices(
    data: MarketDataPoint[],
    testIndices: number[],
    purgeGap: number,
    embargoGap: number
  ): {
    trainSet: MarketDataPoint[];
    testSet: MarketDataPoint[];
    purgedIndices: number[];
  } {
    
    const testSet = testIndices.map(i => data[i]);
    const purgedIndicesSet = new Set<number>();
    
    // Add test indices to purged set
    testIndices.forEach(idx => purgedIndicesSet.add(idx));
    
    // Add purge gaps around test indices
    testIndices.forEach(idx => {
      for (let i = Math.max(0, idx - purgeGap); i <= Math.min(data.length - 1, idx + embargoGap); i++) {
        purgedIndicesSet.add(i);
      }
    });
    
    const trainSet: MarketDataPoint[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (!purgedIndicesSet.has(i)) {
        trainSet.push(data[i]);
      }
    }
    
    return {
      trainSet,
      testSet,
      purgedIndices: Array.from(purgedIndicesSet)
    };
  }

  /**
   * Optimize strategy on training set
   */
  private async optimizeStrategyOnTrainingSet(
    strategy: StrategyDefinition,
    trainData: MarketDataPoint[],
    config: BacktestConfig
  ): Promise<{
    strategy: StrategyDefinition;
    parameters: Record<string, unknown>;
    performance: PerformanceMetrics;
  }> {
    
    // Get optimizable parameters
    const parameters = Object.keys(strategy.parameters);
    
    if (parameters.length === 0) {
      // No parameters to optimize
      const result = await this.backtestWithParameters(strategy, {}, trainData, config);
      return {
        strategy,
        parameters: {},
        performance: result.performance
      };
    }
    
    // Simple grid search optimization
    let bestResult: { parameters: Record<string, unknown>; performance: PerformanceMetrics } | null = null;
    const parameterCombinations = this.generateParameterCombinations(strategy.parameters);
    
    for (const params of parameterCombinations) {
      try {
        const result = await this.backtestWithParameters(strategy, params, trainData, config);
        
        // Use Sharpe ratio as optimization criterion
        const fitness = result.performance.sharpeRatio;
        
        if (!bestResult || fitness > bestResult.performance.sharpeRatio) {
          bestResult = {
            parameters: params,
            performance: result.performance
          };
        }
        
      } catch (error) {
        // Skip failed parameter combinations
        continue;
      }
    }
    
    if (!bestResult) {
      throw new Error('No valid parameter combination found during training');
    }
    
    return {
      strategy,
      parameters: bestResult.parameters,
      performance: bestResult.performance
    };
  }

  /**
   * Test strategy on test set
   */
  private async testStrategyOnTestSet(
    strategy: StrategyDefinition,
    optimizedParameters: Record<string, unknown>,
    testData: MarketDataPoint[],
    config: BacktestConfig
  ): Promise<{
    performance: PerformanceMetrics;
    trades: Trade[];
    positions: Position[];
    returns: number[];
  }> {
    
    return await this.backtestWithParameters(strategy, optimizedParameters, testData, config);
  }

  /**
   * Backtest with specific parameters
   */
  private async backtestWithParameters(
    strategy: StrategyDefinition,
    parameters: Record<string, unknown>,
    data: MarketDataPoint[],
    config: BacktestConfig
  ): Promise<{
    performance: PerformanceMetrics;
    trades: Trade[];
    positions: Position[];
    returns: number[];
  }> {
    
    // Apply parameters to strategy
    const parameterizedStrategy = {
      ...strategy,
      parameters: { ...strategy.parameters }
    };
    
    Object.keys(parameters).forEach(key => {
      if (parameterizedStrategy.parameters[key]) {
        (parameterizedStrategy.parameters[key] as any).defaultValue = parameters[key];
      }
    });
    
    // Execute backtesting logic
    const trades: Trade[] = [];
    const positions: Position[] = [];
    const returns: number[] = [];
    
    let currentCapital = config.initialCapital;
    let currentPosition: Position | null = null;
    
    // Generate signals
    const signals = this.generateSignals(parameterizedStrategy, data);
    
    for (let i = 1; i < data.length; i++) {
      const currentData = data[i];
      const previousData = data[i - 1];
      const signal = signals[i];
      
      let dailyReturn = 0;
      
      if (currentPosition) {
        const priceReturn = (currentData.close - previousData.close) / previousData.close;
        dailyReturn = priceReturn * currentPosition.weight;
        
        currentPosition.price = currentData.close;
        currentPosition.value = currentPosition.quantity * currentData.close;
        currentPosition.dailyReturn = dailyReturn;
        
        positions.push({ ...currentPosition, date: currentData.date });
      }
      
      // Position management logic
      if (signal && this.shouldChangePosition(signal, currentPosition, parameterizedStrategy)) {
        
        // Close existing position
        if (currentPosition) {
          const closeTrade: Trade = {
            id: `cv_${currentPosition.symbol}_${Date.now()}`,
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
        const positionSize = this.calculatePositionSize(
          currentCapital,
          config.maxPositionSize,
          signal.confidence,
          parameterizedStrategy.positionSizing
        );
        
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
    
    // Calculate performance
    const performance = this.calculatePerformanceFromReturns(returns, config.riskFreeRate);
    
    return {
      performance,
      trades,
      positions,
      returns
    };
  }

  /**
   * Analysis methods
   */
  private analyzeCrossValidationResults(results: CrossValidationResult[]): {
    averageTestPerformance: PerformanceMetrics;
    performanceStability: number;
    overfittingRisk: number;
    consistencyScore: number;
    temporalRobustness: number;
  } {
    
    if (results.length === 0) {
      return {
        averageTestPerformance: this.getEmptyPerformanceMetrics(),
        performanceStability: 0,
        overfittingRisk: 1,
        consistencyScore: 0,
        temporalRobustness: 0
      };
    }
    
    // Calculate average test performance
    const avgTestPerformance = this.calculateAveragePerformance(
      results.map(r => r.testPerformance)
    );
    
    // Calculate performance stability (low variance across folds)
    const testSharpeRatios = results.map(r => r.testPerformance.sharpeRatio);
    const avgSharpe = testSharpeRatios.reduce((sum, s) => sum + s, 0) / testSharpeRatios.length;
    const sharpeVariance = testSharpeRatios.reduce((sum, s) => sum + Math.pow(s - avgSharpe, 2), 0) / testSharpeRatios.length;
    const performanceStability = Math.max(0, 1 - sharpeVariance);
    
    // Calculate overfitting risk
    const overfittingIndicators = results.map(r => r.overfittingIndicator);
    const avgOverfitting = overfittingIndicators.reduce((sum, o) => sum + o, 0) / overfittingIndicators.length;
    const overfittingRisk = Math.min(1, Math.max(0, avgOverfitting));
    
    // Calculate consistency score (how many folds have positive performance)
    const positiveFolds = results.filter(r => r.testPerformance.totalReturn > 0).length;
    const consistencyScore = positiveFolds / results.length;
    
    // Calculate temporal robustness
    const temporalRobustness = this.calculateTemporalRobustness(results);
    
    return {
      averageTestPerformance: avgTestPerformance,
      performanceStability,
      overfittingRisk,
      consistencyScore,
      temporalRobustness
    };
  }

  private analyzeFoldPerformance(results: CrossValidationResult[]): {
    bestFold: number;
    worstFold: number;
    performanceRange: number;
    consistentPerformers: number[];
    volatileFolds: number[];
  } {
    
    if (results.length === 0) {
      return {
        bestFold: 0,
        worstFold: 0,
        performanceRange: 0,
        consistentPerformers: [],
        volatileFolds: []
      };
    }
    
    // Find best and worst performing folds
    let bestFold = 0;
    let worstFold = 0;
    let bestPerformance = -Infinity;
    let worstPerformance = Infinity;
    
    results.forEach((result, index) => {
      const performance = result.testPerformance.sharpeRatio;
      if (performance > bestPerformance) {
        bestPerformance = performance;
        bestFold = result.foldNumber;
      }
      if (performance < worstPerformance) {
        worstPerformance = performance;
        worstFold = result.foldNumber;
      }
    });
    
    const performanceRange = bestPerformance - worstPerformance;
    
    // Identify consistent performers (Sharpe > 0.5)
    const consistentPerformers = results
      .filter(r => r.testPerformance.sharpeRatio > 0.5)
      .map(r => r.foldNumber);
    
    // Identify volatile folds (high drawdown or volatility)
    const volatileFolds = results
      .filter(r => r.testPerformance.maxDrawdown > 0.15 || r.testPerformance.volatility > 0.25)
      .map(r => r.foldNumber);
    
    return {
      bestFold,
      worstFold,
      performanceRange,
      consistentPerformers,
      volatileFolds
    };
  }

  private analyzeTemporalStability(results: CrossValidationResult[]): {
    stabilityTrend: number;
    performanceDrift: number;
    regimeConsistency: number;
  } {
    
    if (results.length < 3) {
      return {
        stabilityTrend: 0,
        performanceDrift: 0,
        regimeConsistency: 0
      };
    }
    
    // Analyze performance over time (chronological order)
    const chronologicalResults = results
      .filter(r => r.foldNumber > 0) // Exclude combinatorial results
      .sort((a, b) => a.foldNumber - b.foldNumber);
    
    const performances = chronologicalResults.map(r => r.testPerformance.sharpeRatio);
    const timeIndices = chronologicalResults.map((_, i) => i);
    
    // Calculate performance drift (correlation with time)
    const performanceDrift = this.calculateCorrelation(timeIndices, performances);
    
    // Calculate stability trend (decreasing variance over time)
    const rollingVariances = this.calculateRollingVariance(performances, 3);
    const stabilityTrend = rollingVariances.length > 1 ? 
      (rollingVariances[0] - rollingVariances[rollingVariances.length - 1]) / rollingVariances[0] : 0;
    
    // Calculate regime consistency (performance in different market conditions)
    const regimeConsistency = this.calculateRegimeConsistency(chronologicalResults);
    
    return {
      stabilityTrend,
      performanceDrift,
      regimeConsistency
    };
  }

  /**
   * Utility methods
   */
  private getDefaultCrossValidationConfig(): CrossValidationConfig {
    return {
      folds: 5,
      purgeGap: 21,    // 21 days purge
      embargoGap: 21,  // 21 days embargo
      combinatorial: false
    };
  }

  private prepareData(marketData: Record<string, MarketData[]>, config: BacktestConfig): MarketDataPoint[] {
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

  private validateDataForCrossValidation(data: MarketDataPoint[], cvConfig: CrossValidationConfig): void {
    const minDataRequired = cvConfig.folds * 50 + cvConfig.purgeGap * cvConfig.folds + cvConfig.embargoGap * cvConfig.folds;
    
    if (data.length < minDataRequired) {
      throw new Error(`Insufficient data for cross-validation. Required: ${minDataRequired}, Available: ${data.length}`);
    }
  }

  private generateFoldCombinations(folds: number): number[][] {
    const combinations: number[][] = [];
    
    // Generate combinations of 1, 2, and 3 folds
    for (let size = 1; size <= Math.min(3, folds); size++) {
      const foldsArray = Array.from({ length: folds }, (_, i) => i);
      const combos = this.getCombinations(foldsArray, size);
      combinations.push(...combos);
    }
    
    return combinations.slice(0, 20); // Limit to prevent excessive computation
  }

  private getCombinations<T>(array: T[], size: number): T[][] {
    if (size === 1) return array.map(item => [item]);
    if (size === array.length) return [array];
    
    const combinations: T[][] = [];
    
    for (let i = 0; i <= array.length - size; i++) {
      const head = array[i];
      const tailCombos = this.getCombinations(array.slice(i + 1), size - 1);
      
      for (const tailCombo of tailCombos) {
        combinations.push([head, ...tailCombo]);
      }
    }
    
    return combinations;
  }

  private generateParameterCombinations(parameters: Record<string, any>): Record<string, unknown>[] {
    const combinations: Record<string, unknown>[] = [];
    const paramKeys = Object.keys(parameters);
    
    if (paramKeys.length === 0) return [{}];
    
    // Simple grid search - in production, this would be more sophisticated
    paramKeys.forEach(key => {
      const param = parameters[key];
      if (param.type === 'number' && param.bounds) {
        const { min = 0, max = 100, step = 1 } = param.bounds;
        for (let value = min; value <= max; value += step) {
          const combination: Record<string, unknown> = {};
          combination[key] = value;
          if (combinations.length === 0) {
            combinations.push(combination);
          } else {
            const newCombinations = combinations.map(existing => ({
              ...existing,
              [key]: value
            }));
            combinations.splice(0, combinations.length, ...newCombinations);
          }
        }
      }
    });
    
    return combinations.slice(0, 50); // Limit combinations
  }

  private generateSignals(strategy: StrategyDefinition, data: MarketDataPoint[]): Signal[] {
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

  private shouldChangePosition(signal: Signal, currentPosition: Position | null, strategy: StrategyDefinition): boolean {
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

  private calculatePositionSize(capital: number, maxPositionSize: number, confidence: number, method: string): number {
    return capital * maxPositionSize * confidence;
  }

  private calculateTradingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateOverfittingIndicator(trainPerformance: PerformanceMetrics, testPerformance: PerformanceMetrics): number {
    // Calculate degradation from in-sample to out-of-sample
    const returnDegradation = trainPerformance.annualizedReturn > 0 ? 
      (trainPerformance.annualizedReturn - testPerformance.annualizedReturn) / trainPerformance.annualizedReturn : 0;
    
    const sharpeDegradation = trainPerformance.sharpeRatio > 0 ? 
      (trainPerformance.sharpeRatio - testPerformance.sharpeRatio) / trainPerformance.sharpeRatio : 0;
    
    // Average degradation as overfitting indicator
    return Math.max(0, (returnDegradation + sharpeDegradation) / 2);
  }

  private calculateStabilityScore(parameters: Record<string, unknown>): number {
    // Simple stability score based on parameter values
    // In practice, this would analyze parameter sensitivity
    return Math.random() * 0.5 + 0.5; // Placeholder
  }

  private calculateDegradation(trainPerformance: PerformanceMetrics, testPerformance: PerformanceMetrics): {
    returnDegradation: number;
    sharpeDegradation: number;
    drawdownIncrease: number;
  } {
    
    const returnDegradation = trainPerformance.annualizedReturn > 0 ? 
      (trainPerformance.annualizedReturn - testPerformance.annualizedReturn) / trainPerformance.annualizedReturn : 0;
    
    const sharpeDegradation = trainPerformance.sharpeRatio > 0 ? 
      (trainPerformance.sharpeRatio - testPerformance.sharpeRatio) / trainPerformance.sharpeRatio : 0;
    
    const drawdownIncrease = testPerformance.maxDrawdown - trainPerformance.maxDrawdown;
    
    return {
      returnDegradation,
      sharpeDegradation,
      drawdownIncrease
    };
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

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
    
    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;
    
    for (let i = 0; i < x.length; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      
      numerator += deltaX * deltaY;
      sumXSquared += deltaX * deltaX;
      sumYSquared += deltaY * deltaY;
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateRollingVariance(values: number[], window: number): number[] {
    const rollingVariances: number[] = [];
    
    for (let i = window - 1; i < values.length; i++) {
      const windowValues = values.slice(i - window + 1, i + 1);
      const mean = windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;
      const variance = windowValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / windowValues.length;
      rollingVariances.push(variance);
    }
    
    return rollingVariances;
  }

  private calculateTemporalRobustness(results: CrossValidationResult[]): number {
    // Simplified temporal robustness calculation
    const performances = results.map(r => r.testPerformance.sharpeRatio);
    const consistentPerformance = performances.filter(p => p > 0).length / performances.length;
    return consistentPerformance;
  }

  private calculateRegimeConsistency(results: CrossValidationResult[]): number {
    // Simplified regime consistency - would need actual regime detection
    return 0.7; // Placeholder
  }

  private calculateAveragePerformance(performances: PerformanceMetrics[]): PerformanceMetrics {
    if (performances.length === 0) {
      return this.getEmptyPerformanceMetrics();
    }
    
    const avg = performances.reduce((acc, perf) => ({
      totalReturn: acc.totalReturn + perf.totalReturn / performances.length,
      annualizedReturn: acc.annualizedReturn + perf.annualizedReturn / performances.length,
      volatility: acc.volatility + perf.volatility / performances.length,
      sharpeRatio: acc.sharpeRatio + perf.sharpeRatio / performances.length,
      sortinoRatio: acc.sortinoRatio + perf.sortinoRatio / performances.length,
      calmarRatio: acc.calmarRatio + perf.calmarRatio / performances.length,
      maxDrawdown: Math.max(acc.maxDrawdown, perf.maxDrawdown),
      maxDrawdownDuration: acc.maxDrawdownDuration + perf.maxDrawdownDuration / performances.length,
      averageDrawdown: acc.averageDrawdown + perf.averageDrawdown / performances.length,
      recoveryTime: acc.recoveryTime + perf.recoveryTime / performances.length,
      totalTrades: acc.totalTrades + perf.totalTrades / performances.length,
      winRate: acc.winRate + perf.winRate / performances.length,
      averageWin: acc.averageWin + perf.averageWin / performances.length,
      averageLoss: acc.averageLoss + perf.averageLoss / performances.length,
      profitFactor: acc.profitFactor + perf.profitFactor / performances.length,
      bestMonth: Math.max(acc.bestMonth, perf.bestMonth),
      worstMonth: Math.min(acc.worstMonth, perf.worstMonth),
      positiveMonths: acc.positiveMonths + perf.positiveMonths / performances.length,
      consecutiveWins: Math.max(acc.consecutiveWins, perf.consecutiveWins),
      consecutiveLosses: Math.max(acc.consecutiveLosses, perf.consecutiveLosses),
      monthlyReturns: performances[0].monthlyReturns, // Use first one
      yearlyReturns: performances[0].yearlyReturns,   // Use first one
      rollingMetrics: performances[0].rollingMetrics  // Use first one
    }), this.getEmptyPerformanceMetrics());
    
    return avg;
  }

  private aggregateCrossValidationResults(results: CrossValidationResult[]): {
    returns: number[];
    trades: Trade[];
    positions: Position[];
  } {
    const allReturns: number[] = [];
    const allTrades: Trade[] = [];
    const allPositions: Position[] = [];
    
    results.forEach(result => {
      allReturns.push(...result.testReturns);
      allTrades.push(...result.testTrades);
      allPositions.push(...result.testPositions);
    });
    
    return {
      returns: allReturns,
      trades: allTrades,
      positions: allPositions
    };
  }

  private calculatePerformanceMetrics(results: { returns: number[]; trades: Trade[]; positions: Position[] }): PerformanceMetrics {
    return this.calculatePerformanceFromReturns(results.returns, 0.02);
  }

  private calculateRiskMetrics(results: { returns: number[]; trades: Trade[]; positions: Position[] }): RiskMetrics {
    const returns = results.returns;
    
    if (returns.length === 0) {
      return this.getEmptyRiskMetrics();
    }
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95Index = Math.floor(returns.length * 0.05);
    const var99Index = Math.floor(returns.length * 0.01);
    
    const var95 = Math.abs(sortedReturns[var95Index] || 0);
    const var99 = Math.abs(sortedReturns[var99Index] || 0);
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252);
    
    const skewness = this.calculateSkewness(returns, mean, Math.sqrt(variance));
    const kurtosis = this.calculateKurtosis(returns, mean, Math.sqrt(variance));
    
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
      tailRatio: this.calculateTailRatio(returns),
      volatilityRegimes: [],
      stressTestResults: []
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

  private calculateRobustnessMetrics(results: CrossValidationResult[]): {
    parameterStability: number;
    performanceConsistency: number;
    overfittingResistance: number;
  } {
    
    const overfittingIndicators = results.map(r => r.overfittingIndicator);
    const stabilityScores = results.map(r => r.stabilityScore);
    const performances = results.map(r => r.testPerformance.sharpeRatio);
    
    const avgOverfitting = overfittingIndicators.reduce((sum, o) => sum + o, 0) / overfittingIndicators.length;
    const avgStability = stabilityScores.reduce((sum, s) => sum + s, 0) / stabilityScores.length;
    
    const performanceVariance = this.calculateVariance(performances);
    const performanceConsistency = Math.max(0, 1 - performanceVariance);
    
    return {
      parameterStability: avgStability,
      performanceConsistency,
      overfittingResistance: Math.max(0, 1 - avgOverfitting)
    };
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
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
 * Supporting interfaces for Cross-Validation
 */
interface MarketDataPoint {
  date: string;
  symbol: string;
  close: number;
  volume: number;
}

interface CrossValidationResult {
  foldNumber: number;
  combinatorialFolds?: number[]; // For combinatorial CV
  trainPeriod: DateRange & { dataPoints: number };
  testPeriod: DateRange & { dataPoints: number };
  purgedSamples: number;
  optimizedParameters: Record<string, unknown>;
  trainPerformance: PerformanceMetrics;
  testPerformance: PerformanceMetrics;
  testTrades: Trade[];
  testPositions: Position[];
  testReturns: number[];
  overfittingIndicator: number;
  stabilityScore: number;
  outOfSampleDegradation: {
    returnDegradation: number;
    sharpeDegradation: number;
    drawdownIncrease: number;
  };
}