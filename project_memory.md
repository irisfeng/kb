# Project Memory & Dev Log

## 2026-01-08: Initial Setup & File Upload Implementation

### Status
- **Backend**: Operational (Port 3001)
- **Frontend**: Operational (Port 5173)
- **FastGPT Integration**: Partially Complete (Data Ingestion working, Chat pending)

### Key Technical Decisions
1.  **File Upload Strategy Change**:
    - *Original Plan*: Use FastGPT `POST /common/file/upload` API.
    - *Issue Encountered*: Persistent 404/500 errors. The API endpoint path varies significantly across FastGPT versions or deployments (e.g., `/v1`, `/common`, `/api/common`) and was not reliably reachable.
    - *Implemented Solution*: **Local Parsing + Text Import**.
        - Backend uses `mammoth` to parse `.docx`.
        - Backend uses `pdf-parse` to parse `.pdf`.
        - Parsed text is sent to FastGPT via `POST /core/dataset/collection/create/text` (Dataset -> Import Text).
    - *Result*: Stable and reliable file ingestion regardless of underlying file storage API changes.

### Accomplishments
- [x] Initialized Monorepo structure (client/server).
- [x] Configured Express backend with `multer` for uploads.
- [x] Implemented local database (`db.json`) for metadata.
- [x] Implemented file parsing logic (Word/PDF).
- [x] Successfully connected to FastGPT Dataset API for text import.
- [x] Frontend "Solution Library" UI basics implemented.

### Pending Tasks (Roadmap)
1.  **Frontend**:
    - Improve Upload UI (Progress bars, success/error toasts).
    - Add "Delete" functionality (Remove from local DB and FastGPT).
    - Enhance "Assistant" chat interface.
2.  **Backend**:
    - Add support for Excel/CSV parsing.
    - Implement Chat API proxy (`/v1/chat/completions`).
    - Error handling refinement.
3.  **Docs**:
    - Update API documentation.

### Notes for Next Session
- Continue with **Frontend Polish** and **Chat Integration**.
- Check if `DELETE` API is needed for managing datasets.
