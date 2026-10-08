# 🔬 PROJECT TRUTH AUDIT: GROUND-TRUTH FORENSIC TECHNICAL AUDIT
**Project Title**: Adaptive Closed-Loop Zero Trust Security Model at the API Gateway Layer Using Deception Intelligence (AZTSMDI)  
**Audit Date**: October 2026  
**Auditor**: Senior Forensic Technical Auditor & Codebase Inspector  
**Repository Path**: `d:\Major Project - AZTSMDI\Zero_Trust`  

---

> [!IMPORTANT]  
> **AUDIT MANDATE & RULES APPLIED**:  
> 1. No production code was modified, refactored, or rewritten.  
> 2. Documentation claims are **NOT** assumed to be true; all findings are derived strictly from empirical inspection of the actual source code.  
> 3. UI-only representations are explicitly distinguished from backend security enforcement.  
> 4. All secrets, passwords, and API key locations are identified without disclosing plain-text secret values.  

---

## 1. COMPLETE CODEBASE INVENTORY

### A. Frontend Files
- **`src/main.tsx`**
  - **Purpose**: React 19 application mounting entrypoint.
  - **Functions/Components**: Root mount using `createRoot(document.getElementById('root'))`.
  - **Dependencies**: `react-dom/client`, `src/App.tsx`, `src/index.css`.
  - **Dependents**: `index.html`.
- **`src/App.tsx`**
  - **Purpose**: Main UI shell and top-level navigation state orchestrator.
  - **Functions/Components**: `App()`, `handleLoginSuccess()`, `handleLogout()`.
  - **Dependencies**: `src/components/Login.tsx`, `src/components/RealDashboard.tsx`, `src/components/DeceptionDashboard.tsx`, `src/components/AdminDashboard.tsx`, `src/components/CyberRadarBackground.tsx`, `lucide-react`.
  - **Dependents**: `src/main.tsx`.
- **`src/components/Login.tsx`**
  - **Purpose**: Gateway access gate for users and SOC administrators.
  - **Functions/Components**: `Login()`, `handleSubmit()`.
  - **APIs Called**: `POST /api/auth/login`, `POST /api/auth/admin-login`.
  - **Dependencies**: `lucide-react`, `motion/react`.
  - **Dependents**: `src/App.tsx`.
- **`src/components/RealDashboard.tsx`**
  - **Purpose**: Legitimate employee intranet workspace UI.
  - **Functions/Components**: `RealDashboard()`, `loadDashboardData()`.
  - **APIs Called**: `GET /api/real/dashboard/:sessionId`.
  - **Dependencies**: `lucide-react`, `motion/react`.
  - **Dependents**: `src/App.tsx`.
- **`src/components/DeceptionDashboard.tsx`**
  - **Purpose**: Deception honeypot sandbox interface ("Aegis Root Core Console").
  - **Functions/Components**: `DeceptionDashboard()`, `silentReport()`, `handleViewFile()`, `handleFileUploadClick()`, `handleCustomFileCreate()`, `handleDownloadEmployeeCSV()`, `handleDownloadEmployeeJSON()`, `handleDownloadSingleEmployee()`, `handleAddSecret()`, `handleRevealSecret()`, `handleTerminalSubmit()`, `handleSearchSubmit()`.
  - **APIs Called**: `POST /api/deception/action/:sessionId`, `GET /api/deception/files/:sessionId`, `GET /api/deception/file/:sessionId/:fileName`, `POST /api/deception/terminal/:sessionId`.
  - **Dependencies**: `lucide-react`, `motion/react`.
  - **Dependents**: `src/App.tsx`.
- **`src/components/AdminDashboard.tsx`**
  - **Purpose**: Security Operations Center (SOC) command hub interface.
  - **Functions/Components**: `AdminDashboard()`, `renderMarkdown()`, `renderInlineFormatting()`, `handleExportPdf()`, `fetchAllData()`, `handleRegisterEmployee()`, `handleRemoveEmployee()`, `handleSimulateBrute()`, `handleSimulateCritical()`, `handleDownloadCsv()`, `handleGenerateSummary()`, `handleEndSession()`.
  - **APIs Called**: `GET /api/admin/sessions`, `GET /api/admin/alerts`, `GET /api/admin/stats`, `GET /api/admin/employees`, `POST /api/admin/employees`, `DELETE /api/admin/employees/:username`, `POST /api/admin/simulate/brute`, `POST /api/admin/simulate/critical`, `GET /api/admin/download-report/:sessionId`, `POST /api/admin/summary/:sessionId`, `POST /api/auth/logout`, `EventSource("/api/admin/events")`.
  - **Dependencies**: `src/types.ts`, `lucide-react`, `motion/react`.
  - **Dependents**: `src/App.tsx`.
- **`src/components/CyberRadarBackground.tsx`**
  - **Purpose**: Background canvas rendering animated cyber radar sweeps.
  - **Functions/Components**: `CyberRadarBackground()`.
  - **Dependencies**: `react`.
  - **Dependents**: `src/App.tsx`.
- **`src/types.ts`**
  - **Purpose**: Shared TypeScript interface definitions (`Session`, `LogEntry`, `Alert`, `DashboardStats`).
  - **Dependencies**: None.
  - **Dependents**: `server.ts`, `src/server/store.ts`, `src/server/gemini.ts`, `src/server/db.ts`, `AdminDashboard.tsx`.

### B. Backend Files
- **`server.ts`**
  - **Purpose**: Express full-stack HTTP server, API router, SSE stream broadcaster, and Vite dev server integrator.
  - **Functions/Methods**: `startServer()`, `getFilename()`, `getDirname()`.
  - **APIs Implemented**:
    - Auth: `POST /api/auth/login`, `POST /api/auth/admin-login`, `POST /api/auth/logout`, `GET /api/session/:sessionId`.
    - Real: `GET /api/real/dashboard/:sessionId`.
    - Deception: `GET /api/deception/files/:sessionId`, `GET /api/deception/file/:sessionId/:fileName`, `POST /api/deception/terminal/:sessionId`, `POST /api/deception/search/:sessionId`, `POST /api/deception/action/:sessionId`.
    - Admin: `GET /api/admin/employees`, `GET /api/admin/students`, `POST /api/admin/employees`, `POST /api/admin/students`, `DELETE /api/admin/employees/:username`, `GET /api/admin/sessions`, `GET /api/admin/alerts`, `GET /api/admin/stats`, `POST /api/admin/simulate/brute`, `POST /api/admin/simulate/critical`, `GET /api/admin/download-report/:sessionId`, `POST /api/admin/summary/:sessionId`, `GET /api/admin/events`.
    - Reverse Proxy: `ALL /api/proxy/*`.
  - **Dependencies**: `express`, `path`, `vite`, `dotenv`, `src/server/store.ts`, `src/server/gemini.ts`, `src/server/db.ts`.
  - **Dependents**: Entrypoint executed by Node/tsx.
- **`src/server/store.ts`**
  - **Purpose**: Centralized in-memory state cache, threat scoring engine, rule enforcement, and SSE connection management.
  - **Functions/Exports**: `sessions`, `alerts`, `loginFailures`, `sseClients`, `DECEPTION_FILES`, `registeredEmployees`, `addSseClient()`, `removeSseClient()`, `broadcastToAdmins()`, `createSession()`, `addLogEntry()`, `createAlert()`, `endSession()`, `getStats()`, `loadEmployeesFromDb()`, `getRegisteredEmployees()`, `registerEmployee()`, `removeEmployee()`.
  - **Dependencies**: `src/types.ts`, `src/server/db.ts`, `src/server/gemini.ts`.
  - **Dependents**: `server.ts`.

### C. Database Files
- **`src/server/db.ts`**
  - **Purpose**: MongoDB Atlas connection manager and Mongoose data models (`EmployeeModel`, `SessionModel`, `AlertModel`).
  - **Functions/Exports**: `connectMongoDB()`, `isDbConnected()`, `EmployeeModel`, `SessionModel`, `AlertModel`.
  - **Dependencies**: `dns`, `mongoose`, `src/types.ts`.
  - **Dependents**: `server.ts`, `src/server/store.ts`.
