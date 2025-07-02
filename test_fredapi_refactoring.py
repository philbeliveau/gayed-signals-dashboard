#!/usr/bin/env python3
"""
Simple test to verify the FRED API refactoring is working correctly.

This script tests the basic functionality of the refactored FRED service
without requiring a real API key.
"""

import sys
import os
import asyncio
from unittest.mock import patch, MagicMock
import pandas as pd

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """Test that all imports are working."""
    print("Testing imports...")
    
    try:
        from fredapi import Fred
        print("✅ fredapi import successful")
    except ImportError as e:
        print(f"❌ fredapi import failed: {e}")
        return False
    
    try:
        import pandas as pd
        print("✅ pandas import successful")
    except ImportError as e:
        print(f"❌ pandas import failed: {e}")
        return False
    
    try:
        # Mock the API key during import to avoid initialization issues
        with patch.dict(os.environ, {'FRED_API_KEY': 'test_key'}):
            from services.fred_service import FREDService, FREDDataPoint
            print("✅ FRED service import successful")
    except ImportError as e:
        print(f"❌ FRED service import failed: {e}")
        return False
    
    return True

def test_fred_service_initialization():
    """Test that the FREDService can be initialized."""
    print("\nTesting FRED service initialization...")
    
    try:
        # Mock the environment variable to avoid requiring a real API key
        with patch.dict(os.environ, {'FRED_API_KEY': 'test_key'}):
            from services.fred_service import FREDService
            service = FREDService()
            print("✅ FREDService initialization successful")
            print(f"   - API key configured: {service.is_enabled}")
            print(f"   - Using ThreadPoolExecutor: {service.executor is not None}")
            return True
    except Exception as e:
        print(f"❌ FREDService initialization failed: {e}")
        return False

def test_pandas_conversion():
    """Test the pandas Series to FREDDataPoint conversion."""
    print("\nTesting pandas Series conversion...")
    
    try:
        with patch.dict(os.environ, {'FRED_API_KEY': 'test_key'}):
            from services.fred_service import FREDService
            
            # Create a mock pandas Series
            dates = pd.date_range('2023-01-01', periods=5, freq='D')
            values = [1.0, 2.0, 3.0, 4.0, 5.0]
            test_series = pd.Series(values, index=dates)
            
            service = FREDService()
            data_points = service._pandas_series_to_datapoints(test_series, 'TEST')
            
            print(f"✅ Converted {len(data_points)} data points")
            print(f"   - First point: {data_points[0].date} = {data_points[0].value}")
            print(f"   - Last point: {data_points[-1].date} = {data_points[-1].value}")
            
            # Verify conversion
            assert len(data_points) == 5
            assert data_points[0].value == 1.0
            assert data_points[-1].value == 5.0
            assert data_points[0].date == '2023-01-01'
            
            return True
    except Exception as e:
        print(f"❌ Pandas conversion test failed: {e}")
        return False

async def test_async_methods():
    """Test that async methods are properly structured."""
    print("\nTesting async method structure...")
    
    try:
        with patch.dict(os.environ, {'FRED_API_KEY': 'test_key'}):
            from services.fred_service import FREDService
            
            service = FREDService()
            
            # Test context manager
            async with service:
                print("✅ Async context manager works")
                print(f"   - FRED client initialized: {service.fred_client is not None}")
            
            print("✅ Async context manager cleanup successful")
            return True
    except Exception as e:
        print(f"❌ Async method test failed: {e}")
        return False

def test_cache_key_generation():
    """Test cache key generation."""
    print("\nTesting cache key generation...")
    
    try:
        with patch.dict(os.environ, {'FRED_API_KEY': 'test_key'}):
            from services.fred_service import FREDService
            
            service = FREDService()
            
            # Test cache key generation
            params = {'series_id': 'UNRATE', 'start_date': '2023-01-01'}
            cache_key = service._get_cache_key('series_data', params)
            
            print(f"✅ Cache key generated: {cache_key}")
            
            # Test that same params generate same key
            cache_key2 = service._get_cache_key('series_data', params)
            assert cache_key == cache_key2
            
            # Test that different params generate different keys
            params2 = {'series_id': 'ICSA', 'start_date': '2023-01-01'}
            cache_key3 = service._get_cache_key('series_data', params2)
            assert cache_key != cache_key3
            
            print("✅ Cache key consistency verified")
            return True
    except Exception as e:
        print(f"❌ Cache key test failed: {e}")
        return False

async def test_error_handling():
    """Test error handling without API key."""
    print("\nTesting error handling...")
    
    try:
        # Test without API key
        with patch.dict(os.environ, {}, clear=True):
            from services.fred_service import FREDService
            
            try:
                service = FREDService()
                print("❌ Should have failed without API key")
                return False
            except ValueError as e:
                print(f"✅ Properly handles missing API key: {e}")
        
        # Test disabled service
        with patch.dict(os.environ, {'FRED_API_KEY': 'test_key'}):
            service = FREDService()
            
            # Mock is_enabled property to return False
            with patch.object(type(service), 'is_enabled', new_callable=lambda: property(lambda self: False)):
                data = await service.fetch_series_data('UNRATE')
                assert data == []
                print("✅ Properly handles disabled service")
        
        return True
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        return False

def test_series_constants():
    """Test that series constants are properly defined."""
    print("\nTesting series constants...")
    
    try:
        from services.fred_service import FREDService
        
        # Test housing series
        housing_series = FREDService.HOUSING_SERIES
        print(f"✅ Housing series defined: {len(housing_series)} series")
        for name, series_id in list(housing_series.items())[:3]:
            print(f"   - {name}: {series_id}")
        
        # Test employment series
        employment_series = FREDService.EMPLOYMENT_SERIES
        print(f"✅ Employment series defined: {len(employment_series)} series")
        for name, series_id in list(employment_series.items())[:3]:
            print(f"   - {name}: {series_id}")
        
        # Verify verification data series are included
        verification_series = ['UNRATE', 'ICSA', 'CCSA', 'CSUSHPINSA']
        all_series_ids = list(housing_series.values()) + list(employment_series.values())
        
        for series_id in verification_series:
            if series_id in all_series_ids:
                print(f"✅ Verification series {series_id} found in constants")
            else:
                print(f"⚠️  Verification series {series_id} not in predefined constants")
        
        return True
    except Exception as e:
        print(f"❌ Series constants test failed: {e}")
        return False

async def main():
    """Run all tests."""
    print("FRED API Refactoring Test Suite")
    print("=" * 50)
    
    tests = [
        ("Import Test", test_imports),
        ("Service Initialization", test_fred_service_initialization),
        ("Pandas Conversion", test_pandas_conversion),
        ("Async Methods", test_async_methods),
        ("Cache Key Generation", test_cache_key_generation),
        ("Error Handling", test_error_handling),
        ("Series Constants", test_series_constants),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            
            if result:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            failed += 1
    
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Total:  {passed + failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed! FRED API refactoring is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\nTests interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        sys.exit(1)