# AZTSMDI REAL DEPLOYMENT READINESS DOCUMENTATION

**Project Title:** Adaptive Closed-Loop Zero Trust Security Model at the API Gateway Layer Using Deception Intelligence (AZTSMDI)  
**Document Version:** 1.0.0 (Pre-Deployment Release Candidate)  
**Date:** October 8, 2026  
**Status:** Pre-Deployment Verified (Local Engine Validated; Ready for GitHub + MongoDB Atlas + Vercel Deployment)

---

## DEPLOYMENT STATUS SUMMARY

| Deployment Stage | Status | Details |
| :--- | :--- | :--- |
| **A. Locally Verified** | **COMPLETE (100%)** | Local engine builds, bcrypt auth, multi-device polling `/api/admin/events-poll`, and 7 smoke tests verified locally. |
| **B. Ready for Deployment** | **READY** | Code sanitized, `.env.example` prepared, `vercel.json` configured, production fail-loud DB checks enforced. |
| **C. Cloud Deployment** | **PENDING** | Cloud deployment to GitHub, MongoDB Atlas cluster connection, and Vercel cloud hosting are pending initial push by operator. |

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

The Adaptive Closed-Loop Zero Trust Security Model at the API Gateway Layer Using Deception Intelligence (AZTSMDI) architecture operates as an inline, adaptive security proxy at the API Gateway layer. It sits between incoming user/client HTTP traffic and internal backend services, performing real-time identity verification, behavioral telemetry tracking, and dynamic honeypot diversion.

```
                              ┌─────────────────────────────┐
                              │    Incoming HTTP Traffic    │
                              └──────────────┬──────────────┘
                                             │
                                  ┌──────────▼──────────┐
                                  │  AZTSMDI API Gateway │
                                  │   Security Proxy    │
                                  └──────────┬──────────┘
                                             │
                   ┌─────────────────────────┴─────────────────────────┐
                   │                                                   │
        ┌──────────▼──────────┐                             ┌──────────▼──────────┐
        │  Genuine Pipeline   │                             │ Deception Pipeline  │
        │  - Valid Auth       │                             │  - 3x Failed Logins │
        │  - Threat Score < 60│                             │  - Unknown Users    │
        │  - Real Intranet DB │                             │  - Decoy Assets     │
        └──────────┬──────────┘                             └──────────┬──────────┘
                   │                                                   │
                   │               ┌───────────────────┐               │
                   └──────────────►│ MongoDB Atlas /   │◄──────────────┘
                                   │  Persistent DB    │
                                   └─────────┬─────────┘
                                             │
                                   ┌─────────▼─────────┐
                                   │ SOC Control Loop  │
                                   │ Real-time SSE +   │
                                   │ 2.0s HTTP Polling │
                                   └───────────────────┘
```

### Pipelines & Flow
1. **Genuine User Pipeline:**
   - Authenticated employees (backed by MongoDB `UserModel` and `bcryptjs` password hash validation) are routed to genuine intranet services (projects, system postures, tasks).
   - Identity context is tracked per session with continuous risk evaluation.
2. **Deception Pipeline (Shadow Zone):**
   - Triggered automatically when an unauthenticated actor fails 3 consecutive login attempts with an unknown or incorrect user account context.
   - The Gateway transparently redirects the connection to an isolated Deception Shadow Service without returning HTTP 401/403 errors to the attacker.
3. **SOC Control Loop:**
   - Admin Security Operations Center (SOC) receives dual-channel live telemetry:
     - **Server-Sent Events (SSE):** Push notifications for immediate low-latency updates on single-instance server setups.
     - **HTTP Polling (`GET /api/admin/events-poll`):** High-reliability 2.0-second state synchronization reading persistent MongoDB state for serverless, multi-instance environments (Vercel Functions).

---

## 2. MONGODB SCHEMA DEFINITIONS

MongoDB Atlas serves as the single authoritative source of truth for persistent users, sessions, telemetry logs, and SOC alerts in production. In production (`NODE_ENV === 'production'`), silent fallback to process memory is strictly disabled; missing `MONGODB_URI` causes an immediate startup error.

### 2.1 User Model (`UserModel`)
```typescript
interface IUser {
  id: string;               // Unique string ID (e.g. 'usr_3baad5d71882')
  username: string;         // Normalized email address (indexed, unique)
  passwordHash: string;     // Bcrypt hash (salt rounds: 10)
  displayName?: string;     // Full name or display identifier
  department?: string;      // Organization department (Finance, Engineering, etc.)
  role: 'ADMIN' | 'EMPLOYEE'; // Role RBAC classification
  active: boolean;          // Active status flag
  createdAt: string;        // ISO 8601 timestamp
  updatedAt: string;        // ISO 8601 timestamp
}
```

