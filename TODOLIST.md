# Wenyan MCP Roadmap & TODOLIST

Current Version: 2.0.1
Goal: Create a stateless, secure, multi-tenant MCP server suitable for public deployment and shared usage.

## 🚀 Version 2.0.1 Objectives

Transform from a local single-user tool to a public-facing, multi-tenant SaaS-like MCP service.

### 1. Architecture: Stateless & Multi-tenant (核心架构升级)

- [ ] **Remove Global State**:
  - Deprecate dependency on server-side environment variables for `WECHAT_APP_ID` and `WECHAT_APP_SECRET`.
  - Refactor all tools to accept `wechat_app_id` and `wechat_app_secret` as arguments.
- [ ] **HTTP Stateless Mode**:
  - Implement a purely stateless handling logic where each request contains all necessary context.
  - Ensure no sensitive data is persisted on the server between requests.

### 2. File Handling Strategy (文件处理策略)

Support three distinct modes for providing content to the MCP tools:

- [ ] **Mode A: Local File Path (Legacy/Local)**
  - Keep `HOST_FILE_PATH` support for local deployments.
  - Valid only if `allow_local_files` config is enabled on server boot.
- [ ] **Mode B: Temporary File Upload (Recommended for Remote)**
  - **New API Endpoint**: `POST /upload`
    - Accepts file upload (multipart/form-data).
    - Returns a temporary `file_id` (UUID).
    - Stores file in memory/temp dir with a short TTL (e.g., 5-10 minutes).
  - **Tool Integration**: Tools accept `file_id` argument to resolve content.
- [ ] **Mode C: Direct Content Injection (Fallback)**
  - Support passing raw string/base64 content directly in tool arguments.
  - *Note*: Document token usage warning for this mode.

### 3. Security & Privacy (安全与隐私)

- [ ] **Transport Security**:
  - Enforce HTTPS for all public endpoints.
- [ ] **Token Validation Enhancement**:
  - Review current `Bearer` token implementation.
  - **Proposal**: Implement a dual-layer auth:
    1. **Gateway Auth**: `MCP_SERVER_TOKEN` to protect the server resources/bandwidth (IP allowlist or shared secret).
    2. **WeChat Auth**: Credentials passed per-request by client, validated against WeChat API directly.
- [ ] **Data Sanitization**:
  - Ensure `AppSecret` is never logged in console or access logs.
  - Auto-wipe temporary files immediately after processing or upon TTL expiry.

### 4. Implementation Plan

#### Phase 1: Interface Update
- Update `src/type.ts` to include optional `appId`, `appSecret`, `fileId`, `rawContent` in tool schemas.

#### Phase 2: Logic Refactoring
- Modify `src/index.ts` to prioritize arguments over env vars.
- Implement the `FileProvider` pattern to switch between Local/Upload/Raw.

#### Phase 3: New Endpoints
- Add `POST /v1/upload` (or similar) to the MCP server (if using express/http transport) to handle temp files.

---

## 📝 Legacy Todo (Archive)

- [x] Initial Release (v1.0.0)
- [x] Basic WeChat Article Publishing
- [x] Markdown Rendering
