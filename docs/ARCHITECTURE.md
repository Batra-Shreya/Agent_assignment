# Architecture

## Overview

This project is divided into three principal components:

- **Frontend (`frontend/`)**
  - Built with Next.js.
  - Provides UI for managing agents, visual workflows, and monitoring runtime execution.
  - Uses REST endpoints under `http://localhost:8000/api`.

- **Backend (`backend/`)**
  - Built with FastAPI.
  - Provides CRUD APIs for agents and workflows, execution endpoints, and streamable runtime logs.
  - Connects to MongoDB for persistence.

- **Agent runtime**
  - Implemented in `backend/app/engine.py` using CrewAI.
  - Creates `Agent` objects from stored agent configuration.
  - Configures tools, memory, and workflow tasks.
  - Executes workflows as a sequential Crew.

## Persistence

- MongoDB stores:
  - `agents`
  - `workflows`
  - `executions`
  - `messages`

- Indexes are created in `backend/app/database.py`.

## Messaging channel

- Telegram is implemented in `backend/bot.py`.
- The bot receives user messages and forwards them to the backend `/api/workflows/execute` endpoint.
- The bot replies with the workflow output.

## Notes on current model

- Workflows are currently executed sequentially, even though the UI allows a graph-based builder.
- Agent configuration includes `channels`, `tools`, and `config` fields, but the current frontend agent form only persists the base agent fields.
- Message history is stored in MongoDB, but the UI does not yet provide a dedicated message timeline page.
