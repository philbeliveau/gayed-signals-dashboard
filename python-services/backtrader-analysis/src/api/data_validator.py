"""
Market Data Validator

Validates incoming market data requests to ensure data quality
and completeness for Backtrader analysis.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import numpy as np
import structlog

logger = structlog.get_logger(__name__)


class MarketDataValidator:
    """
    Validates market data for Backtrader analysis
    
    Performs:
    - Data format validation
    - Date range validation
    - Symbol validation  
    - Data completeness checks
    - Price data sanity checks
    """
    
    def __init__(self):
        self.required_symbols = {
            'utilities_spy': ['XLU', 'SPY'],
            'lumber_gold': ['Lumber', 'Gold', 'GLD'],  # Accept alternative gold symbols
            'treasury_curve': ['DGS2', 'DGS10', '^TNX', '^IRX'],  # Accept treasury alternatives
            'vix_defensive': ['VIX', '^VIX'],
            'sp500_ma': ['SPY', '^GSPC', 'ES=F']  # Accept S&P alternatives
        }
        
        self.symbol_aliases = {
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
        
        self.min_data_points = 50  # Minimum data points for meaningful analysis
        self.max_data_points = 10000  # Maximum to prevent memory issues
    
    def validate_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate complete analysis request
        
        Args:
            request_data: Request data from API
            
        Returns:
            Validation result with success status and errors
        """
        errors = []
        warnings = []
        
        try:
            # Check required fields
            if 'data' not in request_data:
                errors.append("Missing 'data' field in request")
                return {'valid': False, 'errors': errors, 'warnings': warnings}
            
            market_data = request_data['data']
            symbols = request_data.get('symbols', [])
            
            # Validate data structure
            structure_validation = self._validate_data_structure(market_data)
            if not structure_validation['valid']:
                errors.extend(structure_validation['errors'])
            
            # Validate data content
            content_validation = self._validate_data_content(market_data)
            errors.extend(content_validation['errors'])
            warnings.extend(content_validation['warnings'])
            
            # Validate symbols
            symbol_validation = self._validate_symbols(symbols, market_data)
            errors.extend(symbol_validation['errors'])
            warnings.extend(symbol_validation['warnings'])
            
            # Validate date ranges
            date_validation = self._validate_date_ranges(request_data)
            errors.extend(date_validation['errors'])
            warnings.extend(date_validation['warnings'])
            
            # Check data completeness
            completeness_validation = self._validate_data_completeness(market_data, symbols)
            errors.extend(completeness_validation['errors'])
            warnings.extend(completeness_validation['warnings'])
            
            # Validate data quality
            quality_validation = self._validate_data_quality(market_data)
            warnings.extend(quality_validation['warnings'])
            
            result = {
                'valid': len(errors) == 0,
                'errors': errors,
                'warnings': warnings,
                'data_summary': {
                    'total_records': len(market_data),
                    'symbols_found': list(set(item.get('symbol', '') for item in market_data)),
                    'date_range': self._get_date_range(market_data)
                }
            }
            
            if result['valid']:
                logger.info(f"Data validation passed with {len(warnings)} warnings")
            else:
                logger.warning(f"Data validation failed with {len(errors)} errors")
            
            return result
            
        except Exception as e:
            logger.error(f"Data validation error: {str(e)}")
            return {
                'valid': False,
                'errors': [f"Validation error: {str(e)}"],
                'warnings': []
            }
    
    def _validate_data_structure(self, market_data: List[Dict]) -> Dict[str, Any]:
        """Validate the basic structure of market data"""
        errors = []
        
        if not isinstance(market_data, list):
            errors.append("Market data must be a list")
            return {'valid': False, 'errors': errors}
        
        if len(market_data) == 0:
            errors.append("Market data is empty")
            return {'valid': False, 'errors': errors}
        
        if len(market_data) < self.min_data_points:
            errors.append(f"Insufficient data points: {len(market_data)} < {self.min_data_points}")
        
        if len(market_data) > self.max_data_points:
            errors.append(f"Too many data points: {len(market_data)} > {self.max_data_points}")
        
        # Validate structure of individual records
        required_fields = ['date', 'symbol', 'close']
        optional_fields = ['open', 'high', 'low', 'volume']
        
        for i, record in enumerate(market_data[:10]):  # Check first 10 records
            if not isinstance(record, dict):
                errors.append(f"Record {i} is not a dictionary")
                continue
            
            for field in required_fields:
                if field not in record:
                    errors.append(f"Record {i} missing required field: {field}")
            
            # Check data types
            if 'date' in record and not isinstance(record['date'], str):
                errors.append(f"Record {i} date field must be string")
            
            if 'symbol' in record and not isinstance(record['symbol'], str):
                errors.append(f"Record {i} symbol field must be string")
            
            for field in ['close', 'open', 'high', 'low', 'volume']:
                if field in record and not isinstance(record[field], (int, float)):
                    errors.append(f"Record {i} {field} field must be numeric")
        
        return {'valid': len(errors) == 0, 'errors': errors}
    
    def _validate_data_content(self, market_data: List[Dict]) -> Dict[str, Any]:
        """Validate the content of market data"""
        errors = []
        warnings = []
        
        dates_seen = set()
        symbols_seen = set()
        
        for i, record in enumerate(market_data):
            try:
                # Validate date format
                if 'date' in record:
                    try:
                        date_obj = pd.to_datetime(record['date'])
                        dates_seen.add(record['date'])
                    except:
                        errors.append(f"Record {i} has invalid date format: {record['date']}")
                
                # Track symbols
                if 'symbol' in record:
                    symbols_seen.add(record['symbol'])
                
                # Validate price values
                for field in ['open', 'high', 'low', 'close']:
                    if field in record:
                        value = record[field]
                        if not isinstance(value, (int, float)) or value <= 0:
                            errors.append(f"Record {i} {field} must be positive number: {value}")
                        elif value > 1000000:  # Sanity check for extreme values
                            warnings.append(f"Record {i} {field} seems unusually high: {value}")
                
                # Validate OHLC relationships
                if all(field in record for field in ['open', 'high', 'low', 'close']):
                    o, h, l, c = record['open'], record['high'], record['low'], record['close']
                    if h < max(o, c) or l > min(o, c):
                        errors.append(f"Record {i} OHLC relationships invalid")
                
                # Validate volume
                if 'volume' in record:
                    volume = record['volume']
                    if not isinstance(volume, (int, float)) or volume < 0:
                        warnings.append(f"Record {i} volume should be non-negative: {volume}")
            
            except Exception as e:
                errors.append(f"Record {i} validation error: {str(e)}")
        
        return {'errors': errors, 'warnings': warnings}
    
    def _validate_symbols(self, symbols: List[str], market_data: List[Dict]) -> Dict[str, Any]:
        """Validate symbol requirements"""
        errors = []
        warnings = []
        
        # Get symbols from data
        data_symbols = set(record.get('symbol', '') for record in market_data)
        data_symbols.discard('')  # Remove empty symbols
        
        # Normalize symbols using aliases
        normalized_symbols = set()
        for symbol in data_symbols:
            normalized_symbols.add(self.symbol_aliases.get(symbol, symbol))
        
        # Check for required symbol combinations
        available_indicators = []
        
        for indicator, required in self.required_symbols.items():
            has_required = any(req in normalized_symbols for req in required)
            if has_required:
                available_indicators.append(indicator)
            else:
                warnings.append(f"Cannot calculate {indicator}: missing symbols {required}")
        
        if not available_indicators:
            errors.append("No valid indicator combinations found in data")
        
        # Check for unknown symbols
        if symbols:  # If symbols were specified in request
            for symbol in symbols:
                if symbol not in data_symbols:
                    warnings.append(f"Requested symbol not found in data: {symbol}")
        
        return {
            'errors': errors,
            'warnings': warnings,
            'available_indicators': available_indicators
        }
    
    def _validate_date_ranges(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate date ranges in request"""
        errors = []
        warnings = []
        
        start_date = request_data.get('start_date')
        end_date = request_data.get('end_date')
        
        if start_date:
            try:
                start_dt = pd.to_datetime(start_date)
            except:
                errors.append(f"Invalid start_date format: {start_date}")
                return {'errors': errors, 'warnings': warnings}
        
        if end_date:
            try:
                end_dt = pd.to_datetime(end_date)
            except:
                errors.append(f"Invalid end_date format: {end_date}")
                return {'errors': errors, 'warnings': warnings}
        
        if start_date and end_date:
            if start_dt >= end_dt:
                errors.append("start_date must be before end_date")
            
            date_range = (end_dt - start_dt).days
            if date_range > 3650:  # More than 10 years
                warnings.append(f"Very large date range: {date_range} days")
            elif date_range < 30:  # Less than 30 days
                warnings.append(f"Very small date range: {date_range} days")
        
        return {'errors': errors, 'warnings': warnings}
    
    def _validate_data_completeness(self, market_data: List[Dict], symbols: List[str]) -> Dict[str, Any]:
        """Validate data completeness across symbols and dates"""
        errors = []
        warnings = []
        
        # Group data by symbol
        symbol_data = {}
        for record in market_data:
            symbol = record.get('symbol', '')
            if symbol:
                if symbol not in symbol_data:
                    symbol_data[symbol] = []
                symbol_data[symbol].append(record)
        
        # Check data completeness for each symbol
        for symbol, records in symbol_data.items():
            if len(records) < self.min_data_points:
                warnings.append(f"Symbol {symbol} has insufficient data: {len(records)} records")
            
            # Check for date gaps
            dates = []
            for record in records:
                try:
                    dates.append(pd.to_datetime(record['date']))
                except:
                    continue
            
            if dates:
                dates.sort()
                gaps = []
                for i in range(1, len(dates)):
                    gap = (dates[i] - dates[i-1]).days
                    if gap > 7:  # More than a week gap
                        gaps.append(gap)
                
                if gaps:
                    max_gap = max(gaps)
                    if max_gap > 30:
                        warnings.append(f"Symbol {symbol} has large date gap: {max_gap} days")
        
        return {'errors': errors, 'warnings': warnings}
    
    def _validate_data_quality(self, market_data: List[Dict]) -> Dict[str, Any]:
        """Validate data quality and detect anomalies"""
        warnings = []
        
        # Group by symbol for quality checks
        symbol_data = {}
        for record in market_data:
            symbol = record.get('symbol', '')
            if symbol and 'close' in record:
                if symbol not in symbol_data:
                    symbol_data[symbol] = []
                symbol_data[symbol].append(record['close'])
        
        for symbol, prices in symbol_data.items():
            if len(prices) < 10:
                continue
            
            prices_array = np.array(prices)
            
            # Check for extreme price movements
            returns = np.diff(prices_array) / prices_array[:-1]
            extreme_returns = np.abs(returns) > 0.5  # 50% daily moves
            
            if np.any(extreme_returns):
                extreme_count = np.sum(extreme_returns)
                warnings.append(f"Symbol {symbol} has {extreme_count} extreme price movements")
            
            # Check for flat prices (no movement)
            flat_periods = np.sum(returns == 0)
            if flat_periods > len(returns) * 0.1:  # More than 10% flat
                warnings.append(f"Symbol {symbol} has many periods with no price movement")
            
            # Check for negative prices
            if np.any(prices_array <= 0):
                warnings.append(f"Symbol {symbol} has non-positive prices")
        
        return {'warnings': warnings}
    
    def _get_date_range(self, market_data: List[Dict]) -> Dict[str, str]:
        """Get date range from market data"""
        dates = []
        
        for record in market_data:
            try:
                dates.append(pd.to_datetime(record['date']))
            except:
                continue
        
        if dates:
            dates.sort()
            return {
                'start': dates[0].isoformat(),
                'end': dates[-1].isoformat()
            }
        
        return {'start': None, 'end': None}
    
    def suggest_data_fixes(self, validation_result: Dict[str, Any]) -> List[str]:
        """
        Suggest fixes for data validation issues
        
        Args:
            validation_result: Result from validate_request
            
        Returns:
            List of suggested fixes
        """
        suggestions = []
        
        errors = validation_result.get('errors', [])
        warnings = validation_result.get('warnings', [])
        
        # Analyze errors and provide suggestions
        for error in errors:
            if 'insufficient data points' in error.lower():
                suggestions.append("Provide more historical data (minimum 50 data points)")
            elif 'missing required field' in error.lower():
                suggestions.append("Ensure all records have date, symbol, and close price fields")
            elif 'invalid date format' in error.lower():
                suggestions.append("Use ISO date format (YYYY-MM-DD) for all date fields")
            elif 'no valid indicator combinations' in error.lower():
                suggestions.append("Include data for required symbol pairs (e.g., XLU+SPY, Lumber+Gold)")
        
        # Analyze warnings
        for warning in warnings:
            if 'missing symbols' in warning.lower():
                suggestions.append("Include additional symbols to enable more signal calculations")
            elif 'date gap' in warning.lower():
                suggestions.append("Fill date gaps with interpolated or forward-filled data")
            elif 'extreme price movements' in warning.lower():
                suggestions.append("Review data for potential errors or stock splits/dividends")
        
        return suggestions