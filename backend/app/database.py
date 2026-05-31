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
        # Initialize client only when requested
        _db_client = MongoClient(mongo_uri)
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
    
    db.agents.create_index("name")
    db.workflows.create_index("name")
    db.executions.create_index([("workflow_id", 1), ("timestamp", DESCENDING)])
    db.executions.create_index([("timestamp", DESCENDING)])
    db.messages.create_index("workflow_id")
    logger.info("Database indices initialized.")

def agents_collection(): return get_collection("agents")
def workflows_collection(): return get_collection("workflows")
def messages_collection(): return get_collection("messages")
def executions_collection(): return get_collection("executions")
