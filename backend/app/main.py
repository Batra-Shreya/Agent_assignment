# app/main.py
import time
import logging
from fastapi import FastAPI
from app.routes import router
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_indices

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

start_init = time.time()

app = FastAPI(title="AI Agent Orchestrator API")

@app.on_event("startup")
async def startup_event():
    # Initialize database indices in the background after startup
    # to avoid blocking the main thread during port binding.
    init_indices()
    logger.info("Application startup logic completed.")

# Allow Frontend to communicate with Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], #  restrict to Vercel URL later.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
def health_check():
    return {"status": "Backend is running!", "version": "1.0.1"}

duration = time.time() - start_init
logger.info(f"FastAPI instance initialized in {duration:.4f} seconds")