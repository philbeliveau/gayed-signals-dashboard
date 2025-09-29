"""
FastAPI backend connection test for Railway PostgreSQL.

This test validates that the backend can successfully connect to the Railway PostgreSQL
database using the configured environment variables.
"""

import asyncio
import os
import pytest
from typing import Optional

try:
    import asyncpg
except ImportError:
    asyncpg = None

from core.config import settings


@pytest.mark.asyncio
async def test_database_connection():
    """Test Railway PostgreSQL connection from FastAPI."""
    if asyncpg is None:
        pytest.skip("asyncpg not available - install with: pip install asyncpg")

    if not settings.DATABASE_URL:
        pytest.skip("DATABASE_URL not configured")

    try:
        # Connect to database
        conn = await asyncpg.connect(settings.DATABASE_URL)

        # Test basic query
        result = await conn.fetchval("SELECT version()")

        # Test database functionality
        await conn.execute("SELECT 1")

        # Close connection
        await conn.close()

        # Assertions
        assert result is not None
        assert "PostgreSQL" in result
        print(f"✅ Database connection successful: {result}")

        # Verify PostgreSQL version (should be 15+)
        if "PostgreSQL 17" in result or "PostgreSQL 16" in result or "PostgreSQL 15" in result:
            print(f"✅ PostgreSQL version requirement met: {result}")
        else:
            print(f"⚠️  PostgreSQL version: {result}")

    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        pytest.fail(f"Database connection test failed: {str(e)}")


@pytest.mark.asyncio
async def test_database_ssl_connection():
    """Test that SSL connection is working correctly."""
    if asyncpg is None:
        pytest.skip("asyncpg not available - install with: pip install asyncpg")


    if not settings.DATABASE_URL:
        pytest.skip("DATABASE_URL not configured")

    try:
        # Ensure SSL mode is required in connection string
        if "sslmode=require" not in settings.DATABASE_URL:
            pytest.fail("SSL mode not configured in DATABASE_URL")

        # Connect with SSL requirement
        conn = await asyncpg.connect(settings.DATABASE_URL)

        # Test SSL connection status
        ssl_status = await conn.fetchval("SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()")

        await conn.close()

        # Verify SSL is enabled
        assert ssl_status is True, "SSL connection is not enabled"
        print("✅ SSL connection verified")

    except Exception as e:
        print(f"❌ SSL connection test failed: {str(e)}")
        pytest.fail(f"SSL connection test failed: {str(e)}")


@pytest.mark.asyncio
async def test_database_connection_pool():
    """Test database connection pooling capabilities."""
    if asyncpg is None:
        pytest.skip("asyncpg not available - install with: pip install asyncpg")


    if not settings.DATABASE_URL:
        pytest.skip("DATABASE_URL not configured")

    try:
        # Create connection pool
        pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=1,
            max_size=5
        )

        # Test pool connection
        async with pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            assert result == 1

        # Close pool
        await pool.close()

        print("✅ Database connection pool test successful")

    except Exception as e:
        print(f"❌ Database connection pool test failed: {str(e)}")
        pytest.fail(f"Database connection pool test failed: {str(e)}")


def test_environment_variables():
    """Test that required environment variables are properly configured."""

    # Test DATABASE_URL
    assert settings.DATABASE_URL is not None, "DATABASE_URL not configured"
    assert settings.DATABASE_URL.startswith("postgresql://"), "DATABASE_URL should start with postgresql://"
    assert "railway" in settings.DATABASE_URL, "DATABASE_URL should contain 'railway' database name"
    assert "sslmode=require" in settings.DATABASE_URL, "DATABASE_URL should have SSL mode required"

    print("✅ Environment variables validation successful")
    print(f"DATABASE_URL configured: {settings.DATABASE_URL[:30]}...")


if __name__ == "__main__":
    # Run tests directly
    asyncio.run(test_database_connection())
    asyncio.run(test_database_ssl_connection())
    asyncio.run(test_database_connection_pool())
    test_environment_variables()