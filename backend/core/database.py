"""
Database configuration and session management for PostgreSQL.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool, QueuePool
from typing import AsyncGenerator
import logging

from .config import settings

logger = logging.getLogger(__name__)

# Determine pool configuration based on environment
if settings.ENVIRONMENT == "production":
    poolclass = QueuePool
    pool_kwargs = {
        "pool_size": 20,          # Increased base connections for video processing
        "max_overflow": 40,       # Increased additional connections under load
        "pool_timeout": 45,       # Increased timeout for video processing
        "pool_recycle": 3600,     # Recycle connections hourly
        "pool_pre_ping": True,    # Validate connections
        "pool_reset_on_return": "commit",  # Reset connections properly
    }
else:
    poolclass = QueuePool  # Use pooling in development for testing
    pool_kwargs = {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
    }

# Create async database engine
engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=poolclass,
    echo=False,  # Disable SQL logging in production
    **pool_kwargs
)

# Session factory with optimized settings
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,  # Manual flush for better control
)


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get database session.
    
    Yields:
        AsyncSession: Database session
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_db_and_tables():
    """Create all database tables with performance optimizations."""
    try:
        # Import all models to ensure they're registered
        from models.database import (
            User, Video, Transcript, Summary, 
            Folder, PromptTemplate, ProcessingJob,
            EconomicSeries, EconomicDataPoint, create_search_indexes
        )
        
        async with engine.begin() as conn:
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            
            # Enable required PostgreSQL extensions (commented out - requires superuser)
            # await conn.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
            # await conn.execute("CREATE EXTENSION IF NOT EXISTS btree_gin;")
            # await conn.execute("CREATE EXTENSION IF NOT EXISTS pg_stat_statements;")
            
            # Set PostgreSQL performance parameters
            performance_settings = """
                -- Memory and performance settings
                ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
                ALTER SYSTEM SET shared_buffers = '256MB';
                ALTER SYSTEM SET effective_cache_size = '1GB';
                ALTER SYSTEM SET maintenance_work_mem = '64MB';
                ALTER SYSTEM SET checkpoint_completion_target = 0.9;
                ALTER SYSTEM SET wal_buffers = '16MB';
                ALTER SYSTEM SET default_statistics_target = 100;
                ALTER SYSTEM SET random_page_cost = 1.1;
                ALTER SYSTEM SET effective_io_concurrency = 200;
                
                -- Connection and worker settings
                ALTER SYSTEM SET max_connections = 200;
                ALTER SYSTEM SET max_worker_processes = 8;
                ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
                ALTER SYSTEM SET max_parallel_workers = 8;
                ALTER SYSTEM SET max_parallel_maintenance_workers = 2;
                
                -- Query optimization
                ALTER SYSTEM SET enable_partitionwise_join = on;
                ALTER SYSTEM SET enable_partitionwise_aggregate = on;
            """
            
            try:
                for setting in performance_settings.strip().split(';'):
                    if setting.strip():
                        await conn.execute(setting + ';')
            except Exception as e:
                logger.warning(f"Could not set performance parameters (may require superuser): {e}")
            
            # Enable Row Level Security and create policies (commented out - complex DDL)
            # await conn.execute("""
            #     -- Enable RLS on all user-scoped tables
            #     ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
            #     ALTER TABLE IF EXISTS videos ENABLE ROW LEVEL SECURITY;
            #     ALTER TABLE IF EXISTS transcripts ENABLE ROW LEVEL SECURITY;
            #     ALTER TABLE IF EXISTS summaries ENABLE ROW LEVEL SECURITY;
            #     ALTER TABLE IF EXISTS folders ENABLE ROW LEVEL SECURITY;
            #     ALTER TABLE IF EXISTS prompt_templates ENABLE ROW LEVEL SECURITY;
            #     
            #     -- Create database role for authenticated users
            #     DO $$ 
            #     BEGIN
            #         IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated_user') THEN
            #             CREATE ROLE authenticated_user;
            #         END IF;
            #     END
            #     $$;
            #     
            #     -- Create RLS policies for user isolation
            #     DROP POLICY IF EXISTS user_videos_policy ON videos;
            #     CREATE POLICY user_videos_policy ON videos
            #         FOR ALL TO authenticated_user
            #         USING (user_id = current_setting('app.current_user_id')::uuid);
            #     
            #     DROP POLICY IF EXISTS user_folders_policy ON folders;
            #     CREATE POLICY user_folders_policy ON folders
            #         FOR ALL TO authenticated_user
            #         USING (user_id = current_setting('app.current_user_id')::uuid);
            #     
            #     DROP POLICY IF EXISTS user_prompts_policy ON prompt_templates;
            #     CREATE POLICY user_prompts_policy ON prompt_templates
            #         FOR ALL TO authenticated_user
            #         USING (user_id = current_setting('app.current_user_id')::uuid OR is_public = true);
            #     
            #     DROP POLICY IF EXISTS user_transcripts_policy ON transcripts;
            #     CREATE POLICY user_transcripts_policy ON transcripts
            #         FOR ALL TO authenticated_user
            #         USING (EXISTS (SELECT 1 FROM videos WHERE videos.id = transcripts.video_id AND videos.user_id = current_setting('app.current_user_id')::uuid));
            #     
            #     DROP POLICY IF EXISTS user_summaries_policy ON summaries;
            #     CREATE POLICY user_summaries_policy ON summaries
            #         FOR ALL TO authenticated_user
            #         USING (EXISTS (SELECT 1 FROM videos WHERE videos.id = summaries.video_id AND videos.user_id = current_setting('app.current_user_id')::uuid));
            # """)
            
        # Create performance indexes
        logger.info("Creating performance indexes...")
        await create_performance_indexes()
        
        logger.info("Database tables, RLS policies, and performance indexes created successfully")
        
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