### 2.2 Session Model (`SessionModel`)
```typescript
interface ISession {
  id: string;               // Session UUID (crypto.randomUUID)
  username: string;         // Associated user or targeted email
  ip: string;               // Client IP address
  userAgent: string;        // Client User-Agent string
  loginTime: string;        // Session creation timestamp
  status: 'Genuine' | 'Deception' | 'Isolated'; // Adaptive session state
  threatScore: number;      // Calculated risk score (0 - 100)
  failedAttempts: number;   // Consecutive failed authentication counter
  userId?: string;          // Linked user ID if authenticated
  aiSummary?: string;       // Generated Gemini LLM threat synthesis report
  generatingSummary?: boolean; // Async report generation indicator
  logs: LogEntry[];         // Array of captured telemetry events
}
```

### 2.3 Alert Model (`AlertModel`)
```typescript
interface IAlert {
  id: string;               // Alert ID
  type: 'info' | 'warning' | 'critical'; // Severity tier
  message: string;          // Human-readable incident summary
  timestamp: string;        // Creation ISO timestamp
  source: string;           // Subsystem trigger origin
}
```

---

## 3. AUTHENTICATION SYSTEM SPECIFICATION

All plain-text credentials, demo passwords, and hardcoded admin bypasses (`admin123`) have been purged from the engine.

- **Password Hashing:** Implemented via `bcryptjs` with 10 salt rounds.
- **Admin Authorization Middleware (`requireAdmin`):**
  ```typescript
  export async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    // Strictly verifies session role === "ADMIN" or MongoDB UserModel role === "ADMIN"
    ...
  }
  ```
