"""
Database initialization script for creating tables, indexes, and initial data.
"""

import asyncio
import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import logging

from core.config import settings
from core.database import Base, engine
from models.database import (
    User, Video, Transcript, Summary, 
    Folder, PromptTemplate, ProcessingJob,
    EconomicSeries, EconomicDataPoint,
    create_search_indexes
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_database_if_not_exists():
    """Create the database if it doesn't exist."""
    try:
        # Parse database URL to get connection details
        import urllib.parse
        parsed = urllib.parse.urlparse(settings.DATABASE_URL)
        
        database_name = parsed.path[1:]  # Remove leading '/'
        base_url = f"{parsed.scheme}://{parsed.netloc}/postgres"
        
        # Connect to postgres database to create target database
        conn = await asyncpg.connect(base_url.replace('+asyncpg', ''))
        
        # Check if database exists
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", database_name
        )
        
        if not exists:
            # Create database
            await conn.execute(f'CREATE DATABASE "{database_name}"')
            logger.info(f"Created database: {database_name}")
        else:
            logger.info(f"Database already exists: {database_name}")
        
        await conn.close()
        
    except Exception as e:
        logger.error(f"Error creating database: {e}")
        raise


async def create_extensions():
    """Create required PostgreSQL extensions."""
    try:
        async with engine.begin() as conn:
            # Enable UUID extension
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""))
            logger.info("Created uuid-ossp extension")
            
            # Enable full-text search extensions (commented out - requires superuser)
            # await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            # logger.info("Created pg_trgm extension")
            
            # Enable Row Level Security helper functions
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\""))
            logger.info("Created pgcrypto extension")
            
    except Exception as e:
        logger.error(f"Error creating extensions: {e}")
        raise


async def create_custom_functions():
    """Create custom database functions for the application."""
    try:
        async with engine.begin() as conn:
            # Function to update the updated_at timestamp
            await conn.execute(text("""
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            """))
            
            # Function to generate short IDs
            await conn.execute(text("""
                CREATE OR REPLACE FUNCTION generate_short_id(table_name TEXT)
                RETURNS TEXT AS $$
                DECLARE
                    new_id TEXT;
                    done BOOL;
                BEGIN
                    done := FALSE;
                    WHILE NOT done LOOP
                        new_id := substr(encode(gen_random_bytes(6), 'base64'), 1, 8);
                        new_id := replace(new_id, '/', '_');
                        new_id := replace(new_id, '+', '-');
                        
                        -- Check if ID exists (this is a simplified check)
                        -- In practice, you'd need dynamic SQL for different tables
                        IF table_name = 'videos' THEN
                            SELECT NOT EXISTS(SELECT 1 FROM videos WHERE youtube_id = new_id) INTO done;
                        ELSE
                            done := TRUE;
                        END IF;
                    END LOOP;
                    RETURN new_id;
                END;
                $$ LANGUAGE plpgsql;
            """))
            
            logger.info("Created custom database functions")
            
    except Exception as e:
        logger.error(f"Error creating custom functions: {e}")
        raise


async def create_triggers():
    """Create database triggers for automatic timestamp updates."""
    try:
        async with engine.begin() as conn:
            # List of tables that need updated_at triggers
            tables_with_updated_at = [
                'users', 'videos', 'transcripts', 'summaries', 
                'folders', 'prompt_templates', 'processing_jobs'
            ]
            
            for table in tables_with_updated_at:
                await conn.execute(text(f"""
                    DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table};
                    CREATE TRIGGER update_{table}_updated_at
                        BEFORE UPDATE ON {table}
                        FOR EACH ROW
                        EXECUTE FUNCTION update_updated_at_column();
                """))
            
            logger.info("Created database triggers")
            
    except Exception as e:
        logger.error(f"Error creating triggers: {e}")
        raise


async def create_performance_indexes():
    """Create performance indexes as specified in the PRD."""
    try:
        async with engine.begin() as conn:
            indexes = create_search_indexes()
            
            for index_sql in indexes:
                try:
                    await conn.execute(text(index_sql))
                except Exception as e:
                    if "already exists" not in str(e):
                        logger.warning(f"Error creating index: {e}")
            
            logger.info("Created performance indexes")
            
    except Exception as e:
        logger.error(f"Error creating performance indexes: {e}")
        raise


