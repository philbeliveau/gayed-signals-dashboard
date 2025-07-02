#!/usr/bin/env python3
"""
FRED API Integration Validation Script

This script validates the refactored FRED service that now uses the fredapi package
against the real FRED data stored in the verification-data/FRED directory.

It will:
1. Test the fredapi-based FRED service
2. Compare results with CSV verification data
3. Report any discrepancies
4. Generate a comprehensive validation report
"""

import asyncio
import os
import sys
import csv
import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any
from pathlib import Path
import json

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from services.fred_service import fred_service, FREDDataPoint
    from core.config import settings
except ImportError as e:
    print(f"Error importing FRED service: {e}")
    print("Make sure you're running this from the project root directory")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FREDApiValidationError(Exception):
    """Custom exception for validation errors."""
    pass

class FREDApiValidator:
    """Validates the fredapi integration against verification data."""
    
    def __init__(self):
        self.verification_dir = Path("verification-data/FRED")
        self.results = {
            "validation_timestamp": datetime.utcnow().isoformat(),
            "fredapi_version": "refactored",
            "series_tested": [],
            "validation_results": {},
            "summary": {
                "total_series": 0,
                "passed": 0,
                "failed": 0,
                "errors": []
            }
        }
        self.tolerance = 0.001  # Tolerance for floating point comparisons
        
    async def validate_all_series(self) -> Dict[str, Any]:
        """Validate all series in the verification directory."""
        if not self.verification_dir.exists():
            raise FREDApiValidationError(f"Verification directory not found: {self.verification_dir}")
        
        csv_files = list(self.verification_dir.glob("*.csv"))
        if not csv_files:
            raise FREDApiValidationError(f"No CSV files found in {self.verification_dir}")
        
        logger.info(f"Found {len(csv_files)} verification files")
        
        self.results["summary"]["total_series"] = len(csv_files)
        
        for csv_file in csv_files:
            series_id = csv_file.stem  # Get filename without extension
            logger.info(f"Validating series: {series_id}")
            
            try:
                result = await self.validate_series(series_id, csv_file)
                self.results["validation_results"][series_id] = result
                self.results["series_tested"].append(series_id)
                
                if result["validation_passed"]:
                    self.results["summary"]["passed"] += 1
                else:
                    self.results["summary"]["failed"] += 1
                    
            except Exception as e:
                logger.error(f"Error validating series {series_id}: {e}")
                self.results["validation_results"][series_id] = {
                    "validation_passed": False,
                    "error": str(e),
                    "data_comparison": None
                }
                self.results["summary"]["failed"] += 1
                self.results["summary"]["errors"].append(f"{series_id}: {str(e)}")
        
        return self.results
    
    async def validate_series(self, series_id: str, csv_file: Path) -> Dict[str, Any]:
        """Validate a single series against its CSV file."""
        result = {
            "series_id": series_id,
            "csv_file": str(csv_file),
            "validation_passed": False,
            "data_comparison": {
                "total_rows_csv": 0,
                "total_rows_api": 0,
                "matching_rows": 0,
                "mismatched_rows": 0,
                "missing_in_api": 0,
                "extra_in_api": 0,
                "sample_mismatches": []
            },
            "performance": {
                "api_fetch_time_ms": 0
            }
        }
        
        # Load verification data from CSV
        verification_data = self.load_csv_data(csv_file)
        result["data_comparison"]["total_rows_csv"] = len(verification_data)
        
        if not verification_data:
            result["error"] = "No data found in CSV file"
            return result
        
        # Get date range from CSV for API request
        dates = list(verification_data.keys())
        start_date = min(dates)
        end_date = max(dates)
        
        # Fetch data from refactored FRED API
        start_time = datetime.utcnow()
        try:
            async with fred_service:
                api_data = await fred_service.fetch_series_data(
                    series_id=series_id,
                    start_date=start_date,
                    end_date=end_date
                )
        except Exception as e:
            result["error"] = f"API fetch failed: {str(e)}"
            return result
        
        end_time = datetime.utcnow()
        result["performance"]["api_fetch_time_ms"] = int((end_time - start_time).total_seconds() * 1000)
        
        # Convert API data to dictionary for comparison
        api_data_dict = {point.date: point.value for point in api_data}
        result["data_comparison"]["total_rows_api"] = len(api_data_dict)
        
        # Compare data
        comparison_result = self.compare_data(verification_data, api_data_dict)
        result["data_comparison"].update(comparison_result)
        
        # Determine if validation passed
        # Allow for some missing data in API (older data might not be available)
        # But all API data should match CSV data
        total_matches = result["data_comparison"]["matching_rows"]
        total_api_rows = result["data_comparison"]["total_rows_api"] 
        
        if total_api_rows > 0:
            match_percentage = total_matches / total_api_rows
            result["data_comparison"]["match_percentage"] = match_percentage
            
            # Pass if at least 95% of API data matches CSV data and no mismatches
            result["validation_passed"] = (
                match_percentage >= 0.95 and 
                result["data_comparison"]["mismatched_rows"] == 0
            )
        else:
            result["validation_passed"] = False
            result["error"] = "No data returned from API"
        
        return result
    
    def load_csv_data(self, csv_file: Path) -> Dict[str, float]:
        """Load verification data from CSV file."""
        data = {}
        
        try:
            with open(csv_file, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    date = row['observation_date']
                    # The second column name is the series ID
                    series_columns = [col for col in row.keys() if col != 'observation_date']
                    if series_columns:
                        value_str = row[series_columns[0]]
                        # Handle missing values
                        if value_str and value_str != '.' and value_str.strip():
                            try:
                                data[date] = float(value_str)
                            except ValueError:
                                continue  # Skip invalid values
        except Exception as e:
            logger.error(f"Error loading CSV file {csv_file}: {e}")
            raise
        
        return data
    
    def compare_data(self, csv_data: Dict[str, float], api_data: Dict[str, float]) -> Dict[str, Any]:
        """Compare CSV data with API data."""
        result = {
            "matching_rows": 0,
            "mismatched_rows": 0,
            "missing_in_api": 0,
            "extra_in_api": 0,
            "sample_mismatches": []
        }
        
        # Check each date in CSV data
        for date, csv_value in csv_data.items():
            if date in api_data:
                api_value = api_data[date]
                if abs(csv_value - api_value) <= self.tolerance:
                    result["matching_rows"] += 1
                else:
                    result["mismatched_rows"] += 1
                    if len(result["sample_mismatches"]) < 5:  # Keep only first 5 mismatches
                        result["sample_mismatches"].append({
                            "date": date,
                            "csv_value": csv_value,
                            "api_value": api_value,
                            "difference": abs(csv_value - api_value)
                        })
            else:
                result["missing_in_api"] += 1
        
        # Check for extra data in API
        for date in api_data:
            if date not in csv_data:
                result["extra_in_api"] += 1
        
        return result
    
    def generate_report(self, output_file: str = "fredapi_validation_report.json"):
        """Generate a validation report."""
        # Add summary statistics
        summary = self.results["summary"]
        if summary["total_series"] > 0:
            summary["pass_rate"] = summary["passed"] / summary["total_series"]
        else:
            summary["pass_rate"] = 0.0
        
        # Save to file
        with open(output_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        logger.info(f"Validation report saved to: {output_file}")
        
        # Print summary to console
        print("\n" + "="*60)
        print("FRED API VALIDATION RESULTS")
        print("="*60)
        print(f"Total series tested: {summary['total_series']}")
        print(f"Passed: {summary['passed']}")
        print(f"Failed: {summary['failed']}")
        print(f"Pass rate: {summary['pass_rate']:.1%}")
        
        if summary["errors"]:
            print(f"\nErrors encountered:")
            for error in summary["errors"]:
                print(f"  - {error}")
        
        # Show detailed results for failed validations
        for series_id, result in self.results["validation_results"].items():
            if not result["validation_passed"]:
                print(f"\nFAILED: {series_id}")
                if "error" in result:
                    print(f"  Error: {result['error']}")
                else:
                    comp = result.get("data_comparison", {})
                    print(f"  CSV rows: {comp.get('total_rows_csv', 0)}")
                    print(f"  API rows: {comp.get('total_rows_api', 0)}")
                    print(f"  Matching: {comp.get('matching_rows', 0)}")
                    print(f"  Mismatched: {comp.get('mismatched_rows', 0)}")
                    print(f"  Match rate: {comp.get('match_percentage', 0):.1%}")
        
        print("\n" + "="*60)
        
        return output_file

async def main():
    """Main validation function."""
    print("FRED API Integration Validation")
    print("Testing fredapi-based implementation against verification data")
    print("-" * 60)
    
    # Check if FRED_API_KEY is configured
    api_key = os.environ.get('FRED_API_KEY')
    if not api_key:
        print("ERROR: FRED_API_KEY environment variable not set!")
        print("Please set your FRED API key in the environment or .env file")
        return 1
    
    validator = FREDApiValidator()
    
    try:
        # Run validation
        print("Starting validation...")
        results = await validator.validate_all_series()
        
        # Generate report
        report_file = validator.generate_report()
        
        # Return appropriate exit code
        if results["summary"]["failed"] == 0:
            print(f"\n✅ All validations passed! Report: {report_file}")
            return 0
        else:
            print(f"\n❌ Some validations failed. Report: {report_file}")
            return 1
            
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        print(f"\n❌ Validation failed: {e}")
        return 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\nValidation interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        sys.exit(1)