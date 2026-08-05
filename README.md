# Adaptive Zero Trust Security Model with Deception Intelligence

An academic prototype demonstrating an intelligent, adaptive login system where suspicious traffic is silently, dynamically diverted to a high-fidelity fake "Shadow Environment" (honeypot). All attacker maneuvers are logged and summarized into automated security logs and high-level plain-English behavior analysis reports powered by server-side **Gemini AI**.

---

## 🗺️ Mapping Academic Postures to Codebase Components

This prototype maps five core theoretical security modules directly into real, fully working code:

### 1. Adaptive Policy Engine
*   **Theory**: Orchestrates traffic routing based on login behaviors and credential risk weights.
*   **Code Implementation**: 
    *   `/server.ts` (Login endpoint `POST /api/auth/login`)
*   **Mechanism**: If a user attempts to log in using flagged trap credentials (`admin@corporate.sec`) or breaches the brute force threshold (≥ 3 failed logins), the engine overrides access failure blocks and triggers a **silent mock success redirect**. The user believes they finally breached/authenticated into the main system, but are completely isolated in the deception zone.

### 2. Shadow Service (Deception Environment)
*   **Theory**: A simulated sandbox mirroring high-value assets to occupy attackers and analyze their target objectives.
*   **Code Implementation**: 
    *   `/src/components/DeceptionDashboard.tsx` (Aegis Secure Core Dashboard)
    *   `/server.ts` (Simulated endpoints under `/api/deception/*`)
*   **Mechanism**: A high-fidelity "Aegis Core Control" interface containing simulated Ledger balance releases, an encrypted File Explorer with fake PDF and CSV previews, toggleable secret API credential tables, an interactive diagnostics **SSH Terminal Shell** (responding dynamically to commands like `help`, `ls`, `cat [file]`, `env`, `netstat`, `ifconfig`, and `whoami`), and a global search engine.

### 3. Behavioral Monitoring Engine
*   **Theory**: Silently tracks user interactions (clicks, files opened, search queries, typed commands) without alerts or performance degradation inside the client container.
*   **Code Implementation**:
    *   `/src/components/DeceptionDashboard.tsx` (Background telemetry hooks utilizing `/api/deception/action/*`)
*   **Mechanism**: Behind-the-scenes logging runs on every action. If an attacker views a document or copies an API key, a background post-auth packet reports back to the server. The attacker sees 100% normal responses with no security warnings, ensuring continuous stealth.

### 4. Threat Score Engine
*   **Theory**: Evaluates threat parameters in real-time, adding risk weights on suspicious navigation behaviors.
*   **Code Implementation**:
    *   `/src/server/store.ts` (`addLogEntry` scoring core and state)
*   **Mechanism**: Starts with a base score of 50 for shadow sessions, incrementing on the following rule-based algorithms:
    *   **Failed Authentication Count**: +20 points per failed attempt.
    *   **Access to Fake Sensitive Resources**: +30 points.
    *   **Searching High-Risk Keywords** (e.g., `db`, `root`, `password`): +15 points.
    *   **Scripted Request Timing Detection**: Logs with less than 1.5 seconds between clicks are caught as automated scripting tools (+20 points).
    *   **Out-of-Sequence Exploits**: Exposing secret environmental keys (`env`) on initialization before exploring basic menus is flagged (+25 points).

### 5. Deception Monitoring Dashboard
*   **Theory**: Real-time SecOps controller to review active intrusions and assess threat metrics.
*   **Code Implementation**:
    *   `/src/components/AdminDashboard.tsx` (Intelligence Hub UI Panel)
    *   `/server.ts` (Server-Sent Events endpoint `/api/admin/events`)
    *   `/src/server/gemini.ts` (Gemini API Integration)
*   **Mechanism**: Connects to the server via native **Server-Sent Events (SSE)**. Whenever an attacker does anything in the deception console, the dashboard receives instant telemetry, updating the intruder's behavioral timeline card, updating SVG/Tailwind live charts, and firing visual alert toasts. Includes a button to compile a plain-English **Attacker Intent Report** leveraging server-side **Gemini AI** (`gemini-3.5-flash`) to analyze and evaluate the attacker's tactics, sophistication, and suggested remediation steps.

