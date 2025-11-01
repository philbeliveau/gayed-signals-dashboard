"""
Story 4.0d Task 4: Gayed 20-Day Signal Tests
Unit tests for Gayed20DCalculator
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal

from signals.calculators.gayed_20d import Gayed20DCalculator
from signals.types import SignalType, SignalStatus, CalculationContext
from tests.unit.signals.test_utilities import (
    MockPrismaClient,
    MockRedisClient,
    MockDataValidator,
    MockMarketDataRepository,
    generate_uptrend_data,
    generate_downtrend_data,
    create_test_config,
)


class TestGayed20DCalculator:
    """Test suite for Gayed 20-Day signal calculator"""

    @pytest.fixture
    def test_config(self):
        """Create test configuration"""
        return create_test_config(
            name='gayed_20d',
            signal_type=SignalType.TIMING,
            parameters={
                'lookbackPeriod': 21,
                'minimumDataPoints': 40,
            },
            required_data_sources=['xlu_price', 'spy_price']
        )

    @pytest.fixture
    def calculator(self, test_config):
        """Create calculator instance"""
        return Gayed20DCalculator(
            config=test_config,
            prisma_client=MockPrismaClient(),
            redis_client=MockRedisClient(),
            validator=MockDataValidator(),
            market_data_repo=MockMarketDataRepository(),
        )

    @pytest.mark.asyncio
    async def test_defensive_signal_utilities_outperform(self, calculator):
        """Test Risk-Off signal when XLU outperforms SPY"""
        start_date = datetime(2024, 1, 1)
        repo = calculator.market_data_repo

        # XLU trending up strongly
        xlu_data = generate_uptrend_data('XLU', start_date, 50, 100.0, 0.003)
        # SPY flat/down
        spy_data = generate_uptrend_data('SPY', start_date, 50, 400.0, 0.001)

        repo.seed('XLU', xlu_data)
        repo.seed('SPY', spy_data)

        context = CalculationContext(
            date=start_date + timedelta(days=49),
            save_to_database=False,
        )

        result = await calculator.compute(context)
        output = result.value

        # XLU outperforming should be Risk-Off (defensive)
        assert output.signal == 'Risk-Off'
        assert float(output.ratio) > 1.0
        assert output.xlu_return > output.spy_return

    @pytest.mark.asyncio
    async def test_offensive_signal_spy_outperforms(self, calculator):
        """Test Risk-On signal when SPY outperforms XLU"""
        start_date = datetime(2024, 1, 1)
        repo = calculator.market_data_repo

        # SPY trending up strongly
        spy_data = generate_uptrend_data('SPY', start_date, 50, 400.0, 0.003)
        # XLU flat
        xlu_data = generate_uptrend_data('XLU', start_date, 50, 100.0, 0.001)

        repo.seed('XLU', xlu_data)
        repo.seed('SPY', spy_data)

        context = CalculationContext(
            date=start_date + timedelta(days=49),
            save_to_database=False,
        )

        result = await calculator.compute(context)
        output = result.value

        # SPY outperforming should be Risk-On (offensive)
        assert output.signal == 'Risk-On'
        assert float(output.ratio) < 1.0
        assert output.spy_return > output.xlu_return


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
