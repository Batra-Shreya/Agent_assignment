# app/database.py
import os
from pymongo import MongoClient, DESCENDING
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

client = MongoClient(MONGO_URI)
db = client.ai_orchestrator

agents_collection     = db.agents
workflows_collection  = db.workflows
messages_collection   = db.messages
executions_collection = db.executions

# Indexes (idempotent — safe to call multiple times)
agents_collection.create_index("name")
workflows_collection.create_index("name")
executions_collection.create_index([("workflow_id", 1), ("timestamp", DESCENDING)])
executions_collection.create_index([("timestamp", DESCENDING)])
messages_collection.create_index("workflow_id")
