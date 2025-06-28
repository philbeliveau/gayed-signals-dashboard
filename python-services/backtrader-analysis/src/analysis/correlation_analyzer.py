"""
Correlation Analyzer

Comprehensive correlation analysis between Gayed signals and market movements.
Provides statistical correlation analysis, lead-lag relationships, and signal effectiveness metrics.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from scipy import stats
from scipy.stats import pearsonr, spearmanr
import structlog

from ..utils.logger import LoggerMixin

logger = structlog.get_logger(__name__)


class CorrelationAnalyzer(LoggerMixin):
    """
    Analyzes correlations between Gayed signals and market movements
    
    Features:
    - Signal-to-price correlations
    - Cross-signal correlations  
    - Lead-lag relationship analysis
    - Rolling correlation analysis
    - Statistical significance testing
    - Signal effectiveness metrics
    """
    
    def __init__(self, min_periods: int = 30):
        super().__init__()
        self.min_periods = min_periods
    
    def analyze_correlations(self, chart_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Comprehensive correlation analysis of signals and market data
        
        Args:
            chart_data: Chart data from strategy analysis containing signals and prices
            
        Returns:
            Complete correlation analysis results
        """
        try:
            self.logger.info("Starting comprehensive correlation analysis")
            
            if not self._validate_chart_data(chart_data):
                return {'error': 'Invalid chart data provided'}
            
            # Extract and prepare data
            dates, prices, signals_data = self._extract_data(chart_data)
            
            if len(dates) < self.min_periods:
                return {'error': f'Insufficient data points: {len(dates)} < {self.min_periods}'}
            
            # Convert data to DataFrame for easier analysis
            df = self._create_analysis_dataframe(dates, prices, signals_data)
            
            # Perform various correlation analyses
            results = {
                'signal_price_correlations': self._analyze_signal_price_correlations(df),
                'cross_signal_correlations': self._analyze_cross_signal_correlations(df),
                'lead_lag_analysis': self._analyze_lead_lag_relationships(df),
                'rolling_correlations': self._analyze_rolling_correlations(df),
                'signal_effectiveness': self._analyze_signal_effectiveness(df),
                'statistical_tests': self._perform_statistical_tests(df),
                'summary_statistics': self._calculate_summary_statistics(df),
                'data_quality': self._assess_data_quality(df)
            }
            
            # Add metadata
            results['metadata'] = {
                'analysis_date': datetime.utcnow().isoformat(),
                'data_points': len(df),
                'date_range': {
                    'start': dates[0] if dates else None,
                    'end': dates[-1] if dates else None
                },
                'signals_analyzed': list(signals_data.keys()),
                'min_periods_threshold': self.min_periods
            }
            
            self.logger.info("Correlation analysis completed successfully")
            return results
            
        except Exception as e:
            self.logger.error(f"Correlation analysis failed: {str(e)}")
            return {'error': f'Analysis failed: {str(e)}'}
    
    def _validate_chart_data(self, chart_data: Dict[str, Any]) -> bool:
        """Validate input chart data structure"""
        required_keys = ['dates', 'prices', 'signals']
        return all(key in chart_data for key in required_keys)
    
    def _extract_data(self, chart_data: Dict[str, Any]) -> Tuple[List, List, Dict]:
        """Extract dates, prices, and signals from chart data"""
        dates = pd.to_datetime(chart_data['dates'])
        prices = chart_data['prices']
        signals_data = chart_data.get('signals', {})
        
        return dates, prices, signals_data
    
    def _create_analysis_dataframe(self, dates: List, prices: List, 
                                 signals_data: Dict[str, List]) -> pd.DataFrame:
        """
        Create comprehensive DataFrame for analysis
        
        Args:
            dates: List of dates
            prices: List of prices
            signals_data: Dictionary of signal data
            
        Returns:
            DataFrame with all data aligned by date
        """
        # Create base DataFrame
        df = pd.DataFrame({
            'date': dates,
            'price': prices
        })
        
        # Calculate price returns
        df['price_return'] = df['price'].pct_change()
        df['price_return_1d'] = df['price_return'].shift(-1)  # Next day return
        df['price_return_5d'] = df['price'].pct_change(5).shift(-5)  # 5-day forward return
        df['price_return_21d'] = df['price'].pct_change(21).shift(-21)  # 21-day forward return
        
        # Add signal data
        for signal_name, signal_list in signals_data.items():
            # Convert signal information to numeric values
            signal_values = []
            confidence_values = []
            strength_values = []
            
            for i, signal_info in enumerate(signal_list):
                if i >= len(dates):
                    break
                    
                # Convert signal type to numeric (-1, 0, 1)
                signal_type = signal_info.get('signal', 'Neutral')
                if signal_type == 'Risk-Off':
                    signal_values.append(1)
                elif signal_type == 'Risk-On':
                    signal_values.append(-1)
                else:
                    signal_values.append(0)
                
                # Extract confidence and strength
                confidence_values.append(signal_info.get('confidence', 0.0))
                
                strength = signal_info.get('strength', 'Weak')
                if strength == 'Strong':
                    strength_values.append(2)
                elif strength == 'Moderate':
                    strength_values.append(1)
                else:
                    strength_values.append(0)
            
            # Pad lists to match DataFrame length
            while len(signal_values) < len(df):
                signal_values.append(0)
                confidence_values.append(0.0)
                strength_values.append(0)
            
            # Trim lists if too long
            signal_values = signal_values[:len(df)]
            confidence_values = confidence_values[:len(df)]
            strength_values = strength_values[:len(df)]
            
            # Add to DataFrame
            df[f'{signal_name}_signal'] = signal_values
            df[f'{signal_name}_confidence'] = confidence_values
            df[f'{signal_name}_strength'] = strength_values
        
        # Set date as index
        df.set_index('date', inplace=True)
        
        return df
    
    def _analyze_signal_price_correlations(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze correlations between individual signals and price movements"""
        correlations = {}
        
        # Get signal columns
        signal_columns = [col for col in df.columns if col.endswith('_signal')]
        
        for signal_col in signal_columns:
            signal_name = signal_col.replace('_signal', '')
            
            # Calculate correlations with different return periods
            results = {}
            
            # Same day correlation
            if 'price_return' in df.columns:
                corr, p_value = self._safe_correlation(df[signal_col], df['price_return'])
                results['same_day'] = {'correlation': corr, 'p_value': p_value}
            
            # Next day correlation (predictive power)
            if 'price_return_1d' in df.columns:
                corr, p_value = self._safe_correlation(df[signal_col], df['price_return_1d'])
                results['next_day'] = {'correlation': corr, 'p_value': p_value}
            
            # 5-day forward correlation
            if 'price_return_5d' in df.columns:
                corr, p_value = self._safe_correlation(df[signal_col], df['price_return_5d'])
                results['5_day_forward'] = {'correlation': corr, 'p_value': p_value}
            
            # 21-day forward correlation
            if 'price_return_21d' in df.columns:
                corr, p_value = self._safe_correlation(df[signal_col], df['price_return_21d'])
                results['21_day_forward'] = {'correlation': corr, 'p_value': p_value}
            
            # Confidence-weighted correlation
            confidence_col = f'{signal_name}_confidence'
            if confidence_col in df.columns:
                weighted_signal = df[signal_col] * df[confidence_col]
                corr, p_value = self._safe_correlation(weighted_signal, df['price_return_1d'])
                results['confidence_weighted'] = {'correlation': corr, 'p_value': p_value}
            
            correlations[signal_name] = results
        
        return correlations
    
    def _analyze_cross_signal_correlations(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze correlations between different signals"""
        signal_columns = [col for col in df.columns if col.endswith('_signal')]
        cross_correlations = {}
        
        for i, signal1 in enumerate(signal_columns):
            signal1_name = signal1.replace('_signal', '')
            cross_correlations[signal1_name] = {}
            
            for j, signal2 in enumerate(signal_columns):
                if i != j:
                    signal2_name = signal2.replace('_signal', '')
                    
                    corr, p_value = self._safe_correlation(df[signal1], df[signal2])
                    cross_correlations[signal1_name][signal2_name] = {
                        'correlation': corr,
                        'p_value': p_value
                    }
        
        return cross_correlations
    
    def _analyze_lead_lag_relationships(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze lead-lag relationships between signals and price movements"""
        signal_columns = [col for col in df.columns if col.endswith('_signal')]
        lead_lag_results = {}
        
        for signal_col in signal_columns:
            signal_name = signal_col.replace('_signal', '')
            
            # Test different lag periods
            lag_results = {}
            for lag in range(-5, 6):  # -5 to +5 days
                if lag == 0:
                    continue
                    
                if lag > 0:
                    # Signal leads price (signal at t, price at t+lag)
                    price_series = df['price_return'].shift(-lag)
                    lag_type = f'signal_leads_{lag}d'
                else:
                    # Price leads signal (price at t, signal at t-lag)
                    signal_series = df[signal_col].shift(lag)
                    price_series = df['price_return']
                    lag_type = f'price_leads_{abs(lag)}d'
                
                if lag > 0:
                    corr, p_value = self._safe_correlation(df[signal_col], price_series)
                else:
                    corr, p_value = self._safe_correlation(signal_series, price_series)
                
                lag_results[lag_type] = {
                    'correlation': corr,
                    'p_value': p_value,
                    'lag_days': lag
                }
            
            # Find optimal lag
            best_lag = self._find_optimal_lag(lag_results)
            lag_results['optimal_lag'] = best_lag
            
            lead_lag_results[signal_name] = lag_results
        
        return lead_lag_results
    
    def _analyze_rolling_correlations(self, df: pd.DataFrame, window: int = 60) -> Dict[str, Any]:
        """Analyze rolling correlations over time"""
        signal_columns = [col for col in df.columns if col.endswith('_signal')]
        rolling_results = {}
        
        for signal_col in signal_columns:
            signal_name = signal_col.replace('_signal', '')
            
            # Calculate rolling correlation with next-day returns
            if len(df) >= window and 'price_return_1d' in df.columns:
                rolling_corr = df[signal_col].rolling(window=window).corr(df['price_return_1d'])
                
                rolling_results[signal_name] = {
                    'rolling_correlation': rolling_corr.dropna().tolist(),
                    'dates': rolling_corr.dropna().index.tolist(),
                    'mean_correlation': rolling_corr.mean(),
                    'std_correlation': rolling_corr.std(),
                    'min_correlation': rolling_corr.min(),
                    'max_correlation': rolling_corr.max(),
                    'window_size': window
                }
        
        return rolling_results
    
    def _analyze_signal_effectiveness(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze the effectiveness of signals in predicting price movements"""
        signal_columns = [col for col in df.columns if col.endswith('_signal')]
        effectiveness_results = {}
        
        for signal_col in signal_columns:
            signal_name = signal_col.replace('_signal', '')
            
            # Calculate directional accuracy
            signal_values = df[signal_col]
            next_day_returns = df['price_return_1d']
            
            # Remove NaN values
            valid_mask = ~(pd.isna(signal_values) | pd.isna(next_day_returns))
            valid_signals = signal_values[valid_mask]
            valid_returns = next_day_returns[valid_mask]
            
            if len(valid_signals) > 0:
                # Directional accuracy (signal and return have same sign)
                directional_accuracy = np.mean(
                    (valid_signals > 0) == (valid_returns > 0)
                ) if len(valid_signals) > 0 else 0
                
                # Risk-On accuracy (signal = -1, positive return)
                risk_on_mask = valid_signals == -1
                risk_on_accuracy = np.mean(valid_returns[risk_on_mask] > 0) if risk_on_mask.sum() > 0 else 0
                
                # Risk-Off accuracy (signal = 1, negative return)
                risk_off_mask = valid_signals == 1
                risk_off_accuracy = np.mean(valid_returns[risk_off_mask] < 0) if risk_off_mask.sum() > 0 else 0
                
                # Signal distribution
                signal_distribution = {
                    'risk_on_signals': int((valid_signals == -1).sum()),
                    'risk_off_signals': int((valid_signals == 1).sum()),
                    'neutral_signals': int((valid_signals == 0).sum()),
                    'total_signals': len(valid_signals)
                }
                
                # Return statistics by signal type
                return_stats = {}
                for signal_type, signal_value in [('risk_on', -1), ('risk_off', 1), ('neutral', 0)]:
                    mask = valid_signals == signal_value
                    if mask.sum() > 0:
                        returns_subset = valid_returns[mask]
                        return_stats[signal_type] = {
                            'mean_return': float(returns_subset.mean()),
                            'std_return': float(returns_subset.std()),
                            'positive_return_rate': float((returns_subset > 0).mean()),
                            'count': int(mask.sum())
                        }
                
                effectiveness_results[signal_name] = {
                    'directional_accuracy': float(directional_accuracy),
                    'risk_on_accuracy': float(risk_on_accuracy),
                    'risk_off_accuracy': float(risk_off_accuracy),
                    'signal_distribution': signal_distribution,
                    'return_statistics': return_stats
                }
        
        return effectiveness_results
    
    def _perform_statistical_tests(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Perform statistical significance tests"""
        signal_columns = [col for col in df.columns if col.endswith('_signal')]
        test_results = {}
        
        for signal_col in signal_columns:
            signal_name = signal_col.replace('_signal', '')
            
            if 'price_return_1d' in df.columns:
                signal_values = df[signal_col].dropna()
                return_values = df['price_return_1d'].dropna()
                
                # Align series
                common_index = signal_values.index.intersection(return_values.index)
                if len(common_index) > 10:
                    aligned_signals = signal_values[common_index]
                    aligned_returns = return_values[common_index]
                    
                    # Pearson correlation test
                    pearson_corr, pearson_p = pearsonr(aligned_signals, aligned_returns)
                    
                    # Spearman correlation test (non-parametric)
                    spearman_corr, spearman_p = spearmanr(aligned_signals, aligned_returns)
                    
                    # T-test for different signal groups
                    risk_on_returns = aligned_returns[aligned_signals == -1]
                    risk_off_returns = aligned_returns[aligned_signals == 1]
                    
                    t_stat, t_p_value = 0, 1
                    if len(risk_on_returns) > 5 and len(risk_off_returns) > 5:
                        t_stat, t_p_value = stats.ttest_ind(risk_on_returns, risk_off_returns)
                    
                    test_results[signal_name] = {
                        'pearson_correlation': {'statistic': float(pearson_corr), 'p_value': float(pearson_p)},
                        'spearman_correlation': {'statistic': float(spearman_corr), 'p_value': float(spearman_p)},
                        'risk_groups_ttest': {'statistic': float(t_stat), 'p_value': float(t_p_value)},
                        'sample_size': len(common_index)
                    }
        
        return test_results
    
    def _calculate_summary_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate summary statistics for the analysis"""
        stats = {
            'data_summary': {
                'total_observations': len(df),
                'date_range_days': (df.index.max() - df.index.min()).days,
                'missing_price_data': df['price'].isna().sum(),
                'price_volatility': df['price_return'].std() if 'price_return' in df.columns else 0
            },
            'signal_summary': {}
        }
        
        # Signal-specific statistics
        signal_columns = [col for col in df.columns if col.endswith('_signal')]
        for signal_col in signal_columns:
            signal_name = signal_col.replace('_signal', '')
            signal_data = df[signal_col]
            
            stats['signal_summary'][signal_name] = {
                'total_signals': len(signal_data),
                'non_neutral_signals': (signal_data != 0).sum(),
                'signal_frequency': (signal_data != 0).mean(),
                'risk_on_frequency': (signal_data == -1).mean(),
                'risk_off_frequency': (signal_data == 1).mean()
            }
        
        return stats
    
    def _assess_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Assess the quality of data for correlation analysis"""
        quality_assessment = {
            'overall_quality': 'good',  # Will be updated based on checks
            'issues': [],
            'recommendations': []
        }
        
        # Check for sufficient data
        if len(df) < self.min_periods:
            quality_assessment['issues'].append(f'Insufficient data: {len(df)} < {self.min_periods}')
            quality_assessment['overall_quality'] = 'poor'
        
        # Check for missing data
        missing_pct = df.isna().mean().mean()
        if missing_pct > 0.1:  # More than 10% missing
            quality_assessment['issues'].append(f'High missing data: {missing_pct:.1%}')
            quality_assessment['overall_quality'] = 'fair'
        
        # Check for signal activity
        signal_columns = [col for col in df.columns if col.endswith('_signal')]
        for signal_col in signal_columns:
            signal_name = signal_col.replace('_signal', '')
            non_neutral_pct = (df[signal_col] != 0).mean()
            
            if non_neutral_pct < 0.05:  # Less than 5% non-neutral signals
                quality_assessment['issues'].append(f'{signal_name} has very low signal activity: {non_neutral_pct:.1%}')
        
        # Generate recommendations
        if quality_assessment['issues']:
            quality_assessment['recommendations'].extend([
                'Consider using longer time periods for analysis',
                'Verify signal calculation parameters',
                'Check data source quality'
            ])
        
        return quality_assessment
    
    def _safe_correlation(self, x: pd.Series, y: pd.Series) -> Tuple[float, float]:
        """Calculate correlation safely with error handling"""
        try:
            # Remove NaN values
            valid_mask = ~(pd.isna(x) | pd.isna(y))
            x_clean = x[valid_mask]
            y_clean = y[valid_mask]
            
            if len(x_clean) < 10:  # Need minimum observations
                return 0.0, 1.0
            
            corr, p_value = pearsonr(x_clean, y_clean)
            
            # Handle NaN results
            if pd.isna(corr) or pd.isna(p_value):
                return 0.0, 1.0
            
            return float(corr), float(p_value)
            
        except Exception as e:
            self.logger.warning(f"Correlation calculation failed: {str(e)}")
            return 0.0, 1.0
    
    def _find_optimal_lag(self, lag_results: Dict[str, Any]) -> Dict[str, Any]:
        """Find the optimal lag period based on correlation strength"""
        best_correlation = 0
        best_lag_info = {}
        
        for lag_key, lag_data in lag_results.items():
            if 'correlation' in lag_data:
                abs_correlation = abs(lag_data['correlation'])
                if abs_correlation > abs(best_correlation):
                    best_correlation = lag_data['correlation']
                    best_lag_info = {
                        'lag_type': lag_key,
                        'correlation': best_correlation,
                        'p_value': lag_data.get('p_value', 1.0),
                        'lag_days': lag_data.get('lag_days', 0)
                    }
        
        return best_lag_info