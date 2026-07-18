#!/usr/bin/env python
"""
Database migration script to initialize conversation history tables.
Run this after deploying to create the required tables.
"""
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.app.database import engine, Base
from backend.app.models import Conversation, Message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Create all database tables"""
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✓ Database tables created successfully")
        
        # List created tables
        logger.info("Created tables:")
        for table in Base.metadata.tables:
            logger.info(f"  - {table}")
        
        return True
    except Exception as e:
        logger.error(f"✗ Migration failed: {e}")
        return False

def drop_all():
    """Drop all database tables (DESTRUCTIVE)"""
    try:
        logger.warning("Dropping all database tables...")
        Base.metadata.drop_all(bind=engine)
        logger.info("✓ All tables dropped")
        return True
    except Exception as e:
        logger.error(f"✗ Drop failed: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--drop":
        confirm = input("Are you sure you want to drop all tables? (yes/no): ")
        if confirm.lower() == "yes":
            drop_all()
    else:
        migrate()
