# app/engine.py
import os
from crewai import Agent, Task, Crew, Process
from crewai.tools import tool   # <--- THIS IS THE MAGIC FIX
from tavily import TavilyClient
from bson import ObjectId
from app.database import agents_collection, workflows_collection, messages_collection
from dotenv import load_dotenv

load_dotenv()

# Ensure OpenRouter Key is available in the environment for CrewAI
os.environ["OPENROUTER_API_KEY"] = os.getenv("OPENROUTER_API_KEY", "")

# 1. Initialize the raw Tavily client natively
tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# 2. Use CrewAI's NATIVE decorator to define the tool (Bypasses LangChain errors!)
@tool("web_search")
def web_search_tool(query: str) -> str:
    """Search the web for up-to-date information, news, and facts. Provide a specific search query."""
    try:
        # Fetch 3 search results and return them as a string to the AI
        results = tavily_client.search(query=query, max_results=3)
        return str(results)
    except Exception as e:
        return f"Search failed: {str(e)}"

# Map string names from your DB to the decorated tool function
AVAILABLE_TOOLS = {
    "web_search": web_search_tool
}

def execute_workflow(workflow_id: str, user_prompt: str):
    # Fetch workflow from DB
    workflow = workflows_collection.find_one({"_id": ObjectId(workflow_id)})
    if not workflow:
        raise ValueError("Workflow not found")

    crew_agents = []
    crew_tasks = []

    agent_ids = workflow.get("agents", [])
    
    # Loop through the agents saved in this workflow
    for idx, a_id in enumerate(agent_ids):
        agent_data = agents_collection.find_one({"_id": ObjectId(a_id)})
        if not agent_data:
            continue
        
        # Map strings like ["web_search"] to actual tools safely
        agent_tools = [AVAILABLE_TOOLS[t] for t in agent_data.get("tools", []) if t in AVAILABLE_TOOLS]
        
        # Grab the model from DB
        db_model = agent_data.get("model", "meta-llama/llama-3-8b-instruct:free")
        
        # Format the model string for CrewAI natively (e.g., "openrouter/meta-llama...")
        formatted_llm = f"openrouter/{db_model}" if not db_model.startswith("openrouter/") else db_model

        # Create CrewAI Agent
        crew_agent = Agent(
            role=agent_data["role"],
            goal=agent_data["system_prompt"],
            backstory=f"You are a {agent_data['role']}. {agent_data['system_prompt']}",
            tools=agent_tools,
            memory=agent_data["config"].get("memory", True),
            verbose=True,
            allow_delegation=False,
            llm=formatted_llm
        )
        crew_agents.append(crew_agent)

        # Create Task
        task_desc = user_prompt if idx == 0 else f"Review and refine the findings from the previous agent based on your role: {agent_data['role']}."
        
        task = Task(
            description=task_desc,
            expected_output="A detailed response based on your specific role.",
            agent=crew_agent
        )
        crew_tasks.append(task)

    if not crew_agents:
        raise ValueError("No valid agents found for this workflow")

    # Create and Run the Crew
    crew = Crew(
        agents=crew_agents,
        tasks=crew_tasks,
        process=Process.sequential, 
        verbose=True
    )

    # Kickoff execution
    result = crew.kickoff()
    final_output = str(result)
    
    # Save message history to DB
    messages_collection.insert_one({
        "workflow_id": workflow_id,
        "user_prompt": user_prompt,
        "final_output": final_output,
        "status": "completed"
    })

    return final_output