- **`test_db.js`**
  - **Purpose**: Standalone Node script testing MongoDB Atlas connection. Contains hardcoded credentials.
  - **Dependencies**: `dns`, `mongoose`.
- **`scratch_sync.js`**
  - **Purpose**: Standalone Node script modifying employee records in MongoDB Atlas. Contains hardcoded credentials.
  - **Dependencies**: `dns`, `mongoose`.

### D. AI Files
- **`src/server/gemini.ts`**
  - **Purpose**: Interfacing with `@google/genai` (Gemini API) and compiling threat analysis reports, with rule-based fallback generator.
  - **Functions/Exports**: `getGeminiClient()`, `generateRuleBasedSummary()`, `generateAttackerSummary()`.
  - **Dependencies**: `@google/genai`, `src/types.ts`.
  - **Dependents**: `server.ts`, `src/server/store.ts`.

### E. Security / Deception Files
- Deception logic is distributed across:
  - `server.ts` (`/api/auth/login` trap account handling, `/api/deception/*` mock endpoints, `/api/proxy/*` decoy interceptor).
  - `src/server/store.ts` (`DECEPTION_FILES` definition, rule-based threat scoring).
  - `src/components/DeceptionDashboard.tsx` (Client-side interactive sandbox view).

### F. Configuration Files
- **`package.json`**: NPM scripts and project dependencies.
- **`tsconfig.json`**: TypeScript compiler options (`moduleResolution: bundler`, `target: ES2022`).
- **`vite.config.ts`**: Vite configuration with `@tailwindcss/vite` and `@vitejs/plugin-react`.
- **`.env.example`**: Environment variable template (`GEMINI_API_KEY`, `APP_URL`).

### G. Test / Benchmark Files
- **NO EXECUTABLE BENCHMARK SUITE EXISTS**.
- `CASE_STUDY_REPORT.md`: Static markdown report containing hardcoded metric claims.
- `TEST_BENCHMARK_REPORT.md`: Static markdown report containing hardcoded benchmark tables.

### H. Documentation Files
- `README.md`: Project description, posture mapping, architecture notes, testing guide.
- `CASE_STUDY_REPORT.md`: Case study documentation for SVIT portal.
- `TEST_BENCHMARK_REPORT.md`: Hardcoded benchmark test report.

---

## 2. ACTUAL SYSTEM ARCHITECTURE

```
USER
  │
  ▼ [IMPLEMENTED] (HTTP POST /api/auth/login)
LOGIN 
  │
  ▼ [IMPLEMENTED] (In-memory registered array match / password string equality)
AUTHENTICATION
  │
  ▼ [IMPLEMENTED] (createSession in store.ts generates random sess_id)
SESSION CREATION
  │
  ▼ [PARTIALLY IMPLEMENTED / SIMULATED AS SINGLE EXPRESS APP]
API GATEWAY
  │
  ▼ [PARTIALLY IMPLEMENTED] (Static counter check: attempts >= 3 OR username == 'admin@corporate.sec')
THREAT EVALUATION
  │
  ▼ [IMPLEMENTED] (Returns session.status = 'Genuine' | 'Deception' in JSON response)
DECISION
  │
  ├────────────────────────────────────────┬────────────────────────────────────────┐
  ▼ [IMPLEMENTED]                          ▼ [IMPLEMENTED CLIENT-SIDE]
REAL APPLICATION                         DECEPTION ENVIRONMENT
(RealDashboard component rendered)        (DeceptionDashboard component rendered)
  │                                        │
  ▼ [NOT IMPLEMENTED FOR REAL APP]         ▼ [IMPLEMENTED] (POST /api/deception/action/*)
                                         TELEMETRY
                                           │
                                           ▼ [IMPLEMENTED] (addLogEntry in store.ts)
                                         THREAT SCORE (0 - 100)
                                           │
                                           ▼ [IMPLEMENTED] (SSE stream /api/admin/events)
                                         SOC DASHBOARD (AdminDashboard.tsx)
                                           │
                                           ▼ [PARTIALLY IMPLEMENTED] (POST /api/admin/summary/:sessionId)
                                         AI (Gemini / Heuristic Summary Report)
                                           │
                                           ▼ [NOT IMPLEMENTED] ❌ CLOSED LOOP BROKEN
                                         POLICY UPDATE
```

### Flow Breakdown & Classification:
1. **USER $\rightarrow$ LOGIN**: `IMPLEMENTED`. Standard HTML form in `Login.tsx`.
2. **LOGIN $\rightarrow$ AUTHENTICATION**: `IMPLEMENTED`. Endpoint `POST /api/auth/login` checks in-memory `registeredEmployees` array.
3. **AUTHENTICATION $\rightarrow$ SESSION CREATION**: `IMPLEMENTED`. `createSession()` creates a JavaScript object in `store.ts` with ID `'sess_' + Math.random().toString(36)...`.
4. **SESSION CREATION $\rightarrow$ API GATEWAY**: `PARTIALLY IMPLEMENTED / SIMULATED`. The single Express server `server.ts` acts as both the ingress router and application server. No independent API Gateway proxy (like Kong, Envoy, or NGINX) exists.
5. **API GATEWAY $\rightarrow$ THREAT EVALUATION**: `PARTIALLY IMPLEMENTED`. Evaluates `username === "admin@corporate.sec"` or `loginFailures[username].count >= 3`. No dynamic IP reputation, request payload inspection, or behavioral token validation occurs during gateway routing.
6. **THREAT EVALUATION $\rightarrow$ DECISION**: `IMPLEMENTED`. Sets `session.status = "Deception"` or `"Genuine"`.
7. **DECISION $\rightarrow$ REAL APPLICATION OR DECEPTION**: `IMPLEMENTED CLIENT-SIDE`. The server returns `{ status: "success", session }`. `App.tsx` evaluates `session.status === "Deception"` and chooses which React component to mount (`DeceptionDashboard` vs `RealDashboard`). **This containment is UI-ONLY**.
8. **DECEPTION $\rightarrow$ TELEMETRY**: `IMPLEMENTED`. `DeceptionDashboard.tsx` sends HTTP POST requests to `/api/deception/action/:sessionId` or `/api/deception/terminal/:sessionId`.
9. **TELEMETRY $\rightarrow$ THREAT SCORE**: `IMPLEMENTED`. `addLogEntry()` in `store.ts` increments `threatScore`.
10. **THREAT SCORE $\rightarrow$ SOC**: `IMPLEMENTED`. Server broadcasts updates via SSE (`/api/admin/events`) and polling (`/api/admin/sessions`), updating `AdminDashboard.tsx`.
11. **SOC $\rightarrow$ AI**: `PARTIALLY IMPLEMENTED`. `AdminDashboard.tsx` triggers `POST /api/admin/summary/:sessionId`. Gemini or the rule-based fallback generates a Markdown report.
12. **AI $\rightarrow$ POLICY UPDATE**: `NOT IMPLEMENTED`. The AI output is strictly plain-text Markdown displayed in the SOC UI or printed to PDF. **No code exists to parse Gemini output, convert it into security rules, or update gateway policies automatically.**

---

## 3. AUTHENTICATION AND ZERO TRUST AUDIT

