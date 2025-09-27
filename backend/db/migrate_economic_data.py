"""
Migration script to add economic data tables to existing database.

This script adds the economic_series and economic_data_points tables
along with their indexes and initial data to an existing database.
"""

import asyncio
import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import logging
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from core.database import Base, engine
from models.database import EconomicSeries, EconomicDataPoint

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def check_table_exists(conn, table_name: str) -> bool:
    """Check if table exists in the database."""
    try:
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = :table_name
            );
        """), {"table_name": table_name})
        return result.scalar()
    except Exception as e:
        logger.error(f"Error checking table existence: {e}")
        return False


async def create_economic_tables():
    """Create economic data tables if they don't exist."""
    try:
        async with engine.begin() as conn:
            # Check if tables already exist
            series_exists = await check_table_exists(conn, "economic_series")
            data_points_exists = await check_table_exists(conn, "economic_data_points")
            
            if series_exists and data_points_exists:
                logger.info("Economic data tables already exist. Skipping table creation.")
                return True
            
            logger.info("Creating economic data tables...")
            
            # Create economic_series table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS economic_series (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    series_id VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    category VARCHAR(100) NOT NULL,
                    frequency VARCHAR(20) NOT NULL,
                    units VARCHAR(100),
                    seasonal_adjustment BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))
            
            # Create economic_data_points table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS economic_data_points (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    series_id UUID REFERENCES economic_series(id) ON DELETE CASCADE,
                    observation_date TIMESTAMP WITH TIME ZONE NOT NULL,
                    value VARCHAR(50),
                    numeric_value DECIMAL(15,4),
                    is_preliminary BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    
                    CONSTRAINT unique_series_observation UNIQUE(series_id, observation_date)
                );
            """))
            
            logger.info("Economic data tables created successfully")
            return True
            
    except Exception as e:
        logger.error(f"Error creating economic tables: {e}")
        raise


async def create_economic_indexes():
    """Create performance indexes for economic data tables."""
    try:
        async with engine.begin() as conn:
            logger.info("Creating economic data indexes...")
            
            indexes = [
                # Basic indexes
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_series_series_id ON economic_series(series_id);",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_series_category ON economic_series(category);",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_series_frequency ON economic_series(frequency);",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_series_category_frequency ON economic_series(category, frequency);",
                
                # Data points indexes
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_data_series_date ON economic_data_points(series_id, observation_date DESC);",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_data_observation_date ON economic_data_points(observation_date DESC);",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_data_numeric_value ON economic_data_points(numeric_value) WHERE numeric_value IS NOT NULL;",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_data_series_recent ON economic_data_points(series_id, observation_date DESC) WHERE observation_date >= CURRENT_DATE - INTERVAL '5 years';",
                
                # Composite indexes for common queries
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_data_series_value_date ON economic_data_points(series_id, numeric_value, observation_date DESC) WHERE numeric_value IS NOT NULL;",
                "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_economic_series_latest_data ON economic_data_points(series_id, observation_date DESC, created_at DESC);"
            ]
            
            for index_sql in indexes:
                try:
                    await conn.execute(text(index_sql))
                    logger.info(f"Created index: {index_sql.split(' ')[-1].split('(')[0] if '(' in index_sql else 'unknown'}")
                except Exception as e:
                    if "already exists" not in str(e):
                        logger.warning(f"Failed to create index: {e}")
                    else:
                        logger.info(f"Index already exists: {index_sql.split(' ')[-1].split('(')[0] if '(' in index_sql else 'unknown'}")
            
            logger.info("Economic data indexes created successfully")
            
    except Exception as e:
        logger.error(f"Error creating economic indexes: {e}")
        raise


async def insert_initial_economic_series():
    """Insert initial economic series definitions."""
    try:
        async with engine.begin() as conn:
            logger.info("Inserting initial economic series...")
            
            # Check if series already exist
            result = await conn.execute(text("SELECT COUNT(*) FROM economic_series;"))
            count = result.scalar()
            
            if count > 0:
                logger.info(f"Found {count} existing economic series records. Updating if necessary...")

            # Define initial economic series
            initial_series = [
                {
                    'series_id': 'ICSA',
                    'name': 'Initial Claims',
                    'description': 'Initial Claims for Unemployment Insurance',
                    'category': 'labor_market',
                    'frequency': 'weekly',
                    'units': 'Number',
                    'seasonal_adjustment': True
                },
                {
                    'series_id': 'CCSA',
                    'name': 'Continued Claims',
                    'description': 'Continued Claims for Unemployment Insurance (Insured Unemployment)',
                    'category': 'labor_market',
                    'frequency': 'weekly',
                    'units': 'Number',
                    'seasonal_adjustment': True
                },
                {
                    'series_id': 'UNRATE',
                    'name': 'Unemployment Rate',
                    'description': 'Civilian Unemployment Rate',
                    'category': 'labor_market',
                    'frequency': 'monthly',
                    'units': 'Percent',
                    'seasonal_adjustment': True
                },
                {
                    'series_id': 'CSUSHPINSA',
                    'name': 'Case-Shiller National Home Price Index',
                    'description': 'S&P CoreLogic Case-Shiller U.S. National Home Price Index',
                    'category': 'housing',
                    'frequency': 'monthly',
                    'units': 'Index Jan 2000=100',
                    'seasonal_adjustment': False
                }
            ]
            
            for series in initial_series:
                await conn.execute(text("""
                    INSERT INTO economic_series (
                        id, series_id, name, description, category, frequency, 
                        units, seasonal_adjustment, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), :series_id, :name, :description, :category, 
                        :frequency, :units, :seasonal_adjustment, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    ) ON CONFLICT (series_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        category = EXCLUDED.category,
                        frequency = EXCLUDED.frequency,
                        units = EXCLUDED.units,
                        seasonal_adjustment = EXCLUDED.seasonal_adjustment,
                        updated_at = CURRENT_TIMESTAMP
                """), series)
                
                logger.info(f"Processed series: {series['series_id']}")
            
            logger.info("Initial economic series data processed successfully")
            
    except Exception as e:
        logger.error(f"Error inserting initial economic series: {e}")
        raise


async def create_triggers():
    """Create triggers for economic data tables."""
    try:
        async with engine.begin() as conn:
            logger.info("Creating triggers for economic data tables...")
            
            # Create trigger for updated_at on economic_series
            await conn.execute(text("""
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            """))
            
            await conn.execute(text("""
                DROP TRIGGER IF EXISTS update_economic_series_updated_at ON economic_series;
                CREATE TRIGGER update_economic_series_updated_at
                    BEFORE UPDATE ON economic_series
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            """))
            
            logger.info("Triggers created successfully")
            
    except Exception as e:
        logger.error(f"Error creating triggers: {e}")
        raise


async def validate_migration():
    """Validate that the migration was successful."""
    try:
        async with engine.begin() as conn:
            logger.info("Validating migration...")
            
            # Check table existence
            series_exists = await check_table_exists(conn, "economic_series")
            data_points_exists = await check_table_exists(conn, "economic_data_points")
            
            if not series_exists or not data_points_exists:
                raise Exception("Economic data tables were not created successfully")
            
            # Check series count
            result = await conn.execute(text("SELECT COUNT(*) FROM economic_series;"))
            series_count = result.scalar()
            
            if series_count < 4:
                raise Exception(f"Expected at least 4 economic series, found {series_count}")
            
            # Check specific series exist
            expected_series = ['ICSA', 'CCSA', 'UNRATE', 'CSUSHPINSA']
            for series_id in expected_series:
                result = await conn.execute(text(
                    "SELECT COUNT(*) FROM economic_series WHERE series_id = :series_id"
                ), {"series_id": series_id})
                
                if result.scalar() == 0:
                    raise Exception(f"Required series {series_id} not found")
            
            # Check indexes exist
            result = await conn.execute(text("""
                SELECT COUNT(*) FROM pg_indexes 
                WHERE tablename IN ('economic_series', 'economic_data_points')
            """))
            index_count = result.scalar()
            
            if index_count < 5:  # Should have at least 5 indexes
                logger.warning(f"Expected more indexes, found {index_count}")
            
            logger.info("Migration validation successful")
            logger.info(f"Created {series_count} economic series with {index_count} indexes")
            
    except Exception as e:
        logger.error(f"Migration validation failed: {e}")
        raise


async def run_migration():
    """Run the complete economic data migration."""
    try:
        logger.info("Starting economic data migration...")
        
        # Step 1: Create tables
        await create_economic_tables()
        
        # Step 2: Create indexes
        await create_economic_indexes()
        
        # Step 3: Create triggers
        await create_triggers()
        
        # Step 4: Insert initial data
        await insert_initial_economic_series()
        
        # Step 5: Validate migration
        await validate_migration()
        
        logger.info("Economic data migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())