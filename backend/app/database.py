# app/database.py
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client.ai_orchestrator

# Collections
agents_collection = db.agents
workflows_collection = db.workflows
messages_collection = db.messages
executions_collection = db.executions