| Question | Audit Result | File & Function Evidence |
| :--- | :--- | :--- |
| **Is JWT actually generated?** | ❌ **NO** | `jsonwebtoken` is NOT in `package.json`. No JWT signing function exists anywhere. |
| **Is JWT actually validated?** | ❌ **NO** | No JWT validation middleware exists. |
| **Where is the token stored?** | ⚠️ **Local Storage** | Raw session objects are stored unencrypted in `localStorage.setItem("active_security_session", ...)` in `src/App.tsx#L33`. |
| **Is token sent with API requests?** | ❌ **NO** | Requests use URL parameter `/:sessionId` or request body `{ sessionId }`. No HTTP `Authorization: Bearer <token>` header is used. |
| **Is token signature verified?** | ❌ **NO** | Session IDs are plain strings (`sess_xxxx`). No cryptographic signature exists. |
| **Is token expiry checked?** | ❌ **NO** | Sessions never expire automatically. No TTL or expiration timestamp is checked. |
| **Is token revocation implemented?** | 🟡 **PARTIAL** | `endSession(sessionId)` in `store.ts#L196` removes the session from the in-memory array. |
| **Is session authentication implemented?** | 🟡 **PARTIAL** | Session existence is checked by array lookup (`sessions.find(s => s.id === sessionId)`). |
| **Are sessions server-side or client-side?** | ⚠️ **DUAL / UNBOUND** | Stored in server memory (`store.ts`), but UI routing decisions rely entirely on client-side state in `App.tsx`. |
| **Are passwords hashed?** | ❌ **NO** | Passwords are stored in 100% plain text in `store.ts#L53` (`"password123"`). |
| **Is bcrypt/argon2/scrypt used?** | ❌ **NO** | No password hashing library is installed or used. |
| **Are admin credentials protected?** | ❌ **NO** | Hardcoded in `server.ts#L125` (`"admin"` / `"admin123"`). Any username with password `"admin123"` is granted admin access (`server.ts#L137`). |
| **Is RBAC implemented?** | 🟠 **SIMULATED / UI-ONLY** | `userRole` (`"admin"` vs `"user"`) is maintained in client state (`App.tsx#L10`). Admin API endpoints do NOT check roles. |
| **Is authorization enforced server-side?** | ❌ **NO** | `/api/admin/*` endpoints can be invoked by any unauthenticated client without headers or session tokens. |
| **Can a user call admin APIs directly?** | ⚠️ **YES** | Any HTTP client can call `GET /api/admin/sessions`, `DELETE /api/admin/employees/xxx`, or `POST /api/admin/simulate/brute`. |
| **Can a user access another user's session?** | ⚠️ **YES** | Any user can query `GET /api/session/:sessionId` or download logs via `GET /api/admin/download-report/:sessionId`. |
| **Can a user forge/change a session ID?** | ⚠️ **YES** | Session IDs follow `sess_` + 8 random base36 characters (`Math.random()`), which are easily enumerable. |
| **Is there CSRF protection?** | ❌ **NO** | No CSRF tokens or `SameSite` cookie protections exist. |
| **Is there rate limiting?** | ❌ **NO** | No express-rate-limit or gateway throttling middleware is installed. |
| **Is there brute-force protection?** | 🟠 **DECEPTIVE DIVERSION ONLY** | `loginFailures` counter triggers honeypot diversion on attempt 3, but does NOT block or lock the IP/account. |

---

## 4. API GATEWAY AUDIT

### Gateway Identification
The project does **NOT** use a dedicated API Gateway (such as NGINX, Kong, Envoy, or AWS API Gateway). The Express server in `server.ts` handles routing, business logic, static asset serving, and proxying.

### Endpoint-by-Endpoint Inspection:

```typescript
// server.ts - Inspection of routing capabilities
app.post("/api/auth/login", (req, res) => { ... })
app.all("/api/proxy/*", async (req, res) => { ... })
```

- **Which route receives incoming application requests?**
  - Standard application calls go directly to dedicated Express routes (`/api/auth/*`, `/api/deception/*`, `/api/admin/*`).
  - Target benchmark proxy calls go through `ALL /api/proxy/*` (`server.ts#L480`).
- **Does it inspect JWT?** ❌ **NO**.
- **Does it inspect user identity?** 🟡 **PARTIAL**. Reads optional `x-session-id` header or `?sessionId=` query param in `/api/proxy/*`.
- **Does it inspect role?** ❌ **NO**.
- **Does it inspect endpoint?** ❌ **NO**.
- **Does it inspect request frequency?** ❌ **NO** at gateway ingress. (Frequency scoring occurs post-facto inside `addLogEntry` when client reports actions).
- **Does it inspect payload behavior?** ❌ **NO**.
- **Does it inspect IP?** 🟡 **PARTIAL**. Captures IP for logging purposes (`req.headers["x-forwarded-for"] || req.socket.remoteAddress`), but performs no IP filtering, subnet blocking, or geolocation.
- **Does it inspect user agent?** 🟡 **PARTIAL**. Captures `User-Agent` string for logging only.
- **Does it inspect historical behavior?** ❌ **NO**.
- **Does it maintain per-session risk?** ⚠️ **YES**. `store.ts` tracks `threatScore` (0–100).
- **Does it dynamically change request decision?** 🟡 **PARTIAL**. In `/api/proxy/*`, if `session.status === "Deception"`, it returns synthetic decoy JSON instead of forwarding to `jsonplaceholder.typicode.com`.

### Routing Destination Analysis:
- **A. Genuine Application**: Rendered client-side (`RealDashboard.tsx`) when `session.status === "Genuine"`. Proxy requests to `/api/proxy/*` forward to `https://jsonplaceholder.typicode.com/*`.
- **B. Deception Environment**: Rendered client-side (`DeceptionDashboard.tsx`) when `session.status === "Deception"`. Proxy requests to `/api/proxy/*` return static decoy JSON (`DECOY_EXECUTIVE_PII`, `TRAP_ADMIN_CREDENTIAL`).

### Assessment of `/api/proxy/*`:
`/api/proxy/*` is a **demonstration proxy endpoint**, NOT a production API gateway. It forwards legitimate traffic to `jsonplaceholder.typicode.com` and intercepts deception sessions with hardcoded JSON objects.

---

## 5. THREAT SCORING ENGINE

### Complete Threat Scoring Implementation Table

| Rule Name | Trigger Condition | Points | Implementation Location | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **Initial Deception Allocation** | Session initialized with status `"Deception"` | **+50** | `src/server/store.ts#L87` | Static Base |
| **Trap Account Login** | Login with username `"admin@corporate.sec"` | **+40** | `server.ts#L88` | Static Rule |
| **Brute Force Threshold Breached** | Login failure count $\ge 3$ | **+30** | `server.ts#L106` | Static Rule |
| **Terminal Command Execution** | Execution of any SSH diagnostic command | **+25** | `server.ts#L274` | Static Rule |
| **Reveal Vault Secrets** | Execution of `env` command in terminal | **+35** | `server.ts#L298` | Static Rule |
| **Read Document Content (Sensitive)** | Viewing file marked `sensitive: true` (e.g. PEM, CSV) | **+30** | `server.ts#L331`, `store.ts#L249` | Static Rule |
| **Read Document Content (Normal)** | Viewing file marked `sensitive: false` | **+5** | `server.ts#L331`, `store.ts#L249` | Static Rule |
| **High Threat Search Query** | Search query matching `admin`, `root`, `password`, `key`, `secret`, `db`, etc. | **+15** | `server.ts#L372`, `DeceptionDashboard.tsx#L386` | Static Rule |
| **Normal Search Query** | Search query not containing high threat keywords | **+5** | `server.ts#L365` | Static Rule |
| **Generic Deception Action** | POST to `/api/deception/action/:sessionId` | **+20** (default) | `server.ts#L406` | Static Rule |
| **Proxy Access Intercepted** | Intercepted query to `/api/proxy/*` | **+25** | `server.ts#L488` | Static Rule |
| **Rapid Clicks Detection** | Time diff between consecutive logs $< 1500\text{ms}$ | **+20** | `src/server/store.ts#L124` | Dynamic Rule |
| **Out-of-Sequence Secret Access** | `Reveal Vault Secrets` action when `logs.length <= 2` | **+25** | `src/server/store.ts#L132` | Dynamic Rule |

