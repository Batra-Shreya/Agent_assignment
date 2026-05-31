# AI Agent Orchestration Platform (https://agent-assignment-one.vercel.app/)

This repository contains a local-first AI agent orchestration platform (backend + frontend). It lets you create configurable AI agents, connect them into visual workflows, run those workflows on a real runtime (CrewAI), persist execution history, and interact with agents via Telegram.

This README explains the architecture, how to run the project locally, demo steps, and notes on limitations and extension points.

---

**Contents**
- Overview
- Architecture
- Features implemented
- Requirements
- Environment variables
- Quick start (local)
- Demo checklist (recorded/live)
- Limitations & future work
- How to extend
- Tests & verification

---

## Overview

The platform provides:
- Agent CRUD: create, update, delete agents (name, role, system prompt, model, tools, channels)
- Visual workflow builder (canvas, nodes, edges, templates)
- Runtime execution using CrewAI to run multi-agent processes
- Tool integrations (web search via Tavily, calculator, datetime, word count)
- Persistence with MongoDB (agents, workflows, executions, messages)
- External messaging channel: Telegram bot to trigger workflows and receive responses
- Monitoring UI with recent executions, live logs, token/cost estimates

## Architecture (high level)

- Frontend: Next.js app in `frontend/` — UI for Agents, Workflows, Monitoring
- Backend: FastAPI app in `backend/` — REST API, workflow execution endpoints, SSE logs
- Runtime: CrewAI used inside `backend/app/engine.py` to run agents and tasks
- Persistence: MongoDB (local or remote) via `pymongo` (`backend/app/database.py`)
- Messaging: Telegram bot implemented at `backend/bot.py` that calls the API to execute workflows

Rationale: CrewAI was chosen to provide an actual agent runtime that supports tools, delegation, and multi-agent orchestration with a small integration surface. FastAPI + Next.js delivers a fast developer experience and clear separation between API/runtime and UI.

## Features implemented

- Agent CRUD API and UI (`/api/agents`, UI at /agents)
- Workflow CRUD API and visual canvas UI (`/api/workflows`, UI at /workflows)
- Workflow execution endpoint (`/api/workflows/execute`) that runs CrewAI crews sequentially
- Execution persistence and listing (`/api/executions`) and per-run log streaming (`/api/runs/{id}/logs`)
- Message persistence for completed runs (`messages` collection)
- Telegram integration (`backend/bot.py`) — send user prompt → triggers workflow → replies with result
- Monitoring UI showing recent executions, token counts, and demo live logs

## Requirements

- Python 3.10+ (tested on 3.10/3.11)
- Node 18+ (for frontend)
- MongoDB running locally or accessible via `MONGO_URI`
- (Optional) Tavily API key for web search integration

## Environment variables

Create a `.env` file in `backend/` (or use environment variables). Example variables used by the project:

```text
MONGO_URI=mongodb://localhost:27017
OPENROUTER_API_KEY=...
TAVILY_API_KEY=...        # optional; enables web_search tool
TELEGRAM_BOT_TOKEN=...    # required for Telegram bot
DEFAULT_WORKFLOW_ID=...   # workflow id used by the bot
```

## Quick start (local)

1. Backend: create a Python environment and install deps

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. Start MongoDB (example using local mongod)

```bash
# start your MongoDB server (varies by platform)
```

3. Run the backend API

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. Frontend

```bash
cd frontend
npm install
npm run dev
```

5. Optional: start the Telegram bot

```bash
cd backend
python bot.py
```

Notes:
- The Telegram bot expects `TELEGRAM_BOT_TOKEN` and `DEFAULT_WORKFLOW_ID` set.
- The default API address used by the frontend is `http://localhost:8000/api`. If you run the backend on another host/port, update `frontend` API constant.


## Limitations & known gaps

- The visual workflow conditions are stored in the DB, but the backend `execute_workflow` currently runs agents sequentially (CrewAI sequential process) and does not evaluate arbitrary graph conditions or parallel branches.
- The agent creation UI currently saves only the minimal agent fields (`name`, `role`, `system_prompt`, `tools`) — some form fields (channels, config toggles) are not yet persisted to MongoDB by the frontend.
- Agent-to-agent communication is implemented as sequential task handoff via CrewAI rather than asynchronous message queues. For fully asynchronous messaging, integrate Redis/queue and implement message passing logic.
- Slack and WhatsApp channels are not implemented; only Telegram is available.

## How to extend

- Persist UI toggles: update the frontend agent form to include `channels` and `config` when posting to `/api/agents` and adjust `backend/app/models.py` shape accordingly.
- Add new tools: add a `@tool` in `backend/app/engine.py` and include its key in an agent's `tools` array.
- Add new messaging channels: implement a small adapter similar to `backend/bot.py` for Slack or WhatsApp (Twilio/WhatsApp Cloud API) that calls `/api/workflows/execute`.
- Make workflows evaluate graph logic: implement a graph executor that maps nodes/edges/conditions into tasks and supports parallel or conditional execution.

## Tests & verification

- Manual tests to run:
	- Create agent → list agents (`GET /api/agents`)
	- Create workflow → list workflows (`GET /api/workflows`)
	- Execute workflow via API and confirm execution is persisted (`POST /api/workflows/execute`, then `GET /api/executions`)
	- Start `bot.py` and message the Telegram bot to confirm the end-to-end path

## Files to review

- Backend runtime: [backend/app/engine.py](backend/app/engine.py)
- Backend API & routes: [backend/app/routes.py](backend/app/routes.py)
- Telegram bot: [backend/bot.py](backend/bot.py)
- Frontend workflows UI: [frontend/src/app/workflows/page.tsx](frontend/src/app/workflows/page.tsx)
- Frontend agents UI: [frontend/src/app/agents/page.tsx](frontend/src/app/agents/page.tsx)
