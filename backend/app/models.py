# app/models.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class AgentConfig(BaseModel):
    memory: bool = True
    schedules: Optional[str] = None
    interaction_rules: Optional[str] = None
    guardrails: Optional[str] = None
    max_iterations: int = 5

class AgentModel(BaseModel):
    name: str
    role: str
    system_prompt: str
    model: str = "gpt-4o-mini"
    tools: List[str] = []
    channels: List[str] = ["UI"] # e.g., ["UI", "Telegram"]
    config: AgentConfig

class WorkflowModel(BaseModel):
    name: str
    description: str
    agents: List[str] = []  # List of Agent IDs
    conditions: Optional[Dict[str, Any]] = None # For the visual builder logic