---

## 🛠️ Project Structure & Architecture

```bash
├── server.ts                 # Main full-stack entrypoint (Express + API routes + Vite dev middleware)
├── metadata.json             # Applet descriptor & security capabilities
├── package.json              # Dependency configurations (including @google/genai, express, tsx, esbuild)
├── src/
│   ├── App.tsx               # Primary orchestrator. Renders dual views (Gateway vs Admin SOC)
│   ├── main.tsx              # React mounting entrypoint
│   ├── index.css             # Global Tailwind stylesheets
│   ├── types.ts              # Shared Type definitions (LogEntry, Session, Alert, Stats)
│   ├── components/
│   │   ├── Login.tsx         # Security Access Login Gate (includes quick-posture testing utilities)
│   │   ├── RealDashboard.tsx # Normal Legitimate Employee Workspace Dashboard
│   │   ├── DeceptionDashboard.tsx # High-fidelity sandbox Deception Core Console
│   │   └── AdminDashboard.tsx     # Security Operations Center (SOC) dashboard
│   └── server/
│       ├── store.ts          # Core In-Memory Database Store (Adaptive Policy, Telemetry, and Threat scoring rules)
│       └── gemini.ts         # Server-side Gemini AI Intent Summary module (and rule-based fallbacks)
```

---

## 🚀 Posture Testing Guide

Open the applet, and use the split dashboard header tabs to simulate different security outcomes:

### Posture 1: Legitimate Entry (Clean Path)
1.  On the **Security Gateway** panel, click **"Load"** under the *Path A: Genuine User* box (loads `employee@company.com` and password `password123`).
2.  Log in. You will view a clean corporate workspace with employee announcements, Department initiatives, and assigned timesheets.
3.  Switch to the **Admin SOC** panel. This session will be flagged with a green circle as **"Genuine User"** with a Threat Score of `0`.

### Posture 2: Seeded Credential Trap (Leaked accounts)
1.  On the **Security Gateway** panel, click **"Load"** under the *Path B: Seeded Trap Account* box (loads `admin@corporate.sec` and a random password).
2.  Log in. You will successfully enter what looks like the **Aegis Secure Core Console** (Shadow Zone).
3.  Interact with the environment: Switch tabs, execute wire transfers, open secret blueprints, view AWS secrets, search for `password`, or type `help` followed by `env` inside the **Terminal Shell**.
4.  Switch to the **Admin SOC** panel. You will see a blinking red **Critical Alert**, and a newly spawned session card flagged as **"Shadow Environment"**. Click on it to watch the timeline logs update in **real-time** as you do actions in the other view.

### Posture 3: Adaptive Brute Force Stuffing
1.  On the **Security Gateway** panel, click **"Load"** under the *Path C: Adaptive Brute Force* (loads `attacker@recon.net` and a wrong password).
2.  Press **"Sign In"**. You will receive an authentic error: *"Invalid credentials. Attempt 1 of 3."*
3.  Press **"Sign In"** again: *"Invalid credentials. Attempt 2 of 3."*
4.  Press **"Sign In"** a third time. The adaptive threshold is breached: you **silently log in successfully** as administrator! You have been diverted to the Shadow Zone.
5.  Check the **Admin SOC** panel. You will see alerts logging the failed login brute force attempts, followed by the silent honeypot diversion.

### AI Deception Analytics
On the **Admin SOC** panel:
1.  Click on any active Deception session card.
2.  Click **"Compile AI Intelligence"**.
3.  Our server-side analyzer queries the **Gemini 3.5 API**, passing the attacker's full chronological timeline.
4.  Gemini returns a highly structured **Attacker Deception Intelligence & Intent Report** detailing estimated attacker sophistication (e.g. Script Kiddie vs Targeted Intruder), specific assets targeted, and suggested countermeasures.
