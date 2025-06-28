"""
Structured Logging Setup

Provides structured logging configuration using structlog
for better observability and debugging.
"""

import os
import sys
import logging
import structlog
from datetime import datetime
from typing import Optional


def setup_logger(name: str = None, log_level: str = None, log_file: str = None) -> structlog.stdlib.BoundLogger:
    """
    Setup structured logger
    
    Args:
        name: Logger name (defaults to __name__)
        log_level: Log level (defaults to INFO)
        log_file: Log file path (optional)
        
    Returns:
        Configured structured logger
    """
    if log_level is None:
        log_level = os.environ.get('LOG_LEVEL', 'INFO')
    
    if log_file is None:
        log_file = os.environ.get('LOG_FILE')
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="ISO"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper())
    )
    
    # Add file handler if log file specified
    if log_file:
        try:
            # Ensure log directory exists
            log_dir = os.path.dirname(log_file)
            if log_dir and not os.path.exists(log_dir):
                os.makedirs(log_dir, exist_ok=True)
            
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(getattr(logging, log_level.upper()))
            
            # Use simpler format for file output
            file_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            
            # Add to root logger
            root_logger = logging.getLogger()
            root_logger.addHandler(file_handler)
            
        except Exception as e:
            print(f"Warning: Could not setup file logging: {e}")
    
    # Get logger instance
    logger = structlog.get_logger(name or __name__)
    
    # Log startup message
    logger.info(
        "Logger initialized",
        logger_name=name or __name__,
        log_level=log_level,
        log_file=log_file,
        timestamp=datetime.utcnow().isoformat()
    )
    
    return logger


def get_request_logger(request_id: str = None) -> structlog.stdlib.BoundLogger:
    """
    Get logger with request context
    
    Args:
        request_id: Request identifier for tracking
        
    Returns:
        Logger with request context
    """
    logger = structlog.get_logger("request")
    
    if request_id:
        logger = logger.bind(request_id=request_id)
    
    return logger


def get_analysis_logger(analysis_id: str) -> structlog.stdlib.BoundLogger:
    """
    Get logger with analysis context
    
    Args:
        analysis_id: Analysis identifier
        
    Returns:
        Logger with analysis context
    """
    logger = structlog.get_logger("analysis")
    return logger.bind(analysis_id=analysis_id)


class LoggerMixin:
    """
    Mixin class to add logging capabilities to other classes
    """
    
    @property
    def logger(self) -> structlog.stdlib.BoundLogger:
        """Get logger for this class"""
        if not hasattr(self, '_logger'):
            self._logger = structlog.get_logger(self.__class__.__name__)
        return self._logger
    
    def log_method_call(self, method_name: str, **kwargs):
        """Log method call with parameters"""
        self.logger.debug(
            f"{method_name} called",
            method=method_name,
            class_name=self.__class__.__name__,
            **kwargs
        )
    
    def log_method_result(self, method_name: str, success: bool = True, **kwargs):
        """Log method result"""
        log_level = "info" if success else "error"
        getattr(self.logger, log_level)(
            f"{method_name} completed",
            method=method_name,
            class_name=self.__class__.__name__,
            success=success,
            **kwargs
        )


def log_performance(func):
    """
    Decorator to log function performance
    
    Args:
        func: Function to wrap
        
    Returns:
        Wrapped function with performance logging
    """
    def wrapper(*args, **kwargs):
        logger = structlog.get_logger(func.__module__)
        start_time = datetime.utcnow()
        
        try:
            logger.debug(
                f"Starting {func.__name__}",
                function=func.__name__,
                module=func.__module__,
                start_time=start_time.isoformat()
            )
            
            result = func(*args, **kwargs)
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            logger.info(
                f"Completed {func.__name__}",
                function=func.__name__,
                module=func.__module__,
                duration_seconds=duration,
                success=True
            )
            
            return result
            
        except Exception as e:
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            logger.error(
                f"Failed {func.__name__}",
                function=func.__name__,
                module=func.__module__,
                duration_seconds=duration,
                error=str(e),
                success=False
            )
            
            raise
    
    return wrapper


# Create default logger instance
default_logger = setup_logger("gayed_backtrader")