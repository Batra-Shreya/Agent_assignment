# app/database.py
import os
import logging
from pymongo import MongoClient, DESCENDING
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Use a lazy singleton pattern for the database
_db_client = None

def get_db():
    global _db_client
    if _db_client is None:
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        logger.info(f"Connecting to MongoDB at {mongo_uri.split('@')[-1]}") # Log host only for safety
        # Initialize client with timeouts to prevent hanging during startup
        _db_client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
    return _db_client.ai_orchestrator

def get_collection(name: str):
    return get_db()[name]

def init_indices():
    """
    Run index creation. Call this during FastAPI startup to avoid 
    blocking module imports.
    """
    logger.info("Initializing database indices...")
    db = get_db()
    try:
        # Verify connection
        db.client.admin.command('ping')
        logger.info("MongoDB connection verified.")

        logger.info("Creating indexes for 'agents'...")
        db.agents.create_index("name")
        logger.info("Creating indexes for 'workflows'...")
        db.workflows.create_index("name")
        logger.info("Creating indexes for 'executions'...")
        db.executions.create_index([("workflow_id", 1), ("timestamp", DESCENDING)])
        db.executions.create_index([("timestamp", DESCENDING)])
        logger.info("Creating indexes for 'messages'...")
        db.messages.create_index("workflow_id")
        logger.info("Database indices initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize indices: {e}")
        # We don't raise here so the app can still start and potentially report health errors

def agents_collection(): return get_collection("agents")
def workflows_collection(): return get_collection("workflows")
def messages_collection(): return get_collection("messages")
def executions_collection(): return get_collection("executions")
