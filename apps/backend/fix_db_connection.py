#!/usr/bin/env python3
"""
Quick fix script to ensure video insights database is properly initialized
"""

import sqlite3
import bcrypt
from datetime import datetime
import uuid

# Create connection to SQLite database
db_path = "video_insights.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if users table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
table_exists = cursor.fetchone()

if table_exists:
    print("✅ Users table exists")
    
    # Check if test user exists
    cursor.execute("SELECT email FROM users WHERE email = 'test@example.com'")
    user_exists = cursor.fetchone()
    
    if not user_exists:
        print("📝 Creating test user...")
        # Hash a test password
        password = "testpassword123"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Insert test user
        user_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO users (id, email, username, hashed_password, full_name, is_active, is_superuser, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            'test@example.com',
            'testuser',
            hashed,
            'Test User',
            1,  # is_active
            0,  # is_superuser
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
        conn.commit()
        print("✅ Test user created successfully")
    else:
        print("✅ Test user already exists")
        
else:
    print("❌ Users table does not exist - database may need to be initialized")

# Show all tables
print("\n📊 All tables in database:")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
for table in tables:
    print(f"  - {table[0]}")

# Close connection
conn.close()
print("\n✨ Database check complete")