### Engine Characteristics:
- **Starting Score**: `0` for Genuine sessions, `50` for Deception sessions (`store.ts#L87`).
- **Maximum Score**: Clamped at `100` (`store.ts#L147`).
- **Score Decay**: ❌ **NONE**. Threat score never decreases over time.
- **Score Reset**: ❌ **NONE**. Threat score cannot be reset without ending the session.
- **Time Windows**: ❌ **NONE**. No sliding time windows exist (only instantaneous point comparisons between adjacent log entries).
- **Per-User vs Per-Session Scoring**: Per-session only. Scores are tied to `sessionId` and reset when a new session starts.
- **IP-Based Scoring**: ❌ **NONE**. IP addresses are logged as strings but do not accumulate aggregate threat scores across sessions.
- **Historical Behavior**: ❌ **NONE**. Past sessions for a user do not influence the threat score of future sessions.
- **Threshold Logic**: Score $\ge 25$ triggers critical intrusion alert creation (`store.ts#L149`).
- **Score Decrease**: ❌ Impossible. `session.threatScore = Math.min(100, session.threatScore + points)`.
- **Dynamic Threshold Adaptation**: ❌ **NONE**. Thresholds are hardcoded constants (`50`, `25`, `3`, `1500ms`).

### Final Assessment:
This is a **deterministic, static rule-based scoring engine**. It is NOT an adaptive ML or AI behavioral scoring model.

---

## 6. DECEPTION SYSTEM AUDIT

### Honeypot Environment Analysis
- **Attacker Entry**: User logs in with `admin@corporate.sec` OR accumulates $\ge 3$ failed login attempts on any username (`server.ts#L85-L108`).
- **Session Isolation Level**: **C. ONLY A FRONTEND SIMULATION**.
  - The server marks `session.status = "Deception"`.
  - Client-side React (`App.tsx#L134`) renders `<DeceptionDashboard />` instead of `<RealDashboard />`.
  - If an attacker manually modifies client-side JavaScript state or local storage (`active_security_session.status = "Genuine"`), the UI will immediately render the Real Dashboard.

### Fake Assets & Decoy Resources:
- **Fake Files (`store.ts#L14-L43`)**:
  - `q3_merger_acquisition_plan.pdf` (Confidential PDF text)
  - `customer_pii_export_raw.csv` (Mock credit cards & SSNs)
  - `infrastructure_network_map.vsd` (Mock topology text)
  - `private_ssh_key_root.pem` (Mock OpenSSH private key)
