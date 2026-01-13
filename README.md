# Internal Intelligent Solution Library

This project integrates with a local FastGPT instance to provide a Solution Knowledge Base with intelligent search and QA.

## Prerequisites

1.  **FastGPT** deployed locally at `http://localhost:3000`.
2.  **Node.js** installed.

## Setup

### 1. Configure Backend

1.  Navigate to `server` directory.
2.  Copy `.env` and fill in your FastGPT credentials:
    *   `FASTGPT_DATASET_ID`: Create a dataset in FastGPT and get its ID.
    *   `FASTGPT_API_KEY`: Get a standard API Key (with Dataset write permissions).
    *   `FASTGPT_APP_KEY`: Create an App in FastGPT associated with the dataset and get its "App API Key" (starting with `fastgpt-`).

```bash
cd server
npm install
# Edit .env file with your keys
npm start
```

### 2. Start Frontend

```bash
cd client
npm install
npm run dev
```

## Usage

1.  Open `http://localhost:5173`.
2.  Go to **Solutions** tab to upload PDF/Word documents.
3.  Go to **Assistant** tab to ask questions about the uploaded solutions.

## Architecture

*   **Frontend**: React + TailwindCSS (Vite)
*   **Backend**: Node.js + Express (Proxy to FastGPT)
*   **Database**: Local `db.json` for metadata storage.

## Development Status (Jan 2026)

See `project_memory.md` for detailed logs.

*   **Current Focus**: File Upload & Ingestion (Completed via Local Parsing).
*   **Next Steps**: Chat UI Integration.
