#!/usr/bin/env python3
"""
Initialize PostgreSQL database for video insights with test user
"""

import asyncio
import asyncpg
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import bcrypt
from datetime import datetime
import uuid
import os

# Get database URL from environment or use default
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:password@localhost:5433/video_insights')
# Convert to asyncpg format
ASYNCPG_URL = DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://')

async def create_test_user():
    """Create a test user in PostgreSQL database"""
    
    # Create engine
    engine = create_async_engine(ASYNCPG_URL)
    
    try:
        async with engine.begin() as conn:
            # Check if users table exists
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'users'
                )
            """))
            table_exists = result.scalar()
            
            if not table_exists:
                print("❌ Users table does not exist - run database migrations first")
                return
            
            print("✅ Users table exists")
            
            # Check if test user already exists
            result = await conn.execute(text(
                "SELECT email FROM users WHERE email = :email"
            ), {"email": "test@example.com"})
            user_exists = result.scalar()
            
            if user_exists:
                print("✅ Test user already exists")
                return
            
            print("📝 Creating test user...")
            
            # Hash password
            password = "testpassword123"
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            user_id = str(uuid.uuid4())
            
            # Insert test user
            await conn.execute(text("""
                INSERT INTO users (id, email, username, hashed_password, full_name, is_active, is_superuser, created_at, updated_at)
                VALUES (:id, :email, :username, :hashed_password, :full_name, :is_active, :is_superuser, :created_at, :updated_at)
            """), {
                "id": user_id,
                "email": "test@example.com",
                "username": "testuser",
                "hashed_password": hashed,
                "full_name": "Test User",
                "is_active": True,
                "is_superuser": False,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            })
            
            print("✅ Test user created successfully")
            print(f"   Email: test@example.com")
            print(f"   Password: testpassword123")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await engine.dispose()

async def show_tables():
    """Show all tables in the database"""
    engine = create_async_engine(ASYNCPG_URL)
    
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("""
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY tablename
            """))
            tables = result.fetchall()
            
            print("\n📊 All tables in database:")
            for table in tables:
                print(f"  - {table[0]}")
                
    except Exception as e:
        print(f"❌ Error listing tables: {e}")
    finally:
        await engine.dispose()

async def main():
    print("🐘 PostgreSQL Database Initialization")
    print(f"📍 Database URL: {DATABASE_URL}")
    print("-" * 50)
    
    await show_tables()
    print("-" * 50)
    await create_test_user()
    print("\n✨ Database initialization complete")

if __name__ == "__main__":
    asyncio.run(main())