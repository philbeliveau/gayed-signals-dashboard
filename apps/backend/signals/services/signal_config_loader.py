"""
Story 4.0d: Signal Configuration Loader
Loads signal configuration from Railway PostgreSQL and environment variables
Provides runtime configuration management for signal calculators
"""

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from signals.types import SignalConfig, SignalType, ValidationRules

logger = logging.getLogger(__name__)


class SignalConfigLoader:
    """
    Signal configuration loader
    Loads configuration from Railway PostgreSQL (SignalConfiguration table)
    with fallback to environment variables
    """

    def __init__(self, prisma_client: Any):
        """
        Initialize configuration loader

        Args:
            prisma_client: Prisma client for PostgreSQL access
        """
        self.prisma = prisma_client
        self._config_cache: Dict[str, SignalConfig] = {}
        self._cache_timestamp: Optional[datetime] = None
        self._cache_ttl = 300  # 5 minutes

    async def get_config(
        self,
        signal_type: str,
        force_reload: bool = False
    ) -> Optional[SignalConfig]:
        """
        Get configuration for a signal type

        Args:
            signal_type: Signal type identifier (e.g., 'gayed_8_month')
            force_reload: Force reload from database

        Returns:
            SignalConfig or None if not found
        """
        # Check cache first
        if not force_reload and self._is_cache_valid():
            if signal_type in self._config_cache:
                logger.debug(f'Returning cached config for {signal_type}')
                return self._config_cache[signal_type]

        # Load from database
        try:
            db_config = await self.prisma.signalconfiguration.find_unique({
                'where': {'signalType': signal_type}
            })

            if not db_config:
                logger.warning(f'No configuration found for {signal_type}')
                return self._load_from_env(signal_type)

            # Convert database record to SignalConfig
            config = self._db_to_config(db_config)

            # Update cache
            self._config_cache[signal_type] = config
            self._cache_timestamp = datetime.now()

            return config

        except Exception as error:
            logger.error(f'Failed to load config from database: {error}')
            return self._load_from_env(signal_type)

    async def get_all_configs(
        self,
        enabled_only: bool = True
    ) -> List[SignalConfig]:
        """
        Get all signal configurations

        Args:
            enabled_only: Only return enabled signals

        Returns:
            List of SignalConfig objects
        """
        try:
            where_clause = {'enabled': True} if enabled_only else {}

            db_configs = await self.prisma.signalconfiguration.find_many({
                'where': where_clause,
                'orderBy': {'signalType': 'asc'}
            })

            configs = [self._db_to_config(db_config) for db_config in db_configs]

            # Update cache
            for config in configs:
                self._config_cache[config.name] = config
            self._cache_timestamp = datetime.now()

            return configs

        except Exception as error:
            logger.error(f'Failed to load configs from database: {error}')
            return []

    async def update_config(
        self,
        signal_type: str,
        parameters: Dict[str, Any],
        enabled: Optional[bool] = None
    ) -> bool:
        """
        Update signal configuration in Railway PostgreSQL

        Args:
            signal_type: Signal type identifier
            parameters: Updated parameters
            enabled: Optional enabled flag

        Returns:
            True if update successful
        """
        try:
            update_data = {
                'parameters': parameters,
                'updatedAt': datetime.now(),
            }

            if enabled is not None:
                update_data['enabled'] = enabled

            await self.prisma.signalconfiguration.update({
                'where': {'signalType': signal_type},
                'data': update_data
            })

            # Invalidate cache
            if signal_type in self._config_cache:
                del self._config_cache[signal_type]

            logger.info(f'Updated configuration for {signal_type}')
            return True

        except Exception as error:
            logger.error(f'Failed to update config: {error}')
            return False

    async def create_config(
        self,
        signal_type: str,
        signal_category: SignalType,
        parameters: Dict[str, Any],
        description: Optional[str] = None,
        version: str = '1.0.0',
        enabled: bool = True
    ) -> bool:
        """
        Create new signal configuration

        Args:
            signal_type: Signal type identifier
            signal_category: Signal category (timing, momentum, etc.)
            parameters: Signal parameters
            description: Optional description
            version: Algorithm version
            enabled: Enable signal

        Returns:
            True if creation successful
        """
        try:
            await self.prisma.signalconfiguration.create({
                'data': {
                    'signalType': signal_type,
                    'parameters': parameters,
                    'enabled': enabled,
                    'description': description,
                    'version': version,
                }
            })

            logger.info(f'Created configuration for {signal_type}')
            return True

        except Exception as error:
            logger.error(f'Failed to create config: {error}')
            return False

    def _db_to_config(self, db_record: Dict[str, Any]) -> SignalConfig:
        """
        Convert database record to SignalConfig

        Args:
            db_record: Database record from SignalConfiguration table

        Returns:
            SignalConfig object
        """
        # Infer signal type from name (default to timing)
        signal_category = self._infer_signal_type(db_record['signalType'])

        return SignalConfig(
            name=db_record['signalType'],
            type=signal_category,
            version=db_record.get('version', '1.0.0'),
            parameters=db_record['parameters'],
            description=db_record.get('description'),
            cache_ttl=self._get_cache_ttl(db_record['signalType']),
            timeout_ms=5000,  # Default timeout
            required_data_sources=self._get_required_sources(db_record['signalType']),
        )

    def _load_from_env(self, signal_type: str) -> Optional[SignalConfig]:
        """
        Load configuration from environment variables (fallback)

        Args:
            signal_type: Signal type identifier

        Returns:
            SignalConfig or None
        """
        try:
            # Convert signal_type to env var format (e.g., gayed_8_month -> GAYED_8M)
            env_prefix = signal_type.upper().replace('_MONTH', '_M').replace('_DAY', '_D')

            # Check if enabled
            enabled = os.getenv(f'{env_prefix}_ENABLED', 'false').lower() == 'true'
            if not enabled:
                return None

            # Load parameters from environment
            parameters = self._load_params_from_env(env_prefix, signal_type)

            return SignalConfig(
                name=signal_type,
                type=self._infer_signal_type(signal_type),
                version='1.0.0',
                parameters=parameters,
                description=f'{signal_type} signal from environment',
                cache_ttl=int(os.getenv('SIGNAL_CACHE_TTL', '3600')),
                timeout_ms=int(os.getenv('SIGNAL_TIMEOUT_MS', '5000')),
                required_data_sources=self._get_required_sources(signal_type),
            )

        except Exception as error:
            logger.error(f'Failed to load config from environment: {error}')
            return None

    def _load_params_from_env(
        self,
        env_prefix: str,
        signal_type: str
    ) -> Dict[str, Any]:
        """
        Load signal parameters from environment variables

        Args:
            env_prefix: Environment variable prefix
            signal_type: Signal type identifier

        Returns:
            Parameters dictionary
        """
        params = {}

        # Common parameters for different signal types
        if 'gayed_8' in signal_type.lower():
            params = {
                'shortPeriod': int(os.getenv(f'{env_prefix}_SHORT_PERIOD', '8')),
                'longPeriod': int(os.getenv(f'{env_prefix}_LONG_PERIOD', '9')),
                'minimumDataPoints': int(os.getenv(f'{env_prefix}_MIN_DATA_POINTS', '20')),
            }
        elif 'gayed_20' in signal_type.lower():
            params = {
                'period': int(os.getenv(f'{env_prefix}_PERIOD', '20')),
                'minimumDataPoints': int(os.getenv(f'{env_prefix}_MIN_DATA_POINTS', '40')),
            }
        elif 'bollinger' in signal_type.lower():
            params = {
                'period': int(os.getenv(f'{env_prefix}_PERIOD', '20')),
                'standardDeviations': float(os.getenv(f'{env_prefix}_STD_DEVIATIONS', '2')),
                'overboughtThreshold': float(os.getenv(f'{env_prefix}_OVERBOUGHT_THRESHOLD', '0.8')),
                'oversoldThreshold': float(os.getenv(f'{env_prefix}_OVERSOLD_THRESHOLD', '0.2')),
            }
        elif 'aggregate' in signal_type.lower():
            params = {
                'weights': {
                    'gayed_8_month': float(os.getenv(f'{env_prefix}_WEIGHT_GAYED_8M', '0.4')),
                    'gayed_20d': float(os.getenv(f'{env_prefix}_WEIGHT_GAYED_20D', '0.3')),
                    'bollinger_bands': float(os.getenv(f'{env_prefix}_WEIGHT_BOLLINGER', '0.3')),
                }
            }

        return params

    def _infer_signal_type(self, signal_name: str) -> SignalType:
        """
        Infer signal category from signal name

        Args:
            signal_name: Signal name/identifier

        Returns:
            SignalType enum value
        """
        name_lower = signal_name.lower()

        if 'gayed' in name_lower or 'ma' in name_lower:
            return SignalType.TIMING
        elif 'bollinger' in name_lower or 'vix' in name_lower:
            return SignalType.VOLATILITY
        elif 'aggregate' in name_lower or 'composite' in name_lower:
            return SignalType.COMPOSITE
        elif 'momentum' in name_lower:
            return SignalType.MOMENTUM
        else:
            return SignalType.TREND

    def _get_cache_ttl(self, signal_type: str) -> int:
        """
        Get cache TTL for signal type

        Args:
            signal_type: Signal type identifier

        Returns:
            TTL in seconds
        """
        # Slower signals can be cached longer
        if 'month' in signal_type.lower():
            return 86400  # 24 hours for monthly signals
        elif 'day' in signal_type.lower() or '20d' in signal_type.lower():
            return 3600   # 1 hour for daily signals
        else:
            return 1800   # 30 minutes for faster signals

    def _get_required_sources(self, signal_type: str) -> List[str]:
        """
        Get required data sources for signal type

        Args:
            signal_type: Signal type identifier

        Returns:
            List of required data sources
        """
        name_lower = signal_type.lower()

        if 'gayed' in name_lower:
            return ['spy_price']
        elif 'bollinger' in name_lower:
            return ['spy_price', 'vix']
        elif 'aggregate' in name_lower:
            return ['spy_price', 'vix']
        else:
            return ['spy_price']

    def _is_cache_valid(self) -> bool:
        """
        Check if configuration cache is still valid

        Returns:
            True if cache is valid
        """
        if not self._cache_timestamp:
            return False

        age = (datetime.now() - self._cache_timestamp).total_seconds()
        return age < self._cache_ttl

    def invalidate_cache(self) -> None:
        """Invalidate configuration cache"""
        self._config_cache.clear()
        self._cache_timestamp = None
        logger.info('Configuration cache invalidated')
