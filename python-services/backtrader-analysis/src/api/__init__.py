"""
Flask API for Gayed Signals Backtrader Analysis

This module provides REST API endpoints for the Node.js dashboard
to interact with the Python Backtrader analysis service.
"""

from .app import create_app, app

__all__ = ['create_app', 'app']