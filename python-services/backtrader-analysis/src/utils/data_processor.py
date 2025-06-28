"""
Data Processor

Handles processing and transformation of market data for Backtrader analysis.
Converts API data formats to Backtrader-compatible formats.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import structlog

from .logger import LoggerMixin

logger = structlog.get_logger(__name__)


class DataProcessor(LoggerMixin):
    """
    Processes market data for Backtrader analysis
    
    Handles:
    - Data format conversion
    - Symbol mapping and normalization
    - Date range filtering
    - Data cleaning and validation
    - Missing data handling
    """
    
    def __init__(self):
        super().__init__()
        
        # Symbol mapping for normalization
        self.symbol_mapping = {
            # Gold alternatives
            'GLD': 'Gold',
            'GOLD': 'Gold', 
            'IAU': 'Gold',
            
            # Treasury alternatives
            '^TNX': 'DGS10',
            'TNX': 'DGS10',
            '^IRX': 'DGS2', 
            'IRX': 'DGS2',
            
            # VIX alternatives
            '^VIX': 'VIX',
            
            # S&P 500 alternatives
            '^GSPC': 'SPY',
            'GSPC': 'SPY',
            'ES=F': 'SPY'
        }
        
        # Default column mapping
        self.column_mapping = {
            'Date': 'date',
            'Symbol': 'symbol',
            'Open': 'open',
            'High': 'high', 
            'Low': 'low',
            'Close': 'close',
            'Adj Close': 'close',  # Use adjusted close if available
            'Volume': 'volume'
        }
    
    def process_market_data(self, market_data: List[Dict], symbols: List[str] = None,
                          start_date: str = None, end_date: str = None,
                          validate_completeness: bool = True) -> Dict[str, Any]:
        """
        Process raw market data into Backtrader-compatible format
        
        Args:
            market_data: List of market data records
            symbols: List of symbols to process (optional)
            start_date: Start date for filtering
            end_date: End date for filtering
            validate_completeness: Whether to validate data completeness
            
        Returns:
            Processed data dictionary with success status
        """
        try:
            self.log_method_call(
                "process_market_data",
                data_count=len(market_data),
                symbols=symbols,
                start_date=start_date,
                end_date=end_date
            )
            
            # Convert to DataFrame for easier processing
            df = pd.DataFrame(market_data)
            
            if df.empty:
                return {
                    'success': False,
                    'error': 'No market data provided',
                    'data': {}
                }
            
            # Normalize column names
            df = self._normalize_columns(df)
            
            # Normalize symbols
            df = self._normalize_symbols(df)
            
            # Filter by date range if specified
            if start_date or end_date:
                df = self._filter_date_range(df, start_date, end_date)
            
            # Filter by symbols if specified
            if symbols:
                normalized_symbols = [self.symbol_mapping.get(s, s) for s in symbols]
                df = df[df['symbol'].isin(normalized_symbols)]
            
            # Process data by symbol
            processed_data = {}
            for symbol in df['symbol'].unique():
                symbol_df = df[df['symbol'] == symbol].copy()
                
                # Process individual symbol data
                processed_symbol_data = self._process_symbol_data(symbol_df, symbol)
                
                if processed_symbol_data is not None:
                    processed_data[symbol] = processed_symbol_data
                else:
                    self.logger.warning(f"Failed to process data for symbol: {symbol}")
            
            # Validate completeness if requested
            if validate_completeness:
                validation_result = self._validate_processed_data(processed_data)
                if not validation_result['valid']:
                    self.logger.warning(
                        "Data validation warnings",
                        warnings=validation_result['warnings']
                    )
            
            self.log_method_result(
                "process_market_data", 
                success=True,
                symbols_processed=list(processed_data.keys()),
                total_symbols=len(processed_data)
            )
            
            return {
                'success': True,
                'data': processed_data,
                'metadata': {
                    'total_symbols': len(processed_data),
                    'symbols_processed': list(processed_data.keys()),
                    'date_range': self._get_date_range(processed_data)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Data processing failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'data': {}
            }
    
    def _normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize column names to standard format"""
        
        # Apply column mapping
        df_renamed = df.rename(columns=self.column_mapping)
        
        # Ensure required columns exist
        required_columns = ['date', 'symbol', 'close']
        for col in required_columns:
            if col not in df_renamed.columns:
                if col == 'symbol' and 'Symbol' in df.columns:
                    df_renamed['symbol'] = df['Symbol']
                elif col == 'date' and 'Date' in df.columns:
                    df_renamed['date'] = df['Date']
                elif col == 'close':
                    # Try to find a close price column
                    close_candidates = ['Close', 'close', 'Adj Close', 'price']
                    for candidate in close_candidates:
                        if candidate in df.columns:
                            df_renamed['close'] = df[candidate]
                            break
        
        # Convert date column to datetime
        if 'date' in df_renamed.columns:
            df_renamed['date'] = pd.to_datetime(df_renamed['date'])
        
        return df_renamed
    
    def _normalize_symbols(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize symbol names using symbol mapping"""
        if 'symbol' in df.columns:
            df['symbol'] = df['symbol'].map(lambda x: self.symbol_mapping.get(x, x))
        
        return df
    
    def _filter_date_range(self, df: pd.DataFrame, start_date: str = None, 
                          end_date: str = None) -> pd.DataFrame:
        """Filter DataFrame by date range"""
        if 'date' not in df.columns:
            return df
        
        filtered_df = df.copy()
        
        if start_date:
            start_dt = pd.to_datetime(start_date)
            filtered_df = filtered_df[filtered_df['date'] >= start_dt]
        
        if end_date:
            end_dt = pd.to_datetime(end_date)
            filtered_df = filtered_df[filtered_df['date'] <= end_dt]
        
        return filtered_df
    
    def _process_symbol_data(self, symbol_df: pd.DataFrame, symbol: str) -> Optional[pd.DataFrame]:
        """
        Process data for individual symbol
        
        Args:
            symbol_df: DataFrame for single symbol
            symbol: Symbol name
            
        Returns:
            Processed DataFrame or None if processing fails
        """
        try:
            # Sort by date
            symbol_df = symbol_df.sort_values('date')
            
            # Set date as index
            symbol_df = symbol_df.set_index('date')
            
            # Ensure OHLC columns exist
            if 'open' not in symbol_df.columns:
                symbol_df['open'] = symbol_df['close']
            if 'high' not in symbol_df.columns:
                symbol_df['high'] = symbol_df['close']
            if 'low' not in symbol_df.columns:
                symbol_df['low'] = symbol_df['close']
            if 'volume' not in symbol_df.columns:
                symbol_df['volume'] = 0
            
            # Handle missing OHLC relationships
            symbol_df = self._fix_ohlc_relationships(symbol_df)
            
            # Handle missing values
            symbol_df = self._handle_missing_values(symbol_df)
            
            # Remove any remaining invalid data
            symbol_df = symbol_df.dropna(subset=['close'])
            
            # Ensure minimum data points
            if len(symbol_df) < 10:
                self.logger.warning(f"Insufficient data for symbol {symbol}: {len(symbol_df)} points")
                return None
            
            # Final validation
            if not self._validate_symbol_data(symbol_df, symbol):
                return None
            
            return symbol_df
            
        except Exception as e:
            self.logger.error(f"Failed to process symbol {symbol}: {str(e)}")
            return None
    
    def _fix_ohlc_relationships(self, df: pd.DataFrame) -> pd.DataFrame:
        """Fix OHLC relationships to ensure data integrity"""
        
        # Ensure high >= max(open, close) and low <= min(open, close)
        for idx in df.index:
            open_price = df.loc[idx, 'open']
            close_price = df.loc[idx, 'close']
            high_price = df.loc[idx, 'high']
            low_price = df.loc[idx, 'low']
            
            # Fix high price
            min_high = max(open_price, close_price)
            if high_price < min_high:
                df.loc[idx, 'high'] = min_high
            
            # Fix low price
            max_low = min(open_price, close_price)
            if low_price > max_low:
                df.loc[idx, 'low'] = max_low
        
        return df
    
    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle missing values in the data"""
        
        # Forward fill missing values
        df = df.fillna(method='ffill')
        
        # If still missing values at the beginning, backward fill
        df = df.fillna(method='bfill')
        
        # For any remaining missing values, use interpolation
        numeric_columns = ['open', 'high', 'low', 'close', 'volume']
        for col in numeric_columns:
            if col in df.columns:
                df[col] = df[col].interpolate(method='linear')
        
        return df
    
    def _validate_symbol_data(self, df: pd.DataFrame, symbol: str) -> bool:
        """Validate processed symbol data"""
        
        # Check for required columns
        required_columns = ['open', 'high', 'low', 'close']
        for col in required_columns:
            if col not in df.columns:
                self.logger.error(f"Missing required column {col} for symbol {symbol}")
                return False
        
        # Check for non-positive prices
        for col in required_columns:
            if (df[col] <= 0).any():
                self.logger.error(f"Non-positive prices found in {col} for symbol {symbol}")
                return False
        
        # Check for OHLC relationship violations
        ohlc_violations = (
            (df['high'] < df[['open', 'close']].max(axis=1)) |
            (df['low'] > df[['open', 'close']].min(axis=1))
        )
        
        if ohlc_violations.any():
            violation_count = ohlc_violations.sum()
            self.logger.warning(f"OHLC violations found for symbol {symbol}: {violation_count} cases")
            # Don't fail validation for minor violations, just log warning
        
        return True
    
    def _validate_processed_data(self, processed_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Validate the complete processed dataset"""
        warnings = []
        
        if not processed_data:
            return {
                'valid': False,
                'warnings': ['No symbols processed successfully']
            }
        
        # Check symbol count
        if len(processed_data) < 2:
            warnings.append("Less than 2 symbols processed - limited indicator calculations possible")
        
        # Check date alignment across symbols
        date_ranges = {}
        for symbol, df in processed_data.items():
            if not df.empty:
                date_ranges[symbol] = {
                    'start': df.index.min(),
                    'end': df.index.max(),
                    'count': len(df)
                }
        
        if date_ranges:
            # Check for significant date range differences
            start_dates = [dr['start'] for dr in date_ranges.values()]
            end_dates = [dr['end'] for dr in date_ranges.values()]
            
            start_range = max(start_dates) - min(start_dates)
            end_range = max(end_dates) - min(end_dates)
            
            if start_range.days > 30:
                warnings.append(f"Large start date range difference: {start_range.days} days")
            
            if end_range.days > 7:
                warnings.append(f"Large end date range difference: {end_range.days} days")
        
        return {
            'valid': True,
            'warnings': warnings
        }
    
    def _get_date_range(self, processed_data: Dict[str, pd.DataFrame]) -> Dict[str, str]:
        """Get overall date range from processed data"""
        all_start_dates = []
        all_end_dates = []
        
        for symbol, df in processed_data.items():
            if not df.empty:
                all_start_dates.append(df.index.min())
                all_end_dates.append(df.index.max())
        
        if all_start_dates and all_end_dates:
            return {
                'start': min(all_start_dates).isoformat(),
                'end': max(all_end_dates).isoformat()
            }
        
        return {'start': None, 'end': None}
    
    def resample_data(self, df: pd.DataFrame, frequency: str = 'D') -> pd.DataFrame:
        """
        Resample data to different frequency
        
        Args:
            df: Input DataFrame
            frequency: Target frequency ('D' for daily, 'W' for weekly, etc.)
            
        Returns:
            Resampled DataFrame
        """
        try:
            # OHLC resampling
            ohlc_dict = {
                'open': 'first',
                'high': 'max',
                'low': 'min',
                'close': 'last',
                'volume': 'sum'
            }
            
            # Only resample columns that exist
            resample_dict = {col: method for col, method in ohlc_dict.items() if col in df.columns}
            
            resampled_df = df.resample(frequency).agg(resample_dict)
            
            # Remove rows with missing close prices
            resampled_df = resampled_df.dropna(subset=['close'])
            
            return resampled_df
            
        except Exception as e:
            self.logger.error(f"Data resampling failed: {str(e)}")
            return df