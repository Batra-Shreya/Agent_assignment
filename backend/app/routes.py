# app/routes.py
import uuid
import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from bson import ObjectId
from bson.errors import InvalidId
from pydantic import BaseModel
from app.models import AgentModel, WorkflowModel
from app.database import get_collection
from app.engine import execute_workflow, run_logs, run_store

router = APIRouter()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"Invalid ID format: {id_str!r}")

def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    if "timestamp" in doc and hasattr(doc["timestamp"], "isoformat"):
        doc["timestamp"] = doc["timestamp"].isoformat()
    return doc

# ── Agents ────────────────────────────────────────────────────────────────────

@router.post("/agents")
def create_agent(agent: AgentModel):
    result = get_collection("agents").insert_one(agent.model_dump())
    return {"id": str(result.inserted_id), "status": "Agent created"}

@router.get("/agents")
def get_agents():
    return [_serialize(doc) for doc in get_collection("agents").find()]

@router.get("/agents/{agent_id}")
def get_agent(agent_id: str):
    doc = get_collection("agents").find_one({"_id": _oid(agent_id)})
    if not doc:
        raise HTTPException(404, "Agent not found")
    return _serialize(doc)

@router.put("/agents/{agent_id}")
def update_agent(agent_id: str, agent: AgentModel):
    result = get_collection("agents").update_one({"_id": _oid(agent_id)}, {"$set": agent.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(404, "Agent not found")
    return {"id": agent_id, "status": "Agent updated"}

@router.delete("/agents/{agent_id}")
def delete_agent(agent_id: str):
    result = get_collection("agents").delete_one({"_id": _oid(agent_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Agent not found")
    return {"status": "Agent deleted"}

# ── Workflows ─────────────────────────────────────────────────────────────────

@router.post("/workflows")
def create_workflow(workflow: WorkflowModel):
    result = get_collection("workflows").insert_one(workflow.model_dump())
    return {"id": str(result.inserted_id), "status": "Workflow created"}

@router.get("/workflows")
def get_workflows():
    return [_serialize(doc) for doc in get_collection("workflows").find()]

@router.get("/workflows/{workflow_id}")
def get_workflow(workflow_id: str):
    doc = get_collection("workflows").find_one({"_id": _oid(workflow_id)})
    if not doc:
        raise HTTPException(404, "Workflow not found")
    return _serialize(doc)

@router.put("/workflows/{workflow_id}")
def update_workflow(workflow_id: str, workflow: WorkflowModel):
    result = get_collection("workflows").update_one({"_id": _oid(workflow_id)}, {"$set": workflow.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(404, "Workflow not found")
    return {"id": workflow_id, "status": "Workflow updated"}

@router.delete("/workflows/{workflow_id}")
def delete_workflow(workflow_id: str):
    result = get_collection("workflows").delete_one({"_id": _oid(workflow_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Workflow not found")
    return {"status": "Workflow deleted"}

# ── Execution (background + polling) ─────────────────────────────────────────

class WorkflowExecutionRequest(BaseModel):
    workflow_id: str
    user_prompt: str

def _background_execute(run_id: str, workflow_id: str, user_prompt: str):
    """Runs in a thread-pool worker; updates run_store when done."""
    run_store[run_id] = {"status": "running", "result": None, "token_count": 0}
    try:
        data = execute_workflow(workflow_id, user_prompt, run_id=run_id)
        output      = data["output"]      if isinstance(data, dict) else str(data)
        token_count = data["token_count"] if isinstance(data, dict) else 0

        exec_doc = {
            "workflow_id": workflow_id,
            "user_prompt": user_prompt,
            "output": output,
            "token_count": token_count,
            "status": "success",
            "timestamp": datetime.utcnow(),
            "run_id": run_id,
        }
        exec_result = get_collection("executions").insert_one(exec_doc)
        run_store[run_id] = {
            "status": "done",
            "result": output,
            "token_count": token_count,
            "execution_id": str(exec_result.inserted_id),
        }
    except Exception as e:
        err_msg = str(e)
        try:
            get_collection("executions").insert_one({
                "workflow_id": workflow_id,
                "user_prompt": user_prompt,
                "output": err_msg,
                "token_count": 0,
                "status": "error",
                "timestamp": datetime.utcnow(),
                "run_id": run_id,
            })
        except Exception:
            pass
        run_store[run_id] = {"status": "error", "result": err_msg, "token_count": 0}


@router.post("/workflows/execute")
def run_workflow_api(req: WorkflowExecutionRequest, background_tasks: BackgroundTasks):
    _oid(req.workflow_id)  # validate format early
    run_id = str(uuid.uuid4())
    run_store[run_id] = {"status": "running", "result": None, "token_count": 0}
    background_tasks.add_task(_background_execute, run_id, req.workflow_id, req.user_prompt)
    return {"run_id": run_id, "status": "running"}


@router.get("/runs/{run_id}")
def get_run_status(run_id: str):
    entry = run_store.get(run_id)
    if not entry:
        raise HTTPException(404, "Run not found")
    return entry


@router.get("/runs/{run_id}/logs")
async def stream_run_logs(run_id: str):
    """
    Server-Sent Events stream.
    Yields new log lines as they appear in run_logs[run_id].
    Closes automatically when the run finishes or after 3 minutes.
    """
    async def event_generator():
        seen = 0
        for _ in range(180):  # max 3 min (1s tick)
            logs = run_logs.get(run_id, [])
            for entry in logs[seen:]:
                yield f"data: {json.dumps(entry)}\n\n"
            seen = len(logs)
            status = run_store.get(run_id, {}).get("status", "running")
            if status in ("done", "error") and seen >= len(run_logs.get(run_id, [])):
                yield f"data: {json.dumps({'agent': 'Runtime', 'msg': f'Stream closed · status={status}', 'time': datetime.utcnow().strftime('%H:%M:%S')})}\n\n"
                return
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ── Executions ────────────────────────────────────────────────────────────────

@router.get("/executions")
def list_executions():
    return [_serialize(doc) for doc in get_collection("executions").find().sort("timestamp", -1)]

@router.get("/executions/{execution_id}")
def get_execution(execution_id: str):
    doc = get_collection("executions").find_one({"_id": _oid(execution_id)})
    if not doc:
        raise HTTPException(404, "Execution not found")
    return _serialize(doc)

# ── Messages ──────────────────────────────────────────────────────────────────

@router.get("/messages/{workflow_id}")
def get_workflow_messages(workflow_id: str):
    return [_serialize(doc) for doc in get_collection("messages").find({"workflow_id": workflow_id})]

# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    try:
        get_collection("agents").database.client.admin.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return {"api": "ok", "db": "ok" if db_ok else "unreachable"}
