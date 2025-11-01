"""
Story 4.0d Task 3: Gayed 8-Month Signal Tests
Comprehensive unit tests for Gayed8MonthCalculator
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal

from signals.calculators.gayed_8_month import (
    Gayed8MonthCalculator,
    Gayed8MonthInput,
    Gayed8MonthOutput,
    Gayed8MonthParams,
)
from signals.types import (
    SignalType,
    SignalStatus,
    CalculationContext,
    InsufficientDataError,
    CalculationError,
)
from tests.unit.signals.test_utilities import (
    MockPrismaClient,
    MockRedisClient,
    MockDataValidator,
    MockMarketDataRepository,
    generate_uptrend_data,
    generate_downtrend_data,
    create_test_config,
)


class TestGayed8MonthCalculator:
    """Test suite for Gayed 8-Month signal calculator"""

    @pytest.fixture
    def mock_prisma(self):
        """Create mock Prisma client"""
        return MockPrismaClient()

    @pytest.fixture
    def mock_redis(self):
        """Create mock Redis client"""
        return MockRedisClient()

    @pytest.fixture
    def mock_validator(self):
        """Create mock validator"""
        return MockDataValidator(default_score=0.95)

    @pytest.fixture
    def mock_repo(self):
        """Create mock market data repository"""
        return MockMarketDataRepository()

    @pytest.fixture
    def test_config(self):
        """Create test configuration"""
        return create_test_config(
            name='gayed_8_month',
            signal_type=SignalType.TIMING,
            parameters={
                'shortPeriod': 8,
                'longPeriod': 9,
                'minimumDataPoints': 20,
            },
            cache_ttl=3600,
            required_data_sources=['spy_price']
        )

    @pytest.fixture
    def calculator(self, test_config, mock_prisma, mock_redis, mock_validator, mock_repo):
        """Create calculator instance"""
        return Gayed8MonthCalculator(
            config=test_config,
            prisma_client=mock_prisma,
            redis_client=mock_redis,
            validator=mock_validator,
            market_data_repo=mock_repo,
        )

    @pytest.mark.asyncio
    async def test_bullish_signal_uptrend(
        self,
        calculator,
        mock_repo
    ):
        """Test bullish signal in uptrend"""
        # Generate 300 days of uptrending data (covers 9+ months)
        start_date = datetime(2024, 1, 1)
        uptrend_data = generate_uptrend_data(
            symbol='SPY',
            start_date=start_date,
            days=300,
            start_price=400.0,
            daily_gain=0.002  # 0.2% daily gain
        )

        mock_repo.seed('SPY', uptrend_data)

        # Calculate signal at end of trend
        context = CalculationContext(
            date=start_date + timedelta(days=299),
            validate_before_calc=True,
            save_to_database=False,
        )

        result = await calculator.compute(context)

        # Assertions
        assert result.signal_name == 'gayed_8_month'
        assert result.signal_type == SignalType.TIMING
        assert result.metadata.data_quality >= 0.95

        # Should be bullish in uptrend
        output: Gayed8MonthOutput = result.value
        assert output.signal == 'Risk-On'
        assert output.strength in ['Strong', 'Moderate']
        assert output.confidence > 0.6
        assert output.above_short_ma is True
        assert output.above_long_ma is True
        assert float(output.spread) > 0

    @pytest.mark.asyncio
    async def test_bearish_signal_downtrend(
        self,
        calculator,
        mock_repo
    ):
        """Test bearish signal in downtrend"""
        # Generate 300 days of downtrending data
        start_date = datetime(2024, 1, 1)
        downtrend_data = generate_downtrend_data(
            symbol='SPY',
            start_date=start_date,
            days=300,
            start_price=500.0,
            daily_loss=0.002  # 0.2% daily loss
        )

        mock_repo.seed('SPY', downtrend_data)

        context = CalculationContext(
            date=start_date + timedelta(days=299),
            validate_before_calc=True,
            save_to_database=False,
        )

        result = await calculator.compute(context)

        # Should be bearish in downtrend
        output: Gayed8MonthOutput = result.value
        assert output.signal == 'Risk-Off'
        assert output.above_short_ma is False
        assert output.above_long_ma is False
        assert float(output.spread) < 0

    @pytest.mark.asyncio
    async def test_insufficient_data_error(
        self,
        calculator,
        mock_repo
    ):
        """Test error handling with insufficient data"""
        # Generate only 10 days of data (less than minimum)
        start_date = datetime(2024, 1, 1)
        limited_data = generate_uptrend_data(
            symbol='SPY',
            start_date=start_date,
            days=10,
            start_price=400.0
        )

        mock_repo.seed('SPY', limited_data)

        context = CalculationContext(
            date=start_date + timedelta(days=9),
            validate_before_calc=False,
            save_to_database=False,
        )

        # Should raise CalculationError (wrapping InsufficientDataError)
        with pytest.raises(CalculationError):
            await calculator.compute(context)

    @pytest.mark.asyncio
    async def test_signal_metadata(self, calculator):
        """Test signal metadata structure"""
        metadata = calculator.get_signal_metadata()

        assert 'description' in metadata
        assert 'interpretation' in metadata
        assert 'thresholds' in metadata
        assert 'signal_meanings' in metadata
        assert 'methodology' in metadata

        # Check thresholds
        thresholds = metadata['thresholds']
        assert 'strong_bullish' in thresholds
        assert 'strong_bearish' in thresholds
        assert thresholds['strong_bullish'] > 0
        assert thresholds['strong_bearish'] < 0

    @pytest.mark.asyncio
    async def test_signal_strength_calculation(self, calculator):
        """Test signal strength normalization"""
        # Create mock output with various spreads
        test_cases = [
            (Decimal('10.0'), 1.0),   # Max positive
            (Decimal('5.0'), 0.5),     # Half positive
            (Decimal('0.0'), 0.0),     # Neutral
            (Decimal('-5.0'), -0.5),   # Half negative
            (Decimal('-10.0'), -1.0),  # Max negative
        ]

        for spread, expected_strength in test_cases:
            output = Gayed8MonthOutput(
                current_price=Decimal('400.0'),
                short_ma=Decimal('400.0'),
                long_ma=Decimal('400.0'),
                spread=spread,
                signal='Neutral',
                confidence=0.5,
                strength='Moderate',
                trend_classification='neutral',
                ma_spread=Decimal('0.0'),
                crossover='no_crossover',
                above_short_ma=True,
                above_long_ma=True,
            )

            strength = calculator.calculate_strength(output)
            assert abs(strength - expected_strength) < 0.01

    @pytest.mark.asyncio
    async def test_status_determination(self, calculator):
        """Test signal status determination"""
        # Test bullish threshold
        bullish_output = Gayed8MonthOutput(
            current_price=Decimal('400.0'),
            short_ma=Decimal('400.0'),
            long_ma=Decimal('400.0'),
            spread=Decimal('3.0'),  # > 2%
            signal='Risk-On',
            confidence=0.8,
            strength='Strong',
            trend_classification='strong_uptrend',
            ma_spread=Decimal('3.0'),
            crossover='no_crossover',
            above_short_ma=True,
            above_long_ma=True,
        )

        assert calculator.determine_status(bullish_output) == SignalStatus.BULLISH

        # Test bearish threshold
        bearish_output = Gayed8MonthOutput(
            current_price=Decimal('400.0'),
            short_ma=Decimal('400.0'),
            long_ma=Decimal('400.0'),
            spread=Decimal('-3.0'),  # < -2%
            signal='Risk-Off',
            confidence=0.8,
            strength='Strong',
            trend_classification='strong_downtrend',
            ma_spread=Decimal('-3.0'),
            crossover='no_crossover',
            above_short_ma=False,
            above_long_ma=False,
        )

        assert calculator.determine_status(bearish_output) == SignalStatus.BEARISH

        # Test neutral range
        neutral_output = Gayed8MonthOutput(
            current_price=Decimal('400.0'),
            short_ma=Decimal('400.0'),
            long_ma=Decimal('400.0'),
            spread=Decimal('1.0'),  # Between -2% and 2%
            signal='Neutral',
            confidence=0.5,
            strength='Weak',
            trend_classification='neutral',
            ma_spread=Decimal('1.0'),
            crossover='no_crossover',
            above_short_ma=True,
            above_long_ma=False,
        )

        assert calculator.determine_status(neutral_output) == SignalStatus.NEUTRAL

    @pytest.mark.asyncio
    async def test_cache_integration(
        self,
        calculator,
        mock_repo,
        mock_redis
    ):
        """Test Redis cache integration"""
        # Generate test data
        start_date = datetime(2024, 1, 1)
        data = generate_uptrend_data('SPY', start_date, 300)
        mock_repo.seed('SPY', data)

        context = CalculationContext(
            date=start_date + timedelta(days=299),
            validate_before_calc=False,
            save_to_database=False,
        )

        # First call - should calculate
        result1 = await calculator.compute(context)
        assert result1.signal_name == 'gayed_8_month'

        # Second call - should use cache
        result2 = await calculator.compute(context)
        assert result2.signal_name == 'gayed_8_month'

        # Results should be identical
        assert result1.value.signal == result2.value.signal
        assert result1.value.confidence == result2.value.confidence

    @pytest.mark.asyncio
    async def test_force_recalculate(
        self,
        calculator,
        mock_repo,
        mock_redis
    ):
        """Test force recalculate bypasses cache"""
        start_date = datetime(2024, 1, 1)
        data = generate_uptrend_data('SPY', start_date, 300)
        mock_repo.seed('SPY', data)

        # Calculate once to populate cache
        context1 = CalculationContext(
            date=start_date + timedelta(days=299),
            force_recalculate=False,
            save_to_database=False,
        )
        await calculator.compute(context1)

        # Force recalculate
        context2 = CalculationContext(
            date=start_date + timedelta(days=299),
            force_recalculate=True,
            save_to_database=False,
        )
        result = await calculator.compute(context2)

        assert result.signal_name == 'gayed_8_month'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