async def create_row_level_security():
    """Set up Row Level Security policies."""
    try:
        async with engine.begin() as conn:
            # Create database role for authenticated users
            await conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated_user') THEN
                        CREATE ROLE authenticated_user;
                    END IF;
                END
                $$;
            """))
            
            # Enable RLS on all user-scoped tables
            rls_tables = [
                'users', 'videos', 'transcripts', 'summaries', 
                'folders', 'prompt_templates', 'processing_jobs'
            ]
            
            for table in rls_tables:
                await conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;"))
            
            # Create policies for each table
            policies = [
                # Users can only see their own data
                """
                DROP POLICY IF EXISTS user_isolation_policy ON videos;
                CREATE POLICY user_isolation_policy ON videos
                    FOR ALL TO authenticated_user
                    USING (user_id = current_setting('app.current_user_id', true)::uuid);
                """,
                """
                DROP POLICY IF EXISTS folder_isolation_policy ON folders;
                CREATE POLICY folder_isolation_policy ON folders
                    FOR ALL TO authenticated_user
                    USING (user_id = current_setting('app.current_user_id', true)::uuid);
                """,
                """
                DROP POLICY IF EXISTS transcript_isolation_policy ON transcripts;
                CREATE POLICY transcript_isolation_policy ON transcripts
                    FOR ALL TO authenticated_user
                    USING (video_id IN (
                        SELECT id FROM videos 
                        WHERE user_id = current_setting('app.current_user_id', true)::uuid
                    ));
                """,
                """
                DROP POLICY IF EXISTS summary_isolation_policy ON summaries;
                CREATE POLICY summary_isolation_policy ON summaries
                    FOR ALL TO authenticated_user
                    USING (video_id IN (
                        SELECT id FROM videos 
                        WHERE user_id = current_setting('app.current_user_id', true)::uuid
                    ));
                """,
                """
                DROP POLICY IF EXISTS prompt_isolation_policy ON prompt_templates;
                CREATE POLICY prompt_isolation_policy ON prompt_templates
                    FOR ALL TO authenticated_user
                    USING (
                        user_id = current_setting('app.current_user_id', true)::uuid 
                        OR is_public = true
                    );
                """,
                """
                DROP POLICY IF EXISTS job_isolation_policy ON processing_jobs;
                CREATE POLICY job_isolation_policy ON processing_jobs
                    FOR ALL TO authenticated_user
                    USING (video_id IN (
                        SELECT id FROM videos 
                        WHERE user_id = current_setting('app.current_user_id', true)::uuid
                    ));
                """
            ]
            
            for policy in policies:
                await conn.execute(text(policy))
            
            logger.info("Created Row Level Security policies")
            
    except Exception as e:
        logger.error(f"Error creating RLS policies: {e}")
        raise


async def create_default_prompt_templates():
    """Create default prompt templates for common use cases."""
    try:
        async with engine.begin() as conn:
            # Create a system user for default templates
            system_user_id = "00000000-0000-0000-0000-000000000000"
            
            default_templates = [
                {
                    'name': 'Financial Analysis',
                    'description': 'Extract investment insights and market analysis from financial videos',
                    'category': 'financial',
                    'prompt_text': '''Analyze this video transcript about {video_title} and provide:

1. **Key Investment Insights**: Main investment themes and opportunities discussed
2. **Market Analysis**: Economic trends, market conditions, and forecasts mentioned
3. **Actionable Takeaways**: Specific actions or strategies recommended
4. **Risk Factors**: Potential risks or concerns highlighted
5. **Timeline**: Important dates, events, or milestones mentioned

Focus on factual information and direct quotes. Highlight any specific stock picks, economic indicators, or market predictions.''',
                    'variables': ['video_title', 'channel_name', 'duration']
                },
                {
                    'name': 'Technical Tutorial',
                    'description': 'Summarize educational and technical content with learning objectives',
                    'category': 'technical',
                    'prompt_text': '''Summarize this technical tutorial about {video_title}:

1. **Learning Objectives**: What skills or knowledge will viewers gain?
2. **Step-by-Step Process**: Break down the main steps or procedures
3. **Key Concepts**: Important terms, definitions, or principles explained
4. **Tools & Resources**: Software, tools, or resources mentioned
5. **Prerequisites**: Required background knowledge or skills
6. **Next Steps**: Suggested follow-up learning or applications

Make this suitable for someone who wants to understand and apply the content.''',
                    'variables': ['video_title', 'channel_name', 'duration']
                },
                {
                    'name': 'Meeting Summary',
                    'description': 'Structure meeting recordings with participants, decisions, and action items',
                    'category': 'meeting',
                    'prompt_text': '''Summarize this meeting recording:

1. **Participants**: Who was present or mentioned?
2. **Key Topics**: Main discussion points and agenda items
3. **Decisions Made**: What was decided or agreed upon?
4. **Action Items**: Specific tasks assigned with owners (if mentioned)
5. **Important Quotes**: Notable statements or announcements
6. **Follow-up**: Next meetings, deadlines, or checkpoints mentioned

Format this as a professional meeting summary that could be shared with stakeholders.''',
                    'variables': ['video_title', 'channel_name', 'duration']
                }
            ]
            
            for template in default_templates:
                await conn.execute(text("""
                    INSERT INTO prompt_templates (
                        id, user_id, name, description, category, prompt_text, 
                        variables, is_public, is_featured, created_at
                    ) VALUES (
                        gen_random_uuid(), :user_id, :name, :description, :category, 
                        :prompt_text, :variables, true, true, CURRENT_TIMESTAMP
                    ) ON CONFLICT (user_id, name) DO NOTHING
                """), {
                    'user_id': system_user_id,
                    'name': template['name'],
                    'description': template['description'],
                    'category': template['category'],
                    'prompt_text': template['prompt_text'],
                    'variables': template['variables']
                })
            
            logger.info("Created default prompt templates")
            
    except Exception as e:
        logger.error(f"Error creating default templates: {e}")
        raise


async def create_initial_economic_series():
    """Create initial economic series definitions."""
    try:
        async with engine.begin() as conn:
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
            
            logger.info("Created initial economic series definitions")
            
    except Exception as e:
        logger.error(f"Error creating initial economic series: {e}")
        raise


async def init_database():
    """Initialize the complete database setup."""
    try:
        logger.info("Starting database initialization...")
        
        # Step 1: Create database if it doesn't exist
        await create_database_if_not_exists()
        
        # Step 2: Create extensions
        await create_extensions()
        
        # Step 3: Create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Created all database tables")
        
        # Step 4: Create custom functions
        await create_custom_functions()
        
        # Step 5: Create triggers
        await create_triggers()
        
        # Step 6: Create performance indexes
        await create_performance_indexes()
        
        # Step 7: Set up Row Level Security
        await create_row_level_security()
        
        # Step 8: Create default prompt templates
        await create_default_prompt_templates()
        
        # Step 9: Create initial economic series
        await create_initial_economic_series()
        
        logger.info("Database initialization completed successfully!")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_database())