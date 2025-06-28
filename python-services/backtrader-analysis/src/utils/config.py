"""
Configuration Management

Handles configuration settings for different environments
(development, testing, production) and provides access to
environment variables and settings.
"""

import os
from typing import Dict, Any


class Config:
    """Base configuration class"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Analysis settings
    MAX_ANALYSIS_TIME = int(os.environ.get('MAX_ANALYSIS_TIME', 300))  # 5 minutes
    INITIAL_CAPITAL = float(os.environ.get('INITIAL_CAPITAL', 100000))
    COMMISSION_RATE = float(os.environ.get('COMMISSION_RATE', 0.001))
    
    # Chart settings
    CHART_OUTPUT_DIR = os.environ.get('CHART_OUTPUT_DIR') or os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'static', 'charts'
    )
    CHART_DPI = int(os.environ.get('CHART_DPI', 150))
    CHART_FORMAT = os.environ.get('CHART_FORMAT', 'png')
    
    # Logging settings
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE') or os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs', 'app.log'
    )
    
    # Data processing settings
    MAX_DATA_POINTS = int(os.environ.get('MAX_DATA_POINTS', 10000))
    MIN_DATA_POINTS = int(os.environ.get('MIN_DATA_POINTS', 50))
    DATA_CACHE_SIZE = int(os.environ.get('DATA_CACHE_SIZE', 100))
    
    # Performance settings
    ENABLE_PERFORMANCE_TRACKING = os.environ.get('ENABLE_PERFORMANCE_TRACKING', 'true').lower() == 'true'
    ENABLE_CORRELATION_ANALYSIS = os.environ.get('ENABLE_CORRELATION_ANALYSIS', 'true').lower() == 'true'
    ENABLE_CHART_GENERATION = os.environ.get('ENABLE_CHART_GENERATION', 'true').lower() == 'true'
    
    @staticmethod
    def ensure_directories():
        """Ensure required directories exist"""
        dirs_to_create = [
            Config.CHART_OUTPUT_DIR,
            os.path.dirname(Config.LOG_FILE)
        ]
        
        for directory in dirs_to_create:
            if directory and not os.path.exists(directory):
                try:
                    os.makedirs(directory, exist_ok=True)
                except OSError as e:
                    print(f"Warning: Could not create directory {directory}: {e}")


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    
    # More verbose logging in development
    LOG_LEVEL = 'DEBUG'
    
    # Enable all features in development
    ENABLE_PERFORMANCE_TRACKING = True
    ENABLE_CORRELATION_ANALYSIS = True 
    ENABLE_CHART_GENERATION = True
    
    # Smaller limits for development
    MAX_DATA_POINTS = 5000
    DATA_CACHE_SIZE = 50


class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = False
    TESTING = True
    
    # Use temporary directories for testing
    CHART_OUTPUT_DIR = '/tmp/test_charts'
    LOG_FILE = '/tmp/test_app.log'
    
    # Minimal settings for testing
    MAX_ANALYSIS_TIME = 60  # 1 minute for tests
    MAX_DATA_POINTS = 1000
    MIN_DATA_POINTS = 10
    DATA_CACHE_SIZE = 10
    
    # Disable some features to speed up tests
    ENABLE_CHART_GENERATION = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Production logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    # Production performance settings
    MAX_ANALYSIS_TIME = 600  # 10 minutes
    MAX_DATA_POINTS = 20000
    DATA_CACHE_SIZE = 200
    
    # Chart quality
    CHART_DPI = 200
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable must be set in production")


class Config:
    """Configuration factory"""
    
    config_map = {
        'development': DevelopmentConfig,
        'testing': TestingConfig,
        'production': ProductionConfig,
        'default': DevelopmentConfig
    }
    
    @classmethod
    def get_config(cls, config_name: str = None) -> Config:
        """
        Get configuration object for specified environment
        
        Args:
            config_name: Configuration environment name
            
        Returns:
            Configuration object
        """
        if config_name is None:
            config_name = os.environ.get('FLASK_ENV', 'development')
        
        config_class = cls.config_map.get(config_name, cls.config_map['default'])
        config_instance = config_class()
        
        # Ensure required directories exist
        config_instance.ensure_directories()
        
        return config_instance
    
    @classmethod
    def get_all_settings(cls, config_name: str = None) -> Dict[str, Any]:
        """
        Get all configuration settings as a dictionary
        
        Args:
            config_name: Configuration environment name
            
        Returns:
            Dictionary of all settings
        """
        config = cls.get_config(config_name)
        
        settings = {}
        for attr_name in dir(config):
            if not attr_name.startswith('_') and not callable(getattr(config, attr_name)):
                settings[attr_name] = getattr(config, attr_name)
        
        return settings


def load_environment_file(env_file: str = '.env'):
    """
    Load environment variables from file
    
    Args:
        env_file: Path to environment file
    """
    if os.path.exists(env_file):
        try:
            from dotenv import load_dotenv
            load_dotenv(env_file)
        except ImportError:
            # dotenv not available, skip loading
            pass


# Load environment variables on import
load_environment_file()