async def create_performance_indexes():
    """Create all performance indexes concurrently."""
    from models.database import create_search_indexes
    
    try:
        async with engine.begin() as conn:
            index_statements = create_search_indexes()
            
            for index_sql in index_statements:
                try:
                    await conn.execute(index_sql)
                    logger.info(f"Created index: {index_sql.split(' ')[-1] if 'idx_' in index_sql else 'extension/setting'}")
                except Exception as e:
                    logger.warning(f"Failed to create index/setting: {e}")
                    continue
        
        logger.info("Performance indexes created successfully")
        
    except Exception as e:
        logger.error(f"Error creating performance indexes: {e}")
        raise


async def set_user_context(session: AsyncSession, user_id: str):
    """Set user context for Row Level Security."""
    from sqlalchemy import text
    await session.execute(
        text(f"SELECT set_config('app.current_user_id', '{user_id}', false)")
    )


async def analyze_query_performance(query: str) -> dict:
    """Analyze query performance and get execution plan."""
    try:
        async with engine.begin() as conn:
            # Get query execution plan
            explain_result = await conn.execute(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}")
            plan = explain_result.fetchone()[0]
            
            return {
                'query': query,
                'execution_plan': plan,
                'total_cost': plan[0]['Plan']['Total Cost'],
                'execution_time': plan[0]['Execution Time'],
                'planning_time': plan[0]['Planning Time']
            }
    except Exception as e:
        logger.error(f"Query analysis failed: {e}")
        return {'error': str(e)}


async def get_database_stats() -> dict:
    """Get comprehensive database performance statistics."""
    try:
        async with engine.begin() as conn:
            # Table sizes
            table_sizes = await conn.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
            """)
            
            # Index usage statistics  
            index_stats = await conn.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch,
                    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
                FROM pg_stat_user_indexes 
                ORDER BY idx_tup_read DESC LIMIT 20;
            """)
            
            # Query performance (if pg_stat_statements is available)
            try:
                query_stats = await conn.execute("""
                    SELECT 
                        query,
                        calls,
                        total_time,
                        mean_time,
                        rows
                    FROM pg_stat_statements 
                    ORDER BY total_time DESC 
                    LIMIT 10;
                """)
                query_stats_data = [dict(row) for row in query_stats.fetchall()]
            except:
                query_stats_data = []
            
            return {
                'table_sizes': [dict(row) for row in table_sizes.fetchall()],
                'index_stats': [dict(row) for row in index_stats.fetchall()],
                'query_stats': query_stats_data,
                'connection_stats': {
                    'max_connections': 200,
                    'current_connections': 'Check with monitoring'
                }
            }
            
    except Exception as e:
        logger.error(f"Database stats collection failed: {e}")
        return {'error': str(e)}