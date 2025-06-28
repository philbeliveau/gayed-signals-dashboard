"""
Performance Attribution

Comprehensive performance attribution analysis for Gayed signals.
Analyzes how signals contribute to returns, prediction accuracy, and risk metrics.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from scipy import stats
import structlog

from ..utils.logger import LoggerMixin

logger = structlog.get_logger(__name__)


class PerformanceAttribution(LoggerMixin):
    """
    Analyzes performance attribution of Gayed signals
    
    Features:
    - Signal return attribution
    - Prediction accuracy analysis
    - Risk contribution analysis
    - Time-series performance analysis
    - Signal effectiveness metrics
    - Portfolio performance simulation
    """
    
    def __init__(self, initial_capital: float = 100000):
        super().__init__()
        self.initial_capital = initial_capital
    
    def analyze_performance(self, strategy_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Comprehensive performance attribution analysis
        
        Args:
            strategy_results: Results from strategy analysis containing signal and market data
            
        Returns:
            Performance attribution results
        """
        try:
            self.logger.info("Starting performance attribution analysis")
            
            # Extract data from strategy results
            analysis_data = strategy_results.get('analysis_results', {})
            chart_data = analysis_data.get('chart_data', {})
            signal_history = strategy_results.get('signal_history', [])
            
            if not chart_data or not signal_history:
                return {'error': 'Insufficient data for performance attribution'}
            
            # Prepare data for analysis
            df = self._prepare_performance_data(chart_data, signal_history)
            
            if df.empty or len(df) < 10:
                return {'error': 'Insufficient data points for analysis'}
            
            # Perform comprehensive performance analysis
            results = {
                'overall_performance': self._calculate_overall_performance(df),
                'signal_attribution': self._analyze_signal_attribution(df),
                'prediction_accuracy': self._analyze_prediction_accuracy(df),
                'risk_attribution': self._analyze_risk_attribution(df),
                'time_series_analysis': self._analyze_time_series_performance(df),
                'signal_effectiveness': self._analyze_signal_effectiveness(df),
                'portfolio_simulation': self._simulate_portfolio_performance(df),
                'drawdown_analysis': self._analyze_drawdowns(df),
                'volatility_analysis': self._analyze_volatility_attribution(df)
            }
            
            # Add summary and metadata
            results['summary'] = self._create_performance_summary(results)
            results['metadata'] = {
                'analysis_date': datetime.utcnow().isoformat(),
                'data_points': len(df),
                'date_range': {
                    'start': df.index[0].isoformat() if len(df) > 0 else None,
                    'end': df.index[-1].isoformat() if len(df) > 0 else None
                },
                'initial_capital': self.initial_capital
            }
            
            self.logger.info("Performance attribution analysis completed successfully")
            return results
            
        except Exception as e:
            self.logger.error(f"Performance attribution analysis failed: {str(e)}")
            return {'error': f'Analysis failed: {str(e)}'}
    
    def _prepare_performance_data(self, chart_data: Dict[str, Any], 
                                signal_history: List[Dict]) -> pd.DataFrame:
        """
        Prepare comprehensive DataFrame for performance analysis
        
        Args:
            chart_data: Chart data from strategy
            signal_history: Signal history from strategy
            
        Returns:
            DataFrame with all performance data
        """
        # Start with chart data
        if not chart_data.get('dates') or not chart_data.get('prices'):
            return pd.DataFrame()
        
        dates = pd.to_datetime(chart_data['dates'])
        prices = chart_data['prices']
        
        # Create base DataFrame
        df = pd.DataFrame({
            'date': dates,
            'price': prices
        })
        
        # Calculate returns
        df['price_return'] = df['price'].pct_change()
        df['cumulative_return'] = (1 + df['price_return']).cumprod() - 1
        
        # Add signal data from signal history
        signal_data = {}
        consensus_data = []
        
        for record in signal_history:
            record_date = pd.to_datetime(record['date'])
            
            # Individual signals
            individual_signals = record.get('individual_signals', {})
            for signal_name, signal_info in individual_signals.items():
                if signal_name not in signal_data:
                    signal_data[signal_name] = []
                
                signal_type = signal_info.get('signal', 'Neutral')
                confidence = signal_info.get('confidence', 0.0)
                
                # Convert to numeric
                if signal_type == 'Risk-Off':
                    signal_value = 1
                elif signal_type == 'Risk-On':
                    signal_value = -1
                else:
                    signal_value = 0
                
                signal_data[signal_name].append({
                    'date': record_date,
                    'signal': signal_value,
                    'confidence': confidence
                })
            
            # Consensus data
            consensus_info = record.get('consensus', {})
            if consensus_info:
                consensus_type = consensus_info.get('consensus', 'Mixed')
                if consensus_type == 'Risk-Off':
                    consensus_value = 1
                elif consensus_type == 'Risk-On':
                    consensus_value = -1
                else:
                    consensus_value = 0
                
                consensus_data.append({
                    'date': record_date,
                    'consensus': consensus_value,
                    'confidence': consensus_info.get('confidence', 0.0)
                })
        
        # Add signal columns to DataFrame
        for signal_name, data_list in signal_data.items():
            signal_df = pd.DataFrame(data_list)
            if not signal_df.empty:
                signal_df = signal_df.groupby('date').last()  # Handle duplicates
                df = df.set_index('date').join(
                    signal_df[['signal', 'confidence']].add_suffix(f'_{signal_name}'),
                    how='left'
                ).reset_index()
        
        # Add consensus data
        if consensus_data:
            consensus_df = pd.DataFrame(consensus_data)
            consensus_df = consensus_df.groupby('date').last()
            df = df.set_index('date').join(
                consensus_df[['consensus', 'confidence']].add_suffix('_consensus'),
                how='left'
            ).reset_index()
        
        # Fill missing signal values with 0 (neutral)
        signal_columns = [col for col in df.columns if col.startswith('signal_') or col.startswith('consensus')]
        df[signal_columns] = df[signal_columns].fillna(0)
        
        # Set date as index
        df.set_index('date', inplace=True)
        
        return df
    
    def _calculate_overall_performance(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate overall performance metrics"""
        
        # Basic return metrics
        total_return = df['cumulative_return'].iloc[-1] if len(df) > 0 else 0
        annualized_return = (1 + total_return) ** (252 / len(df)) - 1 if len(df) > 0 else 0
        
        # Volatility
        volatility = df['price_return'].std() * np.sqrt(252)
        
        # Sharpe ratio (assuming 2% risk-free rate)
        risk_free_rate = 0.02
        sharpe_ratio = (annualized_return - risk_free_rate) / volatility if volatility > 0 else 0
        
        # Maximum drawdown
        cumulative_returns = 1 + df['cumulative_return']
        running_max = cumulative_returns.expanding().max()
        drawdown = (cumulative_returns - running_max) / running_max
        max_drawdown = drawdown.min()
        
        # Sortino ratio (downside deviation)
        downside_returns = df['price_return'][df['price_return'] < 0]
        downside_deviation = downside_returns.std() * np.sqrt(252)
        sortino_ratio = (annualized_return - risk_free_rate) / downside_deviation if downside_deviation > 0 else 0
        
        # Calmar ratio
        calmar_ratio = annualized_return / abs(max_drawdown) if max_drawdown < 0 else 0
        
        # Win rate and other trading metrics
        positive_returns = (df['price_return'] > 0).sum()
        total_periods = len(df['price_return'].dropna())
        win_rate = positive_returns / total_periods if total_periods > 0 else 0
        
        return {
            'total_return': float(total_return),
            'annualized_return': float(annualized_return),
            'volatility': float(volatility),
            'sharpe_ratio': float(sharpe_ratio),
            'sortino_ratio': float(sortino_ratio),
            'calmar_ratio': float(calmar_ratio),
            'max_drawdown': float(max_drawdown),
            'win_rate': float(win_rate),
            'total_periods': int(total_periods),
            'positive_periods': int(positive_returns)
        }
    
    def _analyze_signal_attribution(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze return attribution by signal"""
        signal_columns = [col for col in df.columns if col.startswith('signal_')]
        attribution_results = {}
        
        for signal_col in signal_columns:
            signal_name = signal_col.replace('signal_', '')
            
            # Calculate returns when signal is active
            signal_active = df[signal_col] != 0
            
            if signal_active.sum() > 5:  # Need minimum signal observations
                # Returns during signal periods
                signal_returns = df.loc[signal_active, 'price_return']
                no_signal_returns = df.loc[~signal_active, 'price_return']
                
                # Performance metrics
                signal_mean_return = signal_returns.mean()
                signal_volatility = signal_returns.std()
                no_signal_mean_return = no_signal_returns.mean()
                
                # Risk-On vs Risk-Off attribution
                risk_on_mask = df[signal_col] == -1
                risk_off_mask = df[signal_col] == 1
                
                risk_on_returns = df.loc[risk_on_mask, 'price_return']
                risk_off_returns = df.loc[risk_off_mask, 'price_return']
                
                # Calculate contribution to overall return
                signal_contribution = 0
                if len(signal_returns) > 0:
                    # Weight by frequency of signal
                    signal_weight = len(signal_returns) / len(df)
                    signal_contribution = signal_mean_return * signal_weight
                
                attribution_results[signal_name] = {
                    'return_contribution': float(signal_contribution),
                    'signal_mean_return': float(signal_mean_return),
                    'signal_volatility': float(signal_volatility * np.sqrt(252)),
                    'no_signal_mean_return': float(no_signal_mean_return),
                    'signal_frequency': float(signal_active.mean()),
                    'risk_on_mean_return': float(risk_on_returns.mean()) if len(risk_on_returns) > 0 else 0,
                    'risk_off_mean_return': float(risk_off_returns.mean()) if len(risk_off_returns) > 0 else 0,
                    'risk_on_frequency': float(risk_on_mask.mean()),
                    'risk_off_frequency': float(risk_off_mask.mean()),
                    'accuracy': self._calculate_signal_accuracy(df[signal_col], df['price_return'])
                }
        
        return attribution_results
    
    def _analyze_prediction_accuracy(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze prediction accuracy of signals"""
        signal_columns = [col for col in df.columns if col.startswith('signal_')]
        accuracy_results = {}
        
        # Calculate next-day returns for prediction analysis
        df['next_day_return'] = df['price_return'].shift(-1)
        
        for signal_col in signal_columns:
            signal_name = signal_col.replace('signal_', '')
            
            # Prediction accuracy metrics
            signal_values = df[signal_col]
            next_returns = df['next_day_return']
            
            # Remove NaN values
            valid_mask = ~(pd.isna(signal_values) | pd.isna(next_returns))
            valid_signals = signal_values[valid_mask]
            valid_returns = next_returns[valid_mask]
            
            if len(valid_signals) > 10:
                # Directional accuracy
                directional_accuracy = np.mean(
                    (valid_signals > 0) == (valid_returns < 0)  # Risk-Off predicts negative returns
                ) + np.mean(
                    (valid_signals < 0) == (valid_returns > 0)  # Risk-On predicts positive returns
                )
                directional_accuracy /= 2  # Average the two conditions
                
                # Risk-On prediction accuracy
                risk_on_predictions = valid_signals == -1
                risk_on_accuracy = np.mean(
                    valid_returns[risk_on_predictions] > 0
                ) if risk_on_predictions.sum() > 0 else 0
                
                # Risk-Off prediction accuracy
                risk_off_predictions = valid_signals == 1
                risk_off_accuracy = np.mean(
                    valid_returns[risk_off_predictions] < 0
                ) if risk_off_predictions.sum() > 0 else 0
                
                # Precision and recall
                actual_positive = valid_returns > 0
                actual_negative = valid_returns < 0
                
                predicted_positive = valid_signals == -1  # Risk-On
                predicted_negative = valid_signals == 1   # Risk-Off
                
                # Precision: Of predicted positives, how many were actually positive
                precision_positive = np.mean(
                    actual_positive[predicted_positive]
                ) if predicted_positive.sum() > 0 else 0
                
                precision_negative = np.mean(
                    actual_negative[predicted_negative]
                ) if predicted_negative.sum() > 0 else 0
                
                # Information coefficient (correlation between signal and forward returns)
                ic = np.corrcoef(valid_signals, valid_returns)[0, 1] if len(valid_signals) > 1 else 0
                
                accuracy_results[signal_name] = {
                    'directional_accuracy': float(directional_accuracy),
                    'risk_on_accuracy': float(risk_on_accuracy),
                    'risk_off_accuracy': float(risk_off_accuracy),
                    'precision_positive': float(precision_positive),
                    'precision_negative': float(precision_negative),
                    'information_coefficient': float(ic if not np.isnan(ic) else 0),
                    'total_predictions': len(valid_signals),
                    'active_predictions': int((valid_signals != 0).sum())
                }
        
        return accuracy_results
    
    def _analyze_risk_attribution(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze risk contribution by signals"""
        signal_columns = [col for col in df.columns if col.startswith('signal_')]
        risk_results = {}
        
        for signal_col in signal_columns:
            signal_name = signal_col.replace('signal_', '')
            
            # Risk metrics during signal periods
            signal_active = df[signal_col] != 0
            
            if signal_active.sum() > 5:
                signal_returns = df.loc[signal_active, 'price_return']
                no_signal_returns = df.loc[~signal_active, 'price_return']
                
                # Volatility contribution
                signal_volatility = signal_returns.std() * np.sqrt(252)
                no_signal_volatility = no_signal_returns.std() * np.sqrt(252)
                
                # VaR contribution (95% VaR)
                signal_var = np.percentile(signal_returns, 5) if len(signal_returns) > 10 else 0
                no_signal_var = np.percentile(no_signal_returns, 5) if len(no_signal_returns) > 10 else 0
                
                # Maximum drawdown during signal periods
                signal_cumret = (1 + signal_returns).cumprod()
                signal_running_max = signal_cumret.expanding().max()
                signal_drawdown = ((signal_cumret - signal_running_max) / signal_running_max).min()
                
                # Downside deviation
                signal_downside = signal_returns[signal_returns < 0]
                signal_downside_dev = signal_downside.std() * np.sqrt(252) if len(signal_downside) > 0 else 0
                
                risk_results[signal_name] = {
                    'volatility_contribution': float(signal_volatility - no_signal_volatility),
                    'signal_volatility': float(signal_volatility),
                    'no_signal_volatility': float(no_signal_volatility),
                    'var_95': float(signal_var),
                    'max_drawdown_during_signal': float(signal_drawdown),
                    'downside_deviation': float(signal_downside_dev),
                    'signal_frequency': float(signal_active.mean())
                }
        
        return risk_results
    
    def _analyze_time_series_performance(self, df: pd.DataFrame, window: int = 60) -> Dict[str, Any]:
        """Analyze performance over time with rolling windows"""
        
        if len(df) < window:
            return {'error': f'Insufficient data for rolling analysis: {len(df)} < {window}'}
        
        # Rolling performance metrics
        rolling_returns = df['price_return'].rolling(window=window)
        rolling_cumret = df['cumulative_return'].rolling(window=window)
        
        # Calculate rolling metrics
        rolling_mean = rolling_returns.mean()
        rolling_vol = rolling_returns.std() * np.sqrt(252)
        rolling_sharpe = (rolling_mean * 252) / rolling_vol
        
        # Rolling maximum drawdown
        rolling_max_dd = []
        for i in range(window, len(df)):
            window_data = df['cumulative_return'].iloc[i-window:i]
            cumret = 1 + window_data
            running_max = cumret.expanding().max()
            drawdown = ((cumret - running_max) / running_max).min()
            rolling_max_dd.append(drawdown)
        
        # Signal performance over time
        signal_performance = {}
        signal_columns = [col for col in df.columns if col.startswith('signal_')]
        
        for signal_col in signal_columns:
            signal_name = signal_col.replace('signal_', '')
            
            # Rolling signal accuracy
            rolling_accuracy = []
            for i in range(window, len(df)):
                window_signals = df[signal_col].iloc[i-window:i]
                window_returns = df['price_return'].iloc[i-window:i]
                accuracy = self._calculate_signal_accuracy(window_signals, window_returns)
                rolling_accuracy.append(accuracy)
            
            signal_performance[signal_name] = {
                'rolling_accuracy': rolling_accuracy,
                'mean_accuracy': np.mean(rolling_accuracy) if rolling_accuracy else 0,
                'accuracy_trend': self._calculate_trend(rolling_accuracy) if len(rolling_accuracy) > 5 else 0
            }
        
        return {
            'rolling_returns': rolling_mean.dropna().tolist(),
            'rolling_volatility': rolling_vol.dropna().tolist(),
            'rolling_sharpe': rolling_sharpe.dropna().tolist(),
            'rolling_max_drawdown': rolling_max_dd,
            'dates': df.index[window:].tolist(),
            'signal_performance': signal_performance,
            'window_size': window
        }
    
    def _analyze_signal_effectiveness(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze overall signal effectiveness"""
        signal_columns = [col for col in df.columns if col.startswith('signal_')]
        
        # Overall metrics
        total_signals = sum((df[col] != 0).sum() for col in signal_columns)
        total_periods = len(df)
        signal_coverage = total_signals / (total_periods * len(signal_columns)) if total_periods > 0 else 0
        
        # Signal agreement analysis
        signal_agreement = 0
        if len(signal_columns) > 1:
            # Calculate how often signals agree
            agreement_count = 0
            total_comparisons = 0
            
            for i in range(len(signal_columns)):
                for j in range(i + 1, len(signal_columns)):
                    sig1 = df[signal_columns[i]]
                    sig2 = df[signal_columns[j]]
                    
                    # Both signals active
                    both_active = (sig1 != 0) & (sig2 != 0)
                    if both_active.sum() > 0:
                        # Agreement when both active
                        agreement = (sig1[both_active] == sig2[both_active]).mean()
                        agreement_count += agreement
                        total_comparisons += 1
            
            signal_agreement = agreement_count / total_comparisons if total_comparisons > 0 else 0
        
        # Best and worst performing signals
        signal_rankings = []
        for signal_col in signal_columns:
            signal_name = signal_col.replace('signal_', '')
            accuracy = self._calculate_signal_accuracy(df[signal_col], df['price_return'])
            signal_rankings.append((signal_name, accuracy))
        
        signal_rankings.sort(key=lambda x: x[1], reverse=True)
        
        return {
            'signal_coverage': float(signal_coverage),
            'signal_agreement': float(signal_agreement),
            'best_signal': signal_rankings[0][0] if signal_rankings else None,
            'worst_signal': signal_rankings[-1][0] if signal_rankings else None,
            'signal_rankings': [(name, float(acc)) for name, acc in signal_rankings],
            'total_signal_periods': int(total_signals),
            'average_accuracy': float(np.mean([acc for _, acc in signal_rankings]) if signal_rankings else 0)
        }
    
    def _simulate_portfolio_performance(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Simulate portfolio performance based on signals"""
        
        # Simple portfolio simulation: Long when consensus Risk-On, Short when Risk-Off, Cash otherwise
        if 'consensus_consensus' not in df.columns:
            return {'error': 'No consensus signals available for portfolio simulation'}
        
        # Portfolio positions based on consensus
        positions = df['consensus_consensus'].copy()  # -1 (long), 1 (short), 0 (cash)
        positions = -positions  # Flip signs: Risk-On -> Long, Risk-Off -> Short
        
        # Calculate portfolio returns
        portfolio_returns = positions.shift(1) * df['price_return']  # Lag positions by 1 day
        portfolio_returns = portfolio_returns.fillna(0)
        
        # Portfolio value over time
        portfolio_value = self.initial_capital * (1 + portfolio_returns).cumprod()
        
        # Performance metrics
        total_return = (portfolio_value.iloc[-1] / self.initial_capital) - 1
        annualized_return = (1 + total_return) ** (252 / len(df)) - 1
        volatility = portfolio_returns.std() * np.sqrt(252)
        sharpe_ratio = (annualized_return - 0.02) / volatility if volatility > 0 else 0
        
        # Maximum drawdown
        running_max = portfolio_value.expanding().max()
        drawdown = (portfolio_value - running_max) / running_max
        max_drawdown = drawdown.min()
        
        # Trade analysis
        position_changes = positions.diff().fillna(0)
        trades = (position_changes != 0).sum()
        
        return {
            'total_return': float(total_return),
            'annualized_return': float(annualized_return),
            'volatility': float(volatility),
            'sharpe_ratio': float(sharpe_ratio),
            'max_drawdown': float(max_drawdown),
            'final_value': float(portfolio_value.iloc[-1]),
            'total_trades': int(trades),
            'portfolio_returns': portfolio_returns.tolist(),
            'portfolio_values': portfolio_value.tolist(),
            'positions': positions.tolist()
        }
    
    def _analyze_drawdowns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detailed drawdown analysis"""
        
        # Calculate drawdowns
        cumulative_returns = 1 + df['cumulative_return']
        running_max = cumulative_returns.expanding().max()
        drawdown = (cumulative_returns - running_max) / running_max
        
        # Find drawdown periods
        in_drawdown = drawdown < -0.01  # More than 1% drawdown
        drawdown_periods = []
        
        if in_drawdown.any():
            # Identify individual drawdown periods
            drawdown_starts = in_drawdown & ~in_drawdown.shift(1).fillna(False)
            drawdown_ends = ~in_drawdown & in_drawdown.shift(1).fillna(False)
            
            starts = drawdown_starts[drawdown_starts].index.tolist()
            ends = drawdown_ends[drawdown_ends].index.tolist()
            
            # Ensure equal length
            if len(starts) > len(ends):
                ends.append(df.index[-1])
            
            for start, end in zip(starts, ends):
                period_drawdown = drawdown[start:end]
                max_dd = period_drawdown.min()
                duration = (end - start).days
                
                drawdown_periods.append({
                    'start': start.isoformat(),
                    'end': end.isoformat(),
                    'max_drawdown': float(max_dd),
                    'duration_days': duration
                })
        
        return {
            'max_drawdown': float(drawdown.min()),
            'current_drawdown': float(drawdown.iloc[-1]),
            'drawdown_periods': drawdown_periods,
            'average_drawdown': float(drawdown[drawdown < 0].mean()) if (drawdown < 0).any() else 0,
            'time_in_drawdown': float((drawdown < -0.01).mean())
        }
    
    def _analyze_volatility_attribution(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze volatility attribution by signals"""
        
        base_volatility = df['price_return'].std() * np.sqrt(252)
        
        # Volatility during different market regimes
        volatility_regimes = {}
        
        if 'consensus_consensus' in df.columns:
            consensus = df['consensus_consensus']
            
            # Risk-On periods
            risk_on_periods = consensus == -1
            if risk_on_periods.sum() > 5:
                risk_on_vol = df.loc[risk_on_periods, 'price_return'].std() * np.sqrt(252)
                volatility_regimes['risk_on'] = float(risk_on_vol)
            
            # Risk-Off periods
            risk_off_periods = consensus == 1
            if risk_off_periods.sum() > 5:
                risk_off_vol = df.loc[risk_off_periods, 'price_return'].std() * np.sqrt(252)
                volatility_regimes['risk_off'] = float(risk_off_vol)
            
            # Neutral periods
            neutral_periods = consensus == 0
            if neutral_periods.sum() > 5:
                neutral_vol = df.loc[neutral_periods, 'price_return'].std() * np.sqrt(252)
                volatility_regimes['neutral'] = float(neutral_vol)
        
        return {
            'base_volatility': float(base_volatility),
            'regime_volatilities': volatility_regimes,
            'volatility_clustering': self._analyze_volatility_clustering(df)
        }
    
    def _analyze_volatility_clustering(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze volatility clustering effects"""
        
        # Calculate rolling volatility
        rolling_vol = df['price_return'].rolling(window=21).std()
        
        # Volatility persistence (autocorrelation)
        vol_autocorr = rolling_vol.autocorr(lag=1) if len(rolling_vol.dropna()) > 1 else 0
        
        # High vs low volatility periods
        high_vol_threshold = rolling_vol.quantile(0.75)
        high_vol_periods = rolling_vol > high_vol_threshold
        
        return {
            'volatility_persistence': float(vol_autocorr if not np.isnan(vol_autocorr) else 0),
            'high_volatility_frequency': float(high_vol_periods.mean()),
            'volatility_range': {
                'min': float(rolling_vol.min()),
                'max': float(rolling_vol.max()),
                'mean': float(rolling_vol.mean())
            }
        }
    
    def _calculate_signal_accuracy(self, signals: pd.Series, returns: pd.Series) -> float:
        """Calculate directional accuracy of signals"""
        
        # Remove NaN values
        valid_mask = ~(pd.isna(signals) | pd.isna(returns))
        valid_signals = signals[valid_mask]
        valid_returns = returns[valid_mask]
        
        if len(valid_signals) == 0:
            return 0.0
        
        # Calculate directional accuracy
        # Risk-Off signal (1) should predict negative returns
        # Risk-On signal (-1) should predict positive returns
        risk_off_correct = ((valid_signals == 1) & (valid_returns < 0)).sum()
        risk_on_correct = ((valid_signals == -1) & (valid_returns > 0)).sum()
        
        total_active_signals = (valid_signals != 0).sum()
        
        if total_active_signals == 0:
            return 0.0
        
        accuracy = (risk_off_correct + risk_on_correct) / total_active_signals
        return float(accuracy)
    
    def _calculate_trend(self, series: List[float]) -> float:
        """Calculate trend in a time series using linear regression slope"""
        if len(series) < 2:
            return 0.0
        
        x = np.arange(len(series))
        y = np.array(series)
        
        # Remove NaN values
        valid_mask = ~np.isnan(y)
        if valid_mask.sum() < 2:
            return 0.0
        
        x_valid = x[valid_mask]
        y_valid = y[valid_mask]
        
        # Linear regression
        slope, _, _, _, _ = stats.linregress(x_valid, y_valid)
        return float(slope)
    
    def _create_performance_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Create summary of key performance insights"""
        
        summary = {
            'best_performing_signal': None,
            'most_accurate_signal': None,
            'highest_risk_signal': None,
            'key_insights': [],
            'recommendations': []
        }
        
        # Extract key metrics
        signal_attribution = results.get('signal_attribution', {})
        prediction_accuracy = results.get('prediction_accuracy', {})
        risk_attribution = results.get('risk_attribution', {})
        
        # Find best performers
        if signal_attribution:
            best_return = max(signal_attribution.items(), key=lambda x: x[1].get('return_contribution', 0))
            summary['best_performing_signal'] = best_return[0]
        
        if prediction_accuracy:
            best_accuracy = max(prediction_accuracy.items(), key=lambda x: x[1].get('directional_accuracy', 0))
            summary['most_accurate_signal'] = best_accuracy[0]
        
        if risk_attribution:
            highest_risk = max(risk_attribution.items(), key=lambda x: x[1].get('signal_volatility', 0))
            summary['highest_risk_signal'] = highest_risk[0]
        
        # Generate insights
        overall_perf = results.get('overall_performance', {})
        if overall_perf.get('sharpe_ratio', 0) > 1.0:
            summary['key_insights'].append("Strategy shows strong risk-adjusted returns")
        
        if overall_perf.get('max_drawdown', 0) < -0.2:
            summary['key_insights'].append("Strategy experienced significant drawdowns")
        
        # Generate recommendations
        if overall_perf.get('volatility', 0) > 0.3:
            summary['recommendations'].append("Consider implementing volatility targeting")
        
        if prediction_accuracy and all(acc.get('directional_accuracy', 0) < 0.6 for acc in prediction_accuracy.values()):
            summary['recommendations'].append("Review signal parameters to improve prediction accuracy")
        
        return summary