- **Fake Secrets (`DeceptionDashboard.tsx#L59-L64`)**:
  - `AWS_ACCESS_KEY_ID` (`AKIAIOSFODNN7EXAMPLE`)
  - `AWS_SECRET_ACCESS_KEY` (`wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
  - `POSTGRES_MASTER_PASSWORD` (`vault_master_db_root_pass_920%`)
  - `JWT_SECRET_SIGNING_KEY` (`9a626a5be893ef10d8bbec9b26d84f886475fa3d16b`)
- **Fake Terminal Commands (`server.ts#L278-L350`)**:
  - `help`, `ls`, `dir`, `whoami`, `env`, `netstat`, `ifconfig`, `cat [file]`, `ping [host]`, `clear`, `secrets`.
- **Fake Database / PII Records (`DeceptionDashboard.tsx#L50-L55`)**:
  - 5 mock SVIT staff records with fake salaries, SSNs, and HDFC/ICICI bank account numbers.

### Safety Inspection Against Real System Resources:

| Real Resource | Attacker Input Reachable? | Evidence / Code Verification |
| :--- | :--- | :--- |
| **Real Filesystem** | ❌ **NO** | `cat` and file queries read strictly from in-memory JavaScript array `DECEPTION_FILES`. No `fs.readFile` or file path concatenation is used. |
| **Real System Shell** | ❌ **NO** | Terminal command handler uses a string `switch(cmd)` block (`server.ts#L278`). No `child_process.exec`, `spawn`, or `eval` is called. |
| **Real Database** | ❌ **NO** | Returns synthetic arrays. No SQL/NoSQL query concatenation exists. |
| **Real Network** | ❌ **NO** | `ping` command returns hardcoded ping string output (`server.ts#L339`). No socket or ICMP packet is transmitted. |
| **Real Backend Services** | ❌ **NO** | Decoy proxy returns static JSON object (`server.ts#L493`). |

### Isolation Summary:
The deception environment is **100% safe from command injection / RCE** because it is a completely synthetic mock interface. However, it provides **zero container or OS-level sandbox isolation** because no real shell or sandbox environment is provisioned.

---

## 7. BEHAVIORAL MONITORING AUDIT

### Telemetry Pipeline Trace:

```
[Attacker Action in UI]
  │ (e.g. Clicks "View File" in DeceptionDashboard.tsx#L120)
  ▼
[Frontend Event Handler]
  │ (Invokes silentReport("Triggered Document Preview", ..., 15))
  ▼
[HTTP Endpoint]
  │ (POST /api/deception/action/:sessionId or GET /api/deception/file/*)
  ▼
[Backend Handler]
  │ (server.ts calls addLogEntry(sessionId, action, details, threatPoints))
  ▼
[Log Entry Created]
  │ (Pushed to session.logs array in store.ts#L146)
  ▼
[Threat Score Calculation]
  │ (session.threatScore updated + rule checks applied in store.ts#L121-L147)
  ▼
[Alert Triggered]
  │ (createAlert() called if points >= 25; pushed to alerts array in store.ts#L176)
  ▼
[SSE Broadcast]
  │ (broadcastToAdmins("session_update", session) & ("new_alert", alert) in store.ts#L67)
  ▼
[SOC Admin Dashboard]
  │ (EventSource listener in AdminDashboard.tsx#L393 updates state in real-time)
```

### Monitoring Evaluation:
- **Client-Side vs Server-Side**: **HYBRID / CLIENT-DEPENDENT**.
  - Action telemetry relies on the client browser sending HTTP POST requests (`silentReport()` in `DeceptionDashboard.tsx`).
  - Terminal commands and file requests pass directly through server Express routes (`server.ts`).
- **Can an attacker bypass telemetry?**
  - **YES**. If an attacker uses direct API calls (e.g. via `curl`, Postman, or custom Python scripts) without executing the frontend React JavaScript, frontend UI click telemetry calls (`/api/deception/action/*`) will NOT fire.
  - However, direct calls to `/api/deception/terminal/*` or `/api/deception/file/*` are logged server-side.

---

## 8. CLOSED-LOOP ADAPTATION AUDIT

### ⚠️ THE CLOSED-LOOP FEEDBACK LOOP IS BROKEN / NOT IMPLEMENTED

```
Behavior (Attacker Actions in Shadow Zone)
   │
   ▼ [IMPLEMENTED]
Telemetry (HTTP endpoints log actions to store.ts)
   │
   ▼ [IMPLEMENTED]
Threat Detection (Static point threshold scoring)
   │
   ▼ [PARTIALLY IMPLEMENTED]
Threat Analysis (Gemini AI generates text report)
   │
   ▼ [NOT IMPLEMENTED] ❌ CRITICAL GAP
Policy Generation ───► Policy Update ───► Policy Deployment ───► Future Enforcement
```

### Detailed Evaluation Stage-by-Stage:

| Stage | Implementation Status | Responsible Code | Findings & Evidence |
| :--- | :--- | :--- | :--- |
| **1. Behavior** | ✅ **IMPLEMENTED** | `DeceptionDashboard.tsx` | Attacker clicks, terminal input, file previews. |
| **2. Telemetry** | ✅ **IMPLEMENTED** | `server.ts`, `store.ts` | Logs stored in `session.logs` array. |
| **3. Threat Detection** | ✅ **IMPLEMENTED** | `store.ts` (`addLogEntry`) | Score incremented up to 100. |
| **4. Threat Analysis** | 🟡 **PARTIALLY IMPLEMENTED** | `gemini.ts` | Generates a Markdown summary string (`generateAttackerSummary`). |
| **5. Policy Generation** | ❌ **NOT IMPLEMENTED** | None | **No policy objects or rule generation logic exists.** |
| **6. Policy Update** | ❌ **NOT IMPLEMENTED** | None | **No data structure or engine exists to store dynamic policies.** |
| **7. Policy Deployment** | ❌ **NOT IMPLEMENTED** | None | **No mechanism updates Express routes or firewall rules.** |
| **8. Future Enforcement** | ❌ **NOT IMPLEMENTED** | None | **Future login attempts by the same IP/user follow identical static rules.** |
| **9. New Behavior** | ❌ **NOT IMPLEMENTED** | None | **Feedback loop terminates at text report generation.** |

### Code Search Results for Closed-Loop Primitives:
- **`policy generation`**: 0 references in code (only present in Markdown docs).
- **`policy objects`**: 0 references in code.
- **`adaptive rules`**: 0 references in code (only static rules in `store.ts`).
- **`dynamic thresholds`**: 0 references in code.
- **`runtime policy reload`**: 0 references in code.
- **`reinforcement learning`**: 0 references in code.

### Conclusion on Closed-Loop Adaptation:
The project performs **Threat Detection & AI Reporting**, but does **NOT** perform **Closed-Loop Adaptation or Automatic Policy Enforcement**. Gemini output is purely advisory Markdown text.

---

## 9. AI / GEMINI AUDIT

### AI Pipeline Technical Trace:
- **SDK & Model Used**: `@google/genai` SDK (`gemini.ts#L1`). Uses model string `"gemini-2.5-flash"` (`gemini.ts#L115`).
- **API Key Handling**: Reads `process.env.GEMINI_API_KEY`. If key is missing or set to placeholder `"MY_GEMINI_API_KEY"`, it logs a warning and falls back to `generateRuleBasedSummary()` (`gemini.ts#L9-L12`).
- **Input Data Supplied to Prompt**:
  - `session.id`, `session.username`, `session.ip`, `session.userAgent`, `session.failedAttempts`, `session.threatScore`.
  - Chronological timeline formatted as: `[timestamp] Action: "..." - Details: "..." (Threat Score Contribution: +X)` (`gemini.ts#L85-L87`).
- **Prompt Structure**: Instructs Gemini to adopt the persona of a "Lead Zero-Trust Security Incident Analyst" and output 5 specific Markdown sections (`gemini.ts#L103-L109`).
- **Output Format**: Raw Markdown text string.
- **Is output parsed by code?** ❌ **NO**. The backend treats the response as an opaque string (`session.aiSummary = summary`).
- **Does output affect security decisions?** ❌ **NO**. The Gemini response is never evaluated by any logic block or routing rule.
- **Does output affect policies?** ❌ **NO**. No automated policy rules are generated or modified.
- **Is output only displayed to administrators?** ⚠️ **YES**. It is rendered as HTML in `AdminDashboard.tsx` or exported to PDF report.

### Classification of AI Role:
The AI implementation is **A. ADVISORY ONLY**. It functions as an automated report writer for SOC analysts. It has zero authority over access control, routing, containment, or policy configuration.

---

## 10. DATABASE / PERSISTENCE AUDIT

### MongoDB / Mongoose Implementation (`src/server/db.ts`):
- **Collections & Schemas**:
  1. `EmployeeModel` (`employees` collection): `username`, `password`, `department`, `role`, `createdAt`.
  2. `SessionModel` (`sessions` collection): `id`, `username`, `ip`, `userAgent`, `loginTime`, `status`, `threatScore`, `failedAttempts`, `generatingSummary`, `aiSummary`, `logs`.
  3. `AlertModel` (`alerts` collection): `id`, `timestamp`, `type`, `message`, `sessionId`.
- **Persistence Lifecycle**:
  - On startup: `startServer()` calls `connectMongoDB()`, followed by `loadEmployeesFromDb()` (`server.ts#L48-L49`), populating in-memory arrays from MongoDB.
  - At runtime: Asynchronous writes sync `createSession`, `addLogEntry`, `createAlert`, `registerEmployee`, and `removeEmployee` to MongoDB using `.catch()` handlers so DB failures do not crash the app.
- **Fallback Behavior**:
  - If `MONGODB_URI` is not defined or connection times out (5000ms), the system logs `"Running with fast in-memory persistence"` and operates entirely in memory (`db.ts#L57`).

### Sensitive Credentials Inspection:

> [!WARNING]  
> **Hardcoded Secrets Identified in Source Files**:

1. **`test_db.js` (Line 6)**:
   - **Variable**: `uri`
   - **Type**: Hardcoded MongoDB Atlas Connection String with username and password.
   - **Severity**: 🔴 **CRITICAL** (Hardcoded database credentials committed to version control).
2. **`scratch_sync.js` (Line 7)**:
   - **Variable**: `srvUri`
   - **Type**: Hardcoded MongoDB Atlas Connection String with username and password.
   - **Severity**: 🔴 **CRITICAL** (Hardcoded database credentials committed to version control).
3. **`src/server/db.ts` (Line 90)**:
   - **Variable**: `directUri`
   - **Type**: Hardcoded Direct MongoDB Shard Cluster Connection String with username and password.
   - **Severity**: 🔴 **CRITICAL** (Hardcoded fallback database credentials in production code).
4. **`src/server/store.ts` (Line 53-57)**:
   - **Variable**: `registeredEmployees`
   - **Type**: Hardcoded plain-text user passwords (`"password123"`).
   - **Severity**: HIGH (Plain-text user passwords in source code).
5. **`server.ts` (Line 125, 137)**:
   - **Location**: Admin Login Handler
   - **Type**: Hardcoded plain-text admin credentials (`"admin"` / `"admin123"`).
   - **Severity**: HIGH (Hardcoded admin authentication bypass).

---

## 11. ADMIN / SOC SECURITY AUDIT

### Endpoint Security Evaluation Matrix

| Endpoint | Auth Required? | Role Checked? | Session Checked? | Security Finding / Vulnerability |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/admin/employees` | ❌ No | ❌ No | ❌ No | ⚠️ **Unauthenticated Access**: Exposes all registered employee usernames and plain-text passwords to any client. |
| `POST /api/admin/employees` | ❌ No | ❌ No | ❌ No | ⚠️ **Unrestricted Account Creation**: Anyone can register new employee credentials remotely without authentication. |
| `DELETE /api/admin/employees/:username` | ❌ No | ❌ No | ❌ No | ⚠️ **Unrestricted Deletion**: Anyone can delete legitimate employee accounts from the database. |
| `GET /api/admin/sessions` | ❌ No | ❌ No | ❌ No | ⚠️ **Information Leakage**: Exposes all active user sessions, source IPs, and telemetry logs to unauthenticated callers. |
| `GET /api/admin/alerts` | ❌ No | ❌ No | ❌ No | ⚠️ **Information Leakage**: Exposes system security alerts to any client. |
| `GET /api/admin/stats` | ❌ No | ❌ No | ❌ No | ⚠️ **Unauthenticated Access**: Returns system metrics. |
| `POST /api/admin/simulate/brute` | ❌ No | ❌ No | ❌ No | ⚠️ **Unrestricted Simulation**: Anyone can inject fake botnet attacks into server memory and DB. |
| `POST /api/admin/simulate/critical` | ❌ No | ❌ No | ❌ No | ⚠️ **Unrestricted Simulation**: Anyone can inject critical security alarms. |
| `GET /api/admin/download-report/:sessionId` | ❌ No | ❌ No | ❌ No | ⚠️ **IDOR / Data Exposure**: Anyone can download CSV activity reports for any `sessionId`. |
| `POST /api/admin/summary/:sessionId` | ❌ No | ❌ No | ❌ No | ⚠️ **Resource Exhaustion / API Abuse**: Anyone can trigger server-side Gemini API calls, consuming API quota. |
| `GET /api/admin/events` | ❌ No | ❌ No | ❌ No | ⚠️ **Unauthenticated SSE Stream**: Anyone can subscribe to real-time event stream and monitor live security traffic. |

---

## 12. ATTACK SCENARIO AUDIT

### Scenario Tracing Matrix:

- **SCENARIO A: Legitimate Employee Login**
  - **Request**: `POST /api/auth/login` with `employee@company.com` / `password123`.
  - **Code Path**: `server.ts#L72-L82`. `getRegisteredEmployees()` finds match. `loginFailures` cleared.
  - **Response**: `{ status: "success", session: { status: "Genuine", threatScore: 0 } }`.
  - **Logging & Score**: Initial log `Session Initiated` (+0 points). Info alert created.
  - **SOC Visibility**: Green session card spawned in `AdminDashboard.tsx`.
  - **AI Analysis**: Rule-based or Gemini summary evaluates intent as clean/genuine.

- **SCENARIO B: Seeded Trap Account Login**
  - **Request**: `POST /api/auth/login` with `admin@corporate.sec` / `any_password`.
  - **Code Path**: `server.ts#L85-L90`. Matches trap credential rule.
  - **Response**: `{ status: "success", session: { status: "Deception", threatScore: 50 } }`.
  - **Logging & Score**: Log `Trap Account Trigger` (+40 points). Threat score starts at 50. Critical alert created.
  - **SOC Visibility**: Blinking orange/red session card spawned via SSE.
  - **AI Analysis**: Flags trap account credential leak.

- **SCENARIO C: Three Failed Login Attempts**
  - **Request**: `POST /api/auth/login` with `attacker@recon.net` / `wrongpass` (3 times).
  - **Code Path**: `server.ts#L93-L116`. Attempts 1 & 2 return `401 Unauthorized`. Attempt 3 triggers failure threshold ($\ge 3$).
  - **Response**: Attempt 3 returns `{ status: "success", session: { status: "Deception", threatScore: 50 } }`.
  - **Logging & Score**: Log `Brute Force Threshold Breached` (+30 points). Critical alert created.
  - **SOC Visibility**: Rerouted session appears in Admin Dashboard.

- **SCENARIO D: Sensitive File Access**
  - **Request**: Click `private_ssh_key_root.pem` in `DeceptionDashboard.tsx`.
  - **Code Path**: `GET /api/deception/file/:sessionId/private_ssh_key_root.pem` $\rightarrow$ `server.ts#L236`.
  - **Response**: File content returned to UI.
  - **Logging & Score**: Log `Viewed Document` (+30 threat points). Threat score updated. SSE event emitted.

- **SCENARIO E: Terminal Command Execution**
  - **Request**: Type `env` in SSH terminal shell in `DeceptionDashboard.tsx`.
  - **Code Path**: `POST /api/deception/terminal/:sessionId` with `{ command: "env" }` $\rightarrow$ `server.ts#L297`.
  - **Response**: Returns fake AWS/PostgreSQL secrets text.
  - **Logging & Score**: Log `Revealed Vault Secrets` (+35 threat points). Critical alert emitted to SSE.

- **SCENARIO F: Rapid Automated Interaction**
  - **Request**: Two consecutive clicks $< 1500\text{ms}$ apart.
  - **Code Path**: Handled in `store.ts#L124` inside `addLogEntry()`.
  - **Response**: Action processed normally in UI.
  - **Logging & Score**: Log appended with `[ALGORITHM DETECTION: Rapid automated navigation pattern detected (+20 threat)]`.

- **SCENARIO G: High-Risk Search**
  - **Request**: Search `password` in `DeceptionDashboard.tsx`.
  - **Code Path**: `POST /api/deception/search/:sessionId` $\rightarrow$ `server.ts#L356`.
  - **Response**: Synthetic search matches returned.
  - **Logging & Score**: Log `Search Console Query` (+15 points).

- **SCENARIO H: Attacker Accessing `/api/proxy/*`**
  - **Request**: `GET /api/proxy/users` with header `x-session-id: <deception_sess_id>`.
  - **Code Path**: `server.ts#L480-L521`.
  - **Response**: Returns synthetic decoy JSON (`DECOY_EXECUTIVE_PII`). Logged with +25 points.

---

## 13. BENCHMARK / EXPERIMENT VALIDITY AUDIT

### Audit Questions & Empirical Findings:

1. **Is there actual executable benchmark code?**  
   ❌ **NO**. Search across the entire repository revealed zero test harnesses, benchmarking scripts, or load generators.
2. **Where are the measurements generated?**  
   ⚠️ They are **hardcoded text strings** inside `TEST_BENCHMARK_REPORT.md`, `CASE_STUDY_REPORT.md`, and directly embedded in `AdminDashboard.tsx#L1356`.
3. **Are the 1,000 transactions actually executed?**  
   ❌ **NO**. No script or test file executes 1,000 synthetic transactions.
4. **Is there a ground-truth labelled dataset?**  
   ❌ **NO**. No dataset file (CSV/JSON) exists in the codebase.
5. **How were TP/FP/TN/FN determined?**  
   ❌ **UNVERIFIABLE FROM CODE**. They are non-executable documentation assertions.
6. **How were precision/recall/F1 calculated?**  
   ❌ **UNVERIFIABLE FROM CODE**.
7. **How was latency measured?**  
   ❌ **UNVERIFIABLE FROM CODE**. No performance timing hooks or latency benchmarks exist.
8. **How was throughput measured?**  
   ❌ **UNVERIFIABLE FROM CODE**.
9. **Is policy generation actually implemented?**  
   ❌ **NO**.
10. **Is policy adaptation actually implemented?**  
    ❌ **NO**.
11. **Are the reported numbers reproducible from the repository?**  
    ❌ **NO**. Running `npm test` or searching for benchmark scripts yields no executable test code.

### Metric Classification Table:

| Metric Claimed in Docs | Reported Value | Audit Classification | Evidence / Rationale |
| :--- | :--- | :--- | :--- |
| **Detection Accuracy** | 98.4% | 📄 **DOCUMENTATION CLAIM ONLY** | Hardcoded string in `TEST_BENCHMARK_REPORT.md#L15` & `AdminDashboard.tsx#L1356`. |
| **Precision** | 96.8% | 📄 **DOCUMENTATION CLAIM ONLY** | Hardcoded string in documentation and UI code. |
| **Recall (Sensitivity)** | 97.2% | 📄 **DOCUMENTATION CLAIM ONLY** | Hardcoded string in documentation and UI code. |
| **F1 Score** | 97.0% | 📄 **DOCUMENTATION CLAIM ONLY** | Hardcoded string in documentation and UI code. |
| **Gateway Latency (+2.4ms)** | +2.4 ms | 📄 **DOCUMENTATION CLAIM ONLY** | No latency measurement code exists. |
| **Attack Containment Rate** | 100% | 📄 **DOCUMENTATION CLAIM ONLY** | UI-only component rendering; not an enforced gateway sandbox. |
| **Attack Detection Time** | 0.38 s | 📄 **DOCUMENTATION CLAIM ONLY** | Hardcoded string in documentation. |
| **Policy Generation Time** | 1.84 s | 📄 **DOCUMENTATION CLAIM ONLY** | Policy generation is not implemented in code. |
| **Policy Adaptation Time** | 0.22 s | 📄 **DOCUMENTATION CLAIM ONLY** | Policy adaptation is not implemented in code. |

---

## 14. SECURITY VULNERABILITY AUDIT

| Vulnerability ID | Severity | File & Location | Vulnerability Description | Remediation Required |
| :--- | :--- | :--- | :--- | :--- |
| **VULN-01** | 🔴 **CRITICAL** | `test_db.js#L6`, `scratch_sync.js#L7`, `src/server/db.ts#L90` | **Hardcoded Database Credentials**: Production MongoDB Atlas connection strings containing plain-text passwords committed to code. | Remove hardcoded URIs immediately; store exclusively in environment variables (`.env`). Rotate DB passwords. |
| **VULN-02** | 🔴 **CRITICAL** | `server.ts#L416-L476` | **Unauthenticated Administrative Endpoints**: All `/api/admin/*` endpoints lack authentication and authorization checks. Anyone can read sessions, create/delete accounts, or trigger alarms. | Implement authentication middleware verifying JWT/session token and `admin` role on all `/api/admin/*` routes. |
| **VULN-03** | 🔴 **CRITICAL** | `server.ts#L125-L147` | **Bypassable Admin Authentication**: Admin login accepts any username if password is `"admin123"`. Default admin username `"admin"` uses password `"admin123"`. | Remove hardcoded admin bypass logic; hash admin credentials using `bcrypt` and store in secure DB. |
| **VULN-04** | HIGH | `src/server/store.ts#L53-L57` | **Plain-text Password Storage**: Registered user passwords are stored in plain text without hashing. | Hash all user passwords using `bcrypt` or `argon2` with salt before storing. |
| **VULN-05** | HIGH | `src/App.tsx#L134-L138` | **Client-Side Security Containment Bypass**: Deception isolation relies entirely on client React state (`session.status === "Deception"`). A user can modify local storage or React props to bypass honeypot UI and view Real Dashboard. | Enforce containment on the server side by scoping API response payloads based on session status. |
| **VULN-06** | HIGH | `server.ts#L162`, `server.ts#L567` | **Insecure Direct Object Reference (IDOR)**: `GET /api/session/:sessionId` and `/api/admin/download-report/:sessionId` allow any user to read/download another user's session data. | Validate that the requesting user owns the session or possesses valid SOC Admin authorization. |
| **VULN-07** | MEDIUM | `server.ts#L1-L654` | **Missing Rate Limiting / DoS Risk**: No rate limiting middleware exists. Attackers can flood login or AI summary endpoints (`/api/admin/summary/*`), exhausting Gemini API quota. | Add `express-rate-limit` middleware to all authentication and AI summary endpoints. |
| **VULN-08** | MEDIUM | `server.ts#L80-L100` | **Predictable Session IDs**: Session IDs generated via `Math.random().toString(36)` are non-cryptographic and enumerable. | Use `crypto.randomUUID()` or `crypto.randomBytes(32)` for session generation. |
| **VULN-09** | MEDIUM | `server.ts#L1-L654` | **Missing CSRF / CORS Security**: Server sets no CORS origin restrictions or CSRF token checks. | Configure `cors` middleware with explicit origin whitelist and implement CSRF tokens. |

---

## 15. PROJECT CLAIMS VS ACTUAL IMPLEMENTATION

| Claimed Feature / Module | Actual Codebase Implementation | Status | Evidence / Code References |
| :--- | :--- | :--- | :--- |
| **Zero Trust Architecture** | Session status evaluated at login; no continuous JWT/token re-verification per API call. | 🟡 **PARTIAL** | Static check at login in `server.ts#L61`. No middleware re-verifies tokens on subsequent requests. |
| **JWT Token Validation** | No JWT library, token signing, or signature verification exists in the codebase. | ❌ **NOT IMPLEMENTED** | `package.json` lacks `jsonwebtoken`. Session IDs are plain strings (`sess_xxx`). |
| **Continuous Verification** | Telemetry logs actions post-auth, but access rights are not dynamically re-checked per request. | 🟡 **PARTIAL** | `addLogEntry()` in `store.ts` logs actions, but does not alter active HTTP route permissions. |
| **Adaptive Policy Engine** | Static counter check (`failures >= 3`) and static trap username string comparison (`"admin@corporate.sec"`). | 🟠 **SIMULATED** | `server.ts#L85-L98`. Rules are static `if` statements; no dynamic policy generation engine. |
| **Real-time Behavioral Monitoring** | Client sends telemetry packets (`/api/deception/action/*`); server updates in-memory logs and broadcasts via SSE. | ✅ **IMPLEMENTED** | `DeceptionDashboard.tsx#L84`, `store.ts#L113`, `server.ts#L610` (SSE stream). |
| **Threat Scoring Engine** | In-memory function `addLogEntry()` increments points up to 100 based on static rules. | ✅ **IMPLEMENTED** | `src/server/store.ts#L113-L173`. Rules operate deterministically. |
| **Deception Intelligence / Honeypot** | Hyper-realistic React component (`DeceptionDashboard.tsx`) with mock SSH terminal, fake files, and decoy proxy. | 🟠 **SIMULATED (UI-ONLY)** | Client React component handles rendering. No OS/container-level sandbox isolation exists. |
| **Closed-Loop Adaptation** | Feedback loop breaks after Threat Analysis report generation. No automatic policy update code exists. | ❌ **NOT IMPLEMENTED** | No code exists for policy creation, policy objects, or gateway rule reload. |
| **AI Threat Analysis** | `@google/genai` queries Gemini API to generate structured Markdown summaries (with local rule fallback). | ✅ **IMPLEMENTED** | `src/server/gemini.ts#L79-L137`. Advisory Markdown generation works as intended. |
| **Automatic Policy Generation** | Gemini output is text Markdown; no parser converts AI recommendations into firewall or gateway rules. | ❌ **NOT IMPLEMENTED** | `gemini.ts` returns raw string. No policy generation module exists. |
| **Automatic Policy Deployment** | No mechanism updates Express routes, firewall rules, or gateway filters dynamically at runtime. | ❌ **NOT IMPLEMENTED** | 0 references to dynamic policy reload in backend code. |
| **API Gateway Microservice** | Single Express application serving both frontend, API endpoints, and mock proxy (`/api/proxy/*`). | 🟠 **SIMULATED** | `server.ts`. No independent API Gateway proxy (Kong/Envoy) microservice. |
| **Real-Time SOC Dashboard** | React dashboard receiving live event streams via SSE (`EventSource`) with real-time UI updates. | ✅ **IMPLEMENTED** | `AdminDashboard.tsx#L390-L429`. SSE connection works seamlessly. |
| **MongoDB Cloud Persistence** | Mongoose schemas sync sessions, alerts, and employees with MongoDB Atlas (with in-memory fallback). | ✅ **IMPLEMENTED** | `src/server/db.ts`, `src/server/store.ts`. |
| **Attack Containment Rate (100%)** | Deception dashboard displays mock files, but containment is enforced only by client-side component selection. | 🟠 **SIMULATED** | UI-based containment only. Client state manipulation bypasses honeypot routing. |

---

## 16. CURRENT PROJECT MATURITY

### Overall Classification:
**`RESEARCH PROTOTYPE / DEMONSTRATION PROTOTYPE`**  
*(Not Production-Ready)*

### Independent Sub-Category Evaluation:

1. **Architecture (`6.0/10`)**: Clean React + Express full-stack structure with SSE, but lacks dedicated API gateway separation.
2. **Zero Trust Implementation (`3.5/10`)**: Operates on perimeter login classification rather than continuous token-level verification.
3. **Authentication (`2.0/10`)**: Plain-text passwords, no JWTs, hardcoded admin credentials (`"admin123"`).
4. **Authorization (`1.5/10`)**: Admin APIs (`/api/admin/*`) are completely unauthenticated and unprotected.
5. **Threat Detection (`7.0/10`)**: Effective static rule scoring (rapid clicks, secret views, trap accounts).
6. **Behavioral Analysis (`6.5/10`)**: Logs user action timelines and detects rapid clicks successfully.
7. **Deception System (`7.5/10`)**: Hyper-realistic, visually impressive client honeypot and SSH shell simulation, though UI-bound.
8. **AI Integration (`7.0/10`)**: Clean `@google/genai` integration with robust rule-based fallback generator.
9. **Closed-Loop Adaptation (`0.0/10`)**: **Completely missing**. Feedback loop terminates at text report generation.
10. **Database & Persistence (`6.5/10`)**: Good Mongoose implementation with in-memory fallback, but contains hardcoded credentials.
11. **SOC Dashboard (`8.5/10`)**: Excellent UI design, real-time SSE stream, PDF export, and alert feeds.
12. **Security Hardening (`1.5/10`)**: Hardcoded DB secrets, plain-text passwords, missing rate limits, IDOR vulnerabilities.
13. **Testing Framework (`0.0/10`)**: No executable unit, integration, or benchmark tests exist in code.
14. **Research / Demo Quality (`8.0/10`)**: Exceptional visual demonstration tool for academic showcases and concept proofs.

---

## 17. WHAT IS ACTUALLY NOVEL?

### Actual Implemented Novelty:
1. **Silent Deceptive Rerouting on Login Threshold Breach**: Instead of locking out brute-force attackers, the system silently redirects them into a high-fidelity deception dashboard without raising security alarms in the attacker's client.
2. **Real-Time SSE Telemetry & In-Memory Threat Scoring**: Instantaneous, zero-latency streaming of sandboxed intruder timeline events to a SOC dashboard via native Server-Sent Events.
3. **Hybrid AI & Heuristic Forensic Reporting Pipeline**: Automatic generation of plain-English security intent summaries using Gemini AI, with seamless local rule fallback when API keys are absent.

### Intended (Unimplemented) Future Novelty:
1. *Closed-Loop Automated Policy Generation & Deployment*: Autonomous translation of AI threat analysis into active API gateway firewall rules.
2. *Continuous Post-Authentication JWT Verification*: Per-request cryptographic re-evaluation of user trust scores at the gateway proxy layer.

---

## 18. RECOMMENDED NEXT DEVELOPMENT PHASES

```
Phase 1: Hardening & Credentials Cleanup ──► Phase 2: Authentic JWT & RBAC ──► Phase 3: True Gateway Middleware
                                                                                       │
Phase 6: Executable Benchmark Suite ◄── Phase 5: Closed-Loop Policy Engine ◄── Phase 4: Server-Side Deception Isolation
```

### Phase 1 — Authentication & Credentials Hardening
- **Objective**: Eliminate hardcoded secrets, hash passwords, and protect admin routes.
- **Files Affected**: `server.ts`, `src/server/db.ts`, `src/server/store.ts`, `test_db.js`, `scratch_sync.js`.
- **Dependencies**: Install `bcryptjs`.
- **Expected Outcome**: Passwords stored as bcrypt hashes; hardcoded DB strings removed; `/api/admin/*` protected by authentication.
- **Verification**: Run `grep_search` to verify 0 hardcoded DB passwords; test unauthenticated calls to `/api/admin/sessions` (should return 401).

### Phase 2 — Real JWT Authentication & RBAC
- **Objective**: Replace string session IDs with signed JSON Web Tokens (JWT).
- **Files Affected**: `server.ts`, `src/components/Login.tsx`, `src/App.tsx`.
- **Dependencies**: Install `jsonwebtoken`, `@types/jsonwebtoken`.
- **Expected Outcome**: Login issues cryptographically signed JWTs containing user ID, role, and session state.
- **Verification**: Verify `Authorization: Bearer <token>` header on all requests; test signature verification and expiration.

### Phase 3 — API Gateway Middleware & Continuous Verification
- **Objective**: Build explicit Express gateway middleware inspecting every incoming request.
- **Files Affected**: `server.ts`.
- **Dependencies**: None.
- **Expected Outcome**: Middleware extracts JWT, verifies threat score, and decides per-request routing (Allow, Block, or Redirect to Deception).
- **Verification**: Send valid request with hijacked token $\rightarrow$ verify middleware dynamically intercepts request.

### Phase 4 — Server-Side Deception Isolation
- **Objective**: Enforce honeypot routing server-side so UI state cannot be tampered with.
- **Files Affected**: `server.ts`, `src/App.tsx`.
- **Dependencies**: None.
- **Expected Outcome**: When `session.status === "Deception"`, server API endpoints return ONLY deceptive data regardless of frontend component state.
- **Verification**: Manually edit `localStorage` in browser $\rightarrow$ verify API endpoints still return honeypot responses.

### Phase 5 — Closed-Loop Policy Generation & Deployment Engine
- **Objective**: Complete the closed loop by parsing Gemini AI outputs into active gateway policy objects.
- **Files Affected**: `src/server/gemini.ts`, `src/server/store.ts`, `server.ts`.
- **Dependencies**: Structured JSON output mode for Gemini.
- **Expected Outcome**: Gemini generates structured policy JSON (e.g. `{ action: "BLOCK_IP", target: "185.220.101.5", duration: 3600 }`), which `store.ts` automatically deploys into active gateway memory.
- **Verification**: Trigger bot attack $\rightarrow$ verify Gemini generates policy $\rightarrow$ verify gateway automatically blocks IP on subsequent requests.

### Phase 6 — Executable Benchmark & Evaluation Harness
- **Objective**: Create real executable test scripts to generate empirical accuracy, latency, and throughput numbers.
- **Files Affected**: Create `tests/benchmark.ts` or `tests/load_test.js`.
- **Dependencies**: `autocannon` or `k6` for load testing.
- **Expected Outcome**: Script executes 1,000 requests, measures true baseline vs gateway latency, and computes real Precision, Recall, and F1 scores.
- **Verification**: Run `npm test` $\rightarrow$ outputs real, verifiable performance metrics.

---

## 19. FINAL EXECUTIVE SUMMARY

### A. What the Project REALLY Is Today
The project is a **highly sophisticated, visually stunning Research Prototype and Interactive Demonstration System**. It successfully demonstrates a Zero-Trust login gateway that silently redirects suspicious logins into a hyper-realistic React honeypot dashboard, logs intruder activity in real-time to a SOC console via SSE, and generates AI threat reports using Gemini.

### B. What Is Already Strong
- **User Interface & SOC Experience**: Industry-grade design with dark glassmorphism, animated radar sweeps, live alert feeds, and PDF export capabilities.
- **Honeypot Interactivity**: Realistic decoy files, AWS credentials table, and an interactive diagnostic SSH shell.
- **Real-Time Telemetry**: Seamless Server-Sent Events (SSE) streaming updates SOC dashboards instantly.
- **AI Forensic Pipeline**: Clean `@google/genai` integration with automatic fallback to deterministic heuristic summaries.

### C. What Is Missing
- **Closed-Loop Policy Engine**: No code exists to turn AI recommendations into active gateway security rules.
- **JWT & Token Security**: No JWT tokens, signature verification, or password hashing libraries are used.
- **Server-Side Admin Protection**: Admin API endpoints (`/api/admin/*`) are open to unauthenticated access.
- **Executable Benchmarks**: Reported accuracy (98.4%) and latency (+2.4ms) metrics are hardcoded markdown text.

### D. What Is Only Simulated
- **API Gateway**: Represented by standard Express routes and a mock proxy endpoint (`/api/proxy/*`).
- **Honeypot Isolation**: Represented by client-side React component selection (`App.tsx`), not server-side network or container isolation.
- **Attacker Containment**: UI-based visual containment.

### E. Critical Security Problems
1. Plain-text passwords stored in memory and source files.
2. Hardcoded MongoDB Atlas connection strings in `test_db.js`, `scratch_sync.js`, and `db.ts`.
3. Unprotected administrative REST endpoints (`/api/admin/*`).
4. Hardcoded admin login bypass (`"admin123"`).

### F. What Must NOT Be Claimed in Academic Reports Yet
- Do **NOT** claim that the system has a "Closed-Loop Automated Policy Update Engine" (the feedback loop stops at text generation).
- Do **NOT** claim that JWT token validation is active.
- Do **NOT** present the benchmark metrics (98.4% accuracy, +2.4ms latency) as empirical measurements unless the executable benchmark harness (Phase 6) is implemented and run.

### G. What Needs to Be Implemented to Achieve the Architecture Diagram
1. Implement server-side JWT verification middleware on every request.
2. Build a JSON policy parser in `gemini.ts` to convert AI output into executable policy objects.
3. Build a dynamic policy enforcement store in `store.ts` that applies deployed policy rules to the API gateway.

### H. Recommended Next 5 Development Steps
1. Move MongoDB connection strings to `.env` and remove hardcoded secrets.
2. Hash user passwords with `bcrypt` and remove the `"admin123"` hardcoded admin bypass.
3. Add authentication/authorization middleware to all `/api/admin/*` endpoints.
4. Implement structured JSON policy generation in `gemini.ts` and deploy policies into `store.ts`.
5. Write an executable benchmark script (`tests/benchmark.ts`) to calculate real accuracy and latency metrics.

---
*End of Forensic Audit Report.*
