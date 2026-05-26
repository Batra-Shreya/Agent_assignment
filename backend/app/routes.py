# app/routes.py
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from app.models import AgentModel, WorkflowModel
from app.database import agents_collection, workflows_collection, messages_collection, executions_collection
from app.engine import execute_workflow
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# --- AGENT CRUD ---
@router.post("/agents")
def create_agent(agent: AgentModel):
    agent_dict = agent.model_dump()
    result = agents_collection.insert_one(agent_dict)
    return {"id": str(result.inserted_id), "status": "Agent created"}

@router.get("/agents")
def get_agents():
    agents = []
    for doc in agents_collection.find():
        doc["_id"] = str(doc["_id"])
        agents.append(doc)
    return agents

# --- WORKFLOW CRUD ---
@router.post("/workflows")
def create_workflow(workflow: WorkflowModel):
    wf_dict = workflow.model_dump()
    result = workflows_collection.insert_one(wf_dict)
    return {"id": str(result.inserted_id), "status": "Workflow created"}

@router.get("/workflows")
def get_workflows():
    workflows = []
    for doc in workflows_collection.find():
        doc["_id"] = str(doc["_id"])
        workflows.append(doc)
    return workflows

# --- EXECUTION ---
class WorkflowExecutionRequest(BaseModel):
    workflow_id: str
    user_prompt: str

@router.post("/workflows/execute")
def run_workflow_api(req: WorkflowExecutionRequest):
    try:
        # Call the CrewAI engine we just built
        result = execute_workflow(req.workflow_id, req.user_prompt)

        # Normalize result: engine may return a string or a dict with details
        if isinstance(result, dict):
            output = result.get("output") or result.get("final_output") or str(result)
            token_count = result.get("token_count", 0)
        else:
            output = str(result)
            token_count = 0

        # Record execution to DB with timestamp, output, token count, and status
        exec_doc = {
            "workflow_id": req.workflow_id,
            "user_prompt": req.user_prompt,
            "output": output,
            "token_count": token_count,
            "status": "success",
            "timestamp": datetime.utcnow(),
        }
        exec_result = executions_collection.insert_one(exec_doc)

        return {"status": "success", "result": output, "execution_id": str(exec_result.inserted_id)}
    except Exception as e:
        # Log failed execution to DB
        try:
            err_doc = {
                "workflow_id": req.workflow_id,
                "user_prompt": req.user_prompt,
                "output": str(e),
                "token_count": 0,
                "status": "error",
                "timestamp": datetime.utcnow(),
            }
            executions_collection.insert_one(err_doc)
        except Exception:
            # ignore logging errors
            pass
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/executions")
def list_executions():
    executions = []
    for doc in executions_collection.find().sort("timestamp", -1):
        doc["_id"] = str(doc["_id"])
        # convert timestamp to ISO if present
        if "timestamp" in doc and hasattr(doc["timestamp"], "isoformat"):
            doc["timestamp"] = doc["timestamp"].isoformat()
        executions.append(doc)
    return executions


@router.get("/executions/{execution_id}")
def get_execution(execution_id: str):
    doc = executions_collection.find_one({"_id": ObjectId(execution_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Execution not found")
    doc["_id"] = str(doc["_id"])
    if "timestamp" in doc and hasattr(doc["timestamp"], "isoformat"):
        doc["timestamp"] = doc["timestamp"].isoformat()
    return doc

@router.get("/messages/{workflow_id}")
def get_workflow_messages(workflow_id: str):
    # Endpoint for the frontend to pull chat history
    messages = []
    for doc in messages_collection.find({"workflow_id": workflow_id}):
        doc["_id"] = str(doc["_id"])
        messages.append(doc)
    return messages

@router.put("/workflows/{workflow_id}")
def update_workflow(workflow_id: str, workflow: WorkflowModel):
    wf_dict = workflow.model_dump()
    result = workflows_collection.update_one(
        {"_id": ObjectId(workflow_id)},
        {"$set": wf_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"id": workflow_id, "status": "Workflow updated"}