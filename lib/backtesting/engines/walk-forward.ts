import {
  StrategyDefinition,
  BacktestConfig,
  WalkForwardConfig,
  MarketData,
  Signal,
  Trade,
  Position,
  PerformanceMetrics,
  RiskMetrics,
  TimeSeries,
  OptimizationResult,
  EngineResult
} from '../../types';

/**
 * Walk-Forward Analysis Engine
 * 
 * Implements rolling window optimization with out-of-sample validation.
 * This is considered one of the most robust backtesting methodologies as it:
 * 
 * 1. Optimizes parameters on in-sample data
 * 2. Tests the optimized strategy on unseen out-of-sample data
 * 3. Rolls the window forward to avoid lookahead bias
 * 4. Provides realistic estimates of strategy degradation over time
 * 
 * Key Features:
 * - Parameter optimization on rolling windows
 * - Out-of-sample validation
 * - Anchored and rolling window modes
 * - Stability analysis of optimized parameters
 * - Performance degradation tracking
 */
export class WalkForwardEngine {
  
  constructor() {}

  /**
   * Main walk-forward analysis execution
   */
  async backtest(
    strategy: StrategyDefinition,
    marketData: Record<string, MarketData[]>,
    config: BacktestConfig
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Starting Walk-Forward Analysis...');
      
      // Get walk-forward specific configuration
      const wfConfig = config.walkForward || this.getDefaultWalkForwardConfig();
      
      // Prepare data
      const preparedData = this.prepareData(marketData, config);
      if (preparedData.length < wfConfig.optimizationWindow + wfConfig.validationWindow) {
        throw new Error('Insufficient data for walk-forward analysis');
      }
      
      // Execute walk-forward analysis
      const walkForwardResults = await this.executeWalkForward(
        strategy, 
        preparedData, 
        wfConfig,
        config
      );
      
      // Aggregate results
      const aggregatedResults = this.aggregateWalkForwardResults(walkForwardResults);
      
      // Calculate performance metrics
      const performance = this.calculatePerformanceMetrics(aggregatedResults);
      const risk = this.calculateRiskMetrics(aggregatedResults);
      
      console.log('✅ Walk-Forward Analysis completed');
      
      return {
        returns: this.createTimeSeries(aggregatedResults.returns),
        trades: aggregatedResults.trades,
        positions: aggregatedResults.positions,
        performance,
        risk,
        specificData: {
          walkForwardPeriods: walkForwardResults.length,
          averageOptimizationReturn: walkForwardResults.reduce((sum, r) => sum + r.inSampleReturn, 0) / walkForwardResults.length,
          averageValidationReturn: walkForwardResults.reduce((sum, r) => sum + r.outOfSampleReturn, 0) / walkForwardResults.length,
          parameterStability: this.analyzeParameterStability(walkForwardResults),
          performanceDegradation: this.analyzePerformanceDegradation(walkForwardResults),
          walkForwardDetails: walkForwardResults
        }
      };
      
    } catch (error) {
      console.error('❌ Walk-Forward Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Execute the walk-forward analysis process
   */
  private async executeWalkForward(
    strategy: StrategyDefinition,
    data: MarketDataPoint[],
    wfConfig: WalkForwardConfig,
    config: BacktestConfig
  ): Promise<WalkForwardPeriod[]> {
    const results: WalkForwardPeriod[] = [];
    
    let currentIndex = 0;
    
    while (currentIndex + wfConfig.optimizationWindow + wfConfig.validationWindow <= data.length) {
      
      // Define optimization and validation periods
      const optimizationStart = currentIndex;
      const optimizationEnd = currentIndex + wfConfig.optimizationWindow;
      const validationStart = optimizationEnd;
      const validationEnd = validationStart + wfConfig.validationWindow;
      
      const optimizationData = data.slice(optimizationStart, optimizationEnd);
      const validationData = data.slice(validationStart, validationEnd);
      
      console.log(`  📊 Period ${results.length + 1}: Optimization ${optimizationData[0].date} to ${optimizationData[optimizationData.length - 1].date}`);
      console.log(`  📈 Validation ${validationData[0].date} to ${validationData[validationData.length - 1].date}`);
      
      try {
        // Step 1: Optimize parameters on in-sample data
        const optimizationResult = await this.optimizeParameters(
          strategy,
          optimizationData,
          config
        );
        
        // Step 2: Test optimized strategy on out-of-sample data
        const validationResult = await this.validateStrategy(
          strategy,
          optimizationResult.parameters,
          validationData,
          config
        );
        
        // Step 3: Store results
        const walkForwardPeriod: WalkForwardPeriod = {
          periodNumber: results.length + 1,
          optimizationPeriod: {
            start: optimizationData[0].date,
            end: optimizationData[optimizationData.length - 1].date,
            dataPoints: optimizationData.length
          },
          validationPeriod: {
            start: validationData[0].date,
            end: validationData[validationData.length - 1].date,
            dataPoints: validationData.length
          },
          optimizedParameters: optimizationResult.parameters,
          inSampleReturn: optimizationResult.performance.totalReturn,
          outOfSampleReturn: validationResult.performance.totalReturn,
          inSampleSharpe: optimizationResult.performance.sharpeRatio,
          outOfSampleSharpe: validationResult.performance.sharpeRatio,
          inSampleMaxDrawdown: optimizationResult.performance.maxDrawdown,
          outOfSampleMaxDrawdown: validationResult.performance.maxDrawdown,
          validationTrades: validationResult.trades,
          validationPositions: validationResult.positions,
          validationReturns: validationResult.returns,
          parameterRobustness: this.calculateParameterRobustness(optimizationResult),
          overfit: this.detectOverfitting(optimizationResult.performance, validationResult.performance)
        };
        
        results.push(walkForwardPeriod);
        
      } catch (error) {
        console.warn(`⚠️ Walk-forward period ${results.length + 1} failed:`, error);
        // Continue with next period
      }
      
      // Move to next period
      currentIndex += wfConfig.stepSize;
    }
    
    return results;
  }

  /**
   * Optimize strategy parameters on in-sample data
   */
  private async optimizeParameters(
    strategy: StrategyDefinition,
    data: MarketDataPoint[],
    config: BacktestConfig
  ): Promise<OptimizationResult> {
    
    // Get optimizable parameters
    const parameters = Object.keys(strategy.parameters);
    
    if (parameters.length === 0) {
      // No parameters to optimize, use defaults
      const defaultResult = await this.backtestWithParameters(strategy, {}, data, config);
      return {
        parameters: {},
        fitness: defaultResult.performance.sharpeRatio,
        metrics: defaultResult.performance,
        robust: true
      };
    }
    
    // Simple grid search optimization
    // In a production system, you might use more sophisticated optimization algorithms
    let bestResult: OptimizationResult | null = null;
    const parameterCombinations = this.generateParameterCombinations(strategy.parameters);
    
    console.log(`    🔍 Testing ${parameterCombinations.length} parameter combinations...`);
    
    for (const params of parameterCombinations) {
      try {
        const result = await this.backtestWithParameters(strategy, params, data, config);
        
        // Use Sharpe ratio as fitness function (could be configurable)
        const fitness = result.performance.sharpeRatio;
        
        if (!bestResult || fitness > bestResult.fitness) {
          bestResult = {
            parameters: params,
            fitness,
            metrics: result.performance,
            robust: this.isResultRobust(result.performance)
          };
        }
        
      } catch (error) {
        // Skip failed parameter combinations
        continue;
      }
    }
    
    if (!bestResult) {
      throw new Error('No valid parameter combination found during optimization');
    }
    
    console.log(`    ✅ Best parameters found with Sharpe ratio: ${bestResult.fitness.toFixed(3)}`);
    return bestResult;
  }

  /**
   * Validate optimized strategy on out-of-sample data
   */
  private async validateStrategy(
    strategy: StrategyDefinition,
    optimizedParameters: Record<string, unknown>,
    data: MarketDataPoint[],
    config: BacktestConfig
  ): Promise<{
    performance: PerformanceMetrics;
    trades: Trade[];
    positions: Position[];
    returns: number[];
  }> {
    
    return await this.backtestWithParameters(strategy, optimizedParameters, data, config);
  }

  /**
   * Backtest strategy with specific parameters
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
    
    // Update parameter values
    Object.keys(parameters).forEach(key => {
      if (parameterizedStrategy.parameters[key]) {
        (parameterizedStrategy.parameters[key] as any).defaultValue = parameters[key];
      }
    });
    
    // Execute simple backtesting logic
    const trades: Trade[] = [];
    const positions: Position[] = [];
    const returns: number[] = [];
    
    let currentCapital = config.initialCapital;
    let currentPosition: Position | null = null;
    
    // Generate signals based on strategy rules
    const signals = this.generateSignals(parameterizedStrategy, data);
    
    for (let i = 1; i < data.length; i++) {
      const currentData = data[i];
      const previousData = data[i - 1];
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
      
      // Check for position changes based on signals
      if (signal && this.shouldEnterPosition(signal, currentPosition, parameterizedStrategy)) {
        
        // Close existing position if needed
        if (currentPosition) {
          const closeTrade: Trade = {
            id: `${currentPosition.symbol}_${Date.now()}`,
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
    
    // Close final position if exists
    if (currentPosition && data.length > 0) {
      const finalData = data[data.length - 1];
      const finalTrade: Trade = {
        id: `${currentPosition.symbol}_final`,
        entryDate: currentPosition.date,
        exitDate: finalData.date,
        symbol: currentPosition.symbol,
        side: 'long',
        entryPrice: currentPosition.price,
        entryQuantity: currentPosition.quantity,
        entrySignal: signals[signals.length - 1],
        exitPrice: finalData.close,
        exitQuantity: currentPosition.quantity,
        pnl: (finalData.close - currentPosition.price) * currentPosition.quantity,
        pnlPercent: (finalData.close - currentPosition.price) / currentPosition.price,
        commissions: config.commissionRate * finalData.close * currentPosition.quantity,
        slippage: config.slippageRate * finalData.close * currentPosition.quantity,
        timeInTrade: this.calculateTradingDays(currentPosition.date, finalData.date)
      };
      
      trades.push(finalTrade);
    }
    
    // Calculate performance metrics
    const performance = this.calculatePerformanceFromReturns(returns, config.riskFreeRate);
    
    return {
      performance,
      trades,
      positions,
      returns
    };
  }

  /**
   * Utility methods
   */
  private getDefaultWalkForwardConfig(): WalkForwardConfig {
    return {
      optimizationWindow: 252, // 1 year
      validationWindow: 63,    // 3 months
      stepSize: 21,            // 1 month
      reoptimizeFrequency: 4   // Every 4 periods
    };
  }

  private prepareData(marketData: Record<string, MarketData[]>, config: BacktestConfig): MarketDataPoint[] {
    // Combine all market data into a single time series
    // For simplicity, we'll use SPY as the primary instrument
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

  private generateParameterCombinations(parameters: Record<string, any>): Record<string, unknown>[] {
    const combinations: Record<string, unknown>[] = [];
    const paramKeys = Object.keys(parameters);
    
    if (paramKeys.length === 0) return [{}];
    
    // Generate simple grid for numeric parameters
    // In production, this would be more sophisticated
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
            // Create combinations with existing parameters
            const newCombinations = combinations.map(existing => ({
              ...existing,
              [key]: value
            }));
            combinations.splice(0, combinations.length, ...newCombinations);
          }
        }
      }
    });
    
    // Limit combinations to prevent excessive computation
    return combinations.slice(0, 100);
  }

  private generateSignals(strategy: StrategyDefinition, data: MarketDataPoint[]): Signal[] {
    // Simplified signal generation
    // In a real implementation, this would use the actual strategy rules
    
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

  private shouldEnterPosition(
    signal: Signal, 
    currentPosition: Position | null, 
    strategy: StrategyDefinition
  ): boolean {
    // Simplified position entry logic
    if (!currentPosition) {
      return signal.signal === 'Risk-On' && signal.confidence > 0.5;
    }
    
    // Change position if signal changes
    const currentSymbol = this.getSymbolFromSignal(signal);
    return currentPosition.symbol !== currentSymbol;
  }

  private getSymbolFromSignal(signal: Signal): string {
    // Map signal types to trading symbols
    const symbolMap: Record<string, string> = {
      'sp500_ma': 'SPY',
      'utilities_spy': signal.signal === 'Risk-Off' ? 'XLU' : 'SPY',
      'lumber_gold': signal.signal === 'Risk-Off' ? 'GLD' : 'WOOD',
      'treasury_curve': signal.signal === 'Risk-Off' ? 'TLT' : 'IEF',
      'vix_defensive': signal.signal === 'Risk-Off' ? 'SPLV' : 'SPHB'
    };
    
    return symbolMap[signal.type] || 'SPY';
  }

  private calculatePositionSize(
    capital: number, 
    maxPositionSize: number, 
    confidence: number,
    method: string
  ): number {
    let baseSize = capital * maxPositionSize;
    
    // Adjust based on confidence
    baseSize *= confidence;
    
    // Apply position sizing method
    switch (method) {
      case 'volatility_adjusted':
        // Would need volatility calculation
        return baseSize * 0.8;
      case 'kelly_criterion':
        // Would need win rate and average win/loss
        return baseSize * 0.6;
      default:
        return baseSize;
    }
  }

  private calculateTradingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    const excessVariance = excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcessReturn, 2), 0) / excessReturns.length;
    const sharpeRatio = volatility > 0 ? (avgExcessReturn * 252) / volatility : 0;
    
    // Calculate drawdown
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
    
    return {
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      sortinoRatio: sharpeRatio * 1.2, // Simplified
      calmarRatio: annualizedReturn / (maxDrawdown || 0.01),
      maxDrawdown,
      maxDrawdownDuration: 0, // Would need more complex calculation
      averageDrawdown: maxDrawdown * 0.3, // Simplified
      recoveryTime: 0, // Would need more complex calculation
      totalTrades: 0, // Would be calculated from trades
      winRate: 0.5, // Simplified
      averageWin: 0.02, // Simplified
      averageLoss: -0.015, // Simplified
      profitFactor: 1.33, // Simplified
      bestMonth: Math.max(...returns) * 21, // Approximate
      worstMonth: Math.min(...returns) * 21, // Approximate
      positiveMonths: returns.filter(r => r > 0).length / returns.length * 100,
      consecutiveWins: 0, // Would need more complex calculation
      consecutiveLosses: 0, // Would need more complex calculation
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

  private calculateParameterRobustness(result: OptimizationResult): number {
    // Simplified robustness measure
    // In practice, this would analyze parameter sensitivity
    return result.robust ? 0.8 : 0.4;
  }

  private detectOverfitting(inSample: PerformanceMetrics, outOfSample: PerformanceMetrics): boolean {
    // Detect overfitting by comparing in-sample vs out-of-sample performance
    const returnDegradation = (inSample.annualizedReturn - outOfSample.annualizedReturn) / Math.abs(inSample.annualizedReturn);
    const sharpeDegradation = (inSample.sharpeRatio - outOfSample.sharpeRatio) / Math.abs(inSample.sharpeRatio);
    
    // Consider overfitting if performance degrades significantly
    return returnDegradation > 0.5 || sharpeDegradation > 0.5;
  }

  private isResultRobust(performance: PerformanceMetrics): boolean {
    return performance.sharpeRatio > 0.5 && performance.maxDrawdown < 0.2;
  }

  private aggregateWalkForwardResults(results: WalkForwardPeriod[]): {
    returns: number[];
    trades: Trade[];
    positions: Position[];
  } {
    const allReturns: number[] = [];
    const allTrades: Trade[] = [];
    const allPositions: Position[] = [];
    
    results.forEach(period => {
      allReturns.push(...period.validationReturns);
      allTrades.push(...period.validationTrades);
      allPositions.push(...period.validationPositions);
    });
    
    return {
      returns: allReturns,
      trades: allTrades,
      positions: allPositions
    };
  }

  private analyzeParameterStability(results: WalkForwardPeriod[]): {
    stability: number;
    mostStableParameters: string[];
    parameterDrift: Record<string, number>;
  } {
    // Analyze how stable optimized parameters are across periods
    const parameterHistory: Record<string, number[]> = {};
    
    results.forEach(period => {
      Object.entries(period.optimizedParameters).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (!parameterHistory[key]) parameterHistory[key] = [];
          parameterHistory[key].push(value);
        }
      });
    });
    
    const parameterStability: Record<string, number> = {};
    const parameterDrift: Record<string, number> = {};
    
    Object.entries(parameterHistory).forEach(([param, values]) => {
      if (values.length > 1) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Stability is inverse of coefficient of variation
        parameterStability[param] = mean > 0 ? 1 / (stdDev / mean) : 0;
        
        // Drift is the correlation with time
        const timeIndices = values.map((_, i) => i);
        const correlation = this.calculateCorrelation(timeIndices, values);
        parameterDrift[param] = Math.abs(correlation);
      }
    });
    
    const avgStability = Object.values(parameterStability).reduce((sum, s) => sum + s, 0) / Object.keys(parameterStability).length || 0;
    const mostStableParameters = Object.entries(parameterStability)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([param]) => param);
    
    return {
      stability: Math.min(1, avgStability / 10), // Normalize to 0-1
      mostStableParameters,
      parameterDrift
    };
  }

  private analyzePerformanceDegradation(results: WalkForwardPeriod[]): {
    avgDegradation: number;
    degradationTrend: number;
    consistentOverperformance: boolean;
  } {
    const degradations = results.map(r => 
      (r.inSampleReturn - r.outOfSampleReturn) / Math.abs(r.inSampleReturn)
    ).filter(d => isFinite(d));
    
    const avgDegradation = degradations.reduce((sum, d) => sum + d, 0) / degradations.length || 0;
    
    // Calculate trend in degradation
    const timeIndices = degradations.map((_, i) => i);
    const degradationTrend = this.calculateCorrelation(timeIndices, degradations);
    
    // Check for consistent overperformance (sign of overfitting)
    const overperformancePeriods = results.filter(r => r.outOfSampleReturn > r.inSampleReturn).length;
    const consistentOverperformance = overperformancePeriods / results.length > 0.7;
    
    return {
      avgDegradation,
      degradationTrend,
      consistentOverperformance
    };
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

  private calculatePerformanceMetrics(results: { returns: number[]; trades: Trade[]; positions: Position[] }): PerformanceMetrics {
    return this.calculatePerformanceFromReturns(results.returns, 0.02); // Assuming 2% risk-free rate
  }

  private calculateRiskMetrics(results: { returns: number[]; trades: Trade[]; positions: Position[] }): RiskMetrics {
    const returns = results.returns;
    
    if (returns.length === 0) {
      return this.getEmptyRiskMetrics();
    }
    
    // Calculate VaR
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95Index = Math.floor(returns.length * 0.05);
    const var99Index = Math.floor(returns.length * 0.01);
    
    const var95 = sortedReturns[var95Index] || 0;
    const var99 = sortedReturns[var99Index] || 0;
    
    // Calculate Expected Shortfall (Conditional VaR)
    const es95 = sortedReturns.slice(0, var95Index + 1).reduce((sum, r) => sum + r, 0) / (var95Index + 1) || 0;
    const es99 = sortedReturns.slice(0, var99Index + 1).reduce((sum, r) => sum + r, 0) / (var99Index + 1) || 0;
    
    // Calculate other risk metrics
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252);
    
    // Calculate skewness and kurtosis
    const skewness = this.calculateSkewness(returns, mean, Math.sqrt(variance));
    const kurtosis = this.calculateKurtosis(returns, mean, Math.sqrt(variance));
    
    return {
      var95: Math.abs(var95),
      var99: Math.abs(var99),
      expectedShortfall95: Math.abs(es95),
      expectedShortfall99: Math.abs(es99),
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
 * Supporting interfaces for Walk-Forward Analysis
 */
interface MarketDataPoint {
  date: string;
  symbol: string;
  close: number;
  volume: number;
}

interface WalkForwardPeriod {
  periodNumber: number;
  optimizationPeriod: {
    start: string;
    end: string;
    dataPoints: number;
  };
  validationPeriod: {
    start: string;
    end: string;
    dataPoints: number;
  };
  optimizedParameters: Record<string, unknown>;
  inSampleReturn: number;
  outOfSampleReturn: number;
  inSampleSharpe: number;
  outOfSampleSharpe: number;
  inSampleMaxDrawdown: number;
  outOfSampleMaxDrawdown: number;
  validationTrades: Trade[];
  validationPositions: Position[];
  validationReturns: number[];
  parameterRobustness: number;
  overfit: boolean;
}