- **Login Workflows:**
  - **Employee Login (`POST /api/auth/login`):** Validates normalized email and hashed password against MongoDB.
  - **Admin Login (`POST /api/auth/admin-login`):** Validates SOC Admin credentials against environment configuration (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` / `ADMIN_PASSWORD`) or persistent DB Admin record.

---

## 4. DECEPTION TRIGGER LOGIC

The Gateway enforces a runtime behavioral deception diversion policy:

1. **Brute Force Threshold (3 Failed Attempts):**
   - When an IP/username context fails 3 consecutive authentication attempts with unknown or incorrect credentials, the session state transitions to `Deception`.
   - The Gateway responds with HTTP 200 OK and returns a deception session token, seamlessly presenting synthetic environment dashboards.
2. **Transparent Proxying:**
   - Zero HTTP 4xx error codes returned to attackers after threshold breach, delaying awareness of security interception.

---

## 5. THREAT SCORING ENGINE DETAILS

AZTSMDI dynamically accumulates risk points based on client behavior within the Deception Shadow Service:

| Action / Event | Risk Points | Severity Category | Description |
| :--- | :--- | :--- | :--- |
| **Failed Authentication** | +15 pts | Low | Repeated invalid credential submission |
| **Directory Reconnaissance** | +10 pts | Low | Listing decoy file catalog |
| **Standard Decoy File Access** | +15 pts | Medium | Opening non-sensitive document |
| **Sensitive Decoy File Access** | +30 pts | High | Accessing PII CSV / financial merger PDF |
| **Canary Shell Command Execution** | +25 pts | High | Executing terminal commands (`ls`, `whoami`) |
| **Secret & Vault Harvesting** | +35 pts | Critical | Running `env` command to read synthetic API keys |
| **Automated Quarantine Threshold** | **100 pts** | **ISOLATED** | Session locked out; critical alert dispatched to SOC |

---

## 6. ADMIN SOC DASHBOARD IMPLEMENTATION

The Admin SOC Dashboard (`src/components/AdminDashboard.tsx`) provides continuous oversight:

- **Dual-Channel Synchronization:**
  - Standard SSE connection (`/api/admin/events`) for low-latency push updates.
  - Serverless HTTP Polling (`/api/admin/events-poll`) every 2.0s with `x-session-id` header authentication for multi-device Vercel deployments.
- **SOC Controls:**
  - Real-time threat score graphs and active session tables.
  - One-click trigger for Gemini AI threat intelligence summary.
  - Infiltration simulation buttons for SOC operator testing.

---

## 7. AI THREAT ANALYSIS INTEGRATION

- **Gemini 2.5 Flash Integration (`src/server/gemini.ts`):**
  - Sends session telemetry logs to `@google/genai` model `gemini-2.5-flash`.
  - Generates executive attacker profile, threat classification, intent analysis, and recommended mitigation actions.
- **Rule-Based Fallback Summary Engine:**
  - Automatically engages if `GEMINI_API_KEY` is omitted or quota is exceeded.
  - Produces structured threat analysis reports locally without failing request execution.

---

## 8. VERCEL & PRODUCTION MULTI-DEVICE DEPLOYMENT

The codebase is packaged for serverless deployment:

### `vercel.json` Setup
```json
{
  "version": 2,
  "builds": [
    { "src": "server.ts", "use": "@vercel/node" },
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "server.ts" },
    { "src": "/(.*)", "dest": "/dist/$1" }
  ]
}
```

---

## 9. SECURITY HARDENING & BEST PRACTICES

- **Helmet Security Headers:** Protection against XSS, clickjacking, and MIME sniffing (`helmet()`).
- **No Plaintext Passwords:** All stored passwords use 10-round bcrypt hashes.
- **Input Sanitization:** Normalized lowercasing and whitespace trimming on all email inputs.
- **Admin Endpoint Protection:** Server-side `requireAdmin` middleware enforced across all `/api/admin/*` routes.

---

## 10. ILLUSTRATIVE METRIC CLAIM CLARIFICATION

All performance tables in academic reports (`CASE_STUDY_REPORT.md` and `TEST_BENCHMARK_REPORT.md`) explicitly state:
> **Notice:** Metrics represent an **Illustrative / Planned Evaluation Framework — Evaluation Pending Executable Benchmark**.

---

## 11. STEP-BY-STEP PRODUCTION DEPLOYMENT GUIDE

1. **MongoDB Atlas Setup:**
   - Create a MongoDB Atlas cluster.
   - Obtain connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/aztsmdi?retryWrites=true&w=majority`.
2. **Configure Environment Variables:**
   - Copy `.env.example` to `.env`.
   - Set `MONGODB_URI`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, and optional `GEMINI_API_KEY`.
3. **Build Application:**
   ```bash
   npm run build
   ```
4. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

---

## 12. COMPREHENSIVE LOCAL VERIFICATION LOG

All 7 production smoke tests were executed locally against the development engine (`http://localhost:3005`):

| Test # | Smoke Test Scenario | Status | HTTP Code | Key Verification Output |
| :--- | :--- | :--- | :--- | :--- |
| **Test 1** | Real Auth & Admin Employee Provisioning | **PASS** | `200 OK` | Created user `usr_98643eada2d8`, logged in with status `Genuine`. |
| **Test 2** | Honeypot Triggering on Failed Logins | **PASS** | `200 OK` | Attempts 1-2 returned `401`. Attempt 3 redirected to status `Deception` (Score: 100). |
| **Test 3** | Deception Decoy Actions & Telemetry | **PASS** | `200 OK` | Retrieved `customer_pii_export_raw.csv` and executed `env` secret harvesting. |
| **Test 4** | Admin SOC Events Polling Sync | **PASS** | `200 OK` | `/api/admin/events-poll` synced active sessions & alerts. |
| **Test 5** | AI Threat Report Generation | **PASS** | `200 OK` | Generated structured attacker summary report. |
| **Test 6** | Session State Retrieval & Persistence | **PASS** | `200 OK` | Session state maintained with correct threat score. |
| **Test 7** | DB Persistence Audit | **PASS** | `200 OK` | Engine state store operational. |

---

## 13. MAINTENANCE & OPERATIONS MANUAL

- **Employee Provisioning:** Provision or remove employees via Admin SOC UI or `POST /api/admin/employees`.
- **Database Maintenance:** Standard MongoDB Atlas automated backups and index monitoring.
- **Incident Response Triage:** Isolated sessions (Threat Score = 100) are flagged in critical red within SOC console for immediate IP blocking.

---

## 14. FINAL ACADEMIC PRESENTATION READINESS SUMMARY

- **Visual Preservation:** 100% of existing UI design, honeypot canvas, terminal emulator, and SOC charts preserved.
- **Technical Integrity:** Architecture backed by persistent database, real authentication, and multi-device polling support.
- **Presentation Deck Demo Workflow:**
  1. Demonstrate normal employee login into genuine corporate dashboard.
  2. Demonstrate attacker brute-force attempt (3 failed logins with nonexistent/wrong credentials) triggering silent honeypot diversion.
  3. Show attacker running canary terminal commands (`env`, downloading decoy PII CSV).
  4. Switch to SOC Admin Dashboard on second window/device to show real-time telemetry updates and AI threat report generation.
