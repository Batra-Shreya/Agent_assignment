# app/engine.py
import os
import uuid
from collections import defaultdict
from datetime import datetime
from crewai import Agent, Task, Crew, Process
from crewai.tools import tool
from bson import ObjectId
from app.database import agents_collection, workflows_collection, messages_collection
from dotenv import load_dotenv

load_dotenv()

os.environ["OPENROUTER_API_KEY"] = os.getenv("OPENROUTER_API_KEY", "")

# ── Per-run log store (in-memory; swap for Redis in production) ───────────────
run_logs: dict = defaultdict(list)
run_store: dict = {}  # run_id → {status, result, token_count}

def _log(run_id: str, agent_name: str, msg: str):
    if run_id:
        run_logs[run_id].append({
            "time": datetime.utcnow().strftime("%H:%M:%S"),
            "agent": agent_name,
            "msg": msg,
        })

# ── Tools ─────────────────────────────────────────────────────────────────────

try:
    from tavily import TavilyClient
    _tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY", ""))

    @tool("web_search")
    def web_search_tool(query: str) -> str:
        """Search the web for up-to-date information. Provide a specific search query."""
        try:
            results = _tavily.search(query=query, max_results=3)
            return str(results)
        except Exception as e:
            return f"Search failed: {str(e)}"

except Exception:
    @tool("web_search")
    def web_search_tool(query: str) -> str:
        """Web search (unavailable — TAVILY_API_KEY not set)."""
        return "Web search unavailable: TAVILY_API_KEY not configured."


@tool("calculator")
def calculator_tool(expression: str) -> str:
    """Evaluate a mathematical expression. Input must be a valid Python math expression."""
    import ast, math
    try:
        tree = ast.parse(expression.strip(), mode="eval")
        result = eval(
            compile(tree, "<string>", "eval"),
            {"__builtins__": {}, "math": math, "abs": abs, "round": round, "min": min, "max": max},
        )
        return str(result)
    except Exception as e:
        return f"Calculation error: {e}"


@tool("current_datetime")
def datetime_tool(query: str = "") -> str:
    """Return the current UTC date and time."""
    return datetime.utcnow().strftime("UTC %Y-%m-%d  %H:%M:%S")


@tool("word_count")
def word_count_tool(text: str) -> str:
    """Count words and characters in a piece of text."""
    words = len(text.split())
    chars = len(text)
    return f"{words} words, {chars} characters"


AVAILABLE_TOOLS = {
    "web_search":       web_search_tool,
    "tavily":           web_search_tool,   # alias
    "calculator":       calculator_tool,
    "current_datetime": datetime_tool,
    "word_count":       word_count_tool,
}

# ── Execution ─────────────────────────────────────────────────────────────────

def execute_workflow(workflow_id: str, user_prompt: str, run_id: str = None) -> dict:
    """
    Run the workflow synchronously. Returns {"output": str, "token_count": int}.
    If run_id is supplied, logs are written to run_logs[run_id] for SSE streaming.
    """
    run_id = run_id or str(uuid.uuid4())

    workflow = workflows_collection.find_one({"_id": ObjectId(workflow_id)})
    if not workflow:
        raise ValueError("Workflow not found")

    agent_ids = workflow.get("agents", [])
    if not agent_ids:
        raise ValueError("Workflow has no agents")

    _log(run_id, "Runtime", f"Starting workflow '{workflow.get('name', workflow_id)}' · {len(agent_ids)} agent(s)")

    crew_agents, crew_tasks = [], []

    for idx, a_id in enumerate(agent_ids):
        agent_data = agents_collection.find_one({"_id": ObjectId(a_id)})
        if not agent_data:
            _log(run_id, "Runtime", f"WARN Agent {a_id} not found — skipping")
            continue

        agent_name = agent_data.get("name", agent_data.get("role", "Agent"))
        db_model   = agent_data.get("model", "meta-llama/llama-3-8b-instruct:free")
        llm_str    = f"openrouter/{db_model}" if not db_model.startswith("openrouter/") else db_model
        tools_used = [AVAILABLE_TOOLS[t] for t in agent_data.get("tools", []) if t in AVAILABLE_TOOLS]
        tool_names = [t for t in agent_data.get("tools", []) if t in AVAILABLE_TOOLS]

        _log(run_id, agent_name, f"INIT model={db_model} · tools=[{', '.join(tool_names) or 'none'}]")

        crew_agent = Agent(
            role=agent_data["role"],
            goal=agent_data["system_prompt"],
            backstory=f"You are {agent_name}, a {agent_data['role']}. {agent_data['system_prompt']}",
            tools=tools_used,
            memory=agent_data.get("config", {}).get("memory", True),
            verbose=True,
            allow_delegation=False,
            llm=llm_str,
        )
        crew_agents.append(crew_agent)

        task_desc = (
            user_prompt
            if idx == 0
            else f"Review and refine the previous agent's output based on your role as {agent_data['role']}."
        )
        crew_tasks.append(Task(
            description=task_desc,
            expected_output="A detailed, well-structured response based on your role.",
            agent=crew_agent,
        ))

    if not crew_agents:
        raise ValueError("No valid agents found for this workflow")

    crew = Crew(agents=crew_agents, tasks=crew_tasks, process=Process.sequential, verbose=True)

    _log(run_id, "Runtime", f"Crew assembled · {len(crew_agents)} agent(s) · sequential process")

    result = crew.kickoff()

    # ── Extract output ────────────────────────────────────────────────────────
    final_output = result.raw if hasattr(result, "raw") else str(result)

    # ── Extract token count ───────────────────────────────────────────────────
    token_count = 0
    try:
        usage = result.token_usage
        if usage:
            token_count = (
                getattr(usage, "total_tokens", None)
                or getattr(usage, "total", None)
                or (usage.get("total_tokens") if isinstance(usage, dict) else 0)
                or 0
            )
    except Exception:
        pass

    _log(run_id, "Runtime", f"DONE · {token_count} tokens · output={len(final_output)} chars")

    messages_collection.insert_one({
        "workflow_id": workflow_id,
        "user_prompt": user_prompt,
        "final_output": final_output,
        "token_count": token_count,
        "status": "completed",
        "timestamp": datetime.utcnow(),
    })

    return {"output": final_output, "token_count": token_count}
