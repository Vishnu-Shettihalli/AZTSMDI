import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import {
  sessions,
  alerts,
  loginFailures,
  createSession,
  addLogEntry,
  createAlert,
  endSession,
  getStats,
  DECEPTION_FILES,
  addSseClient,
  removeSseClient,
  broadcastToAdmins,
  getRegisteredEmployees,
  registerEmployee,
  removeEmployee,
  loadEmployeesFromDb
} from "./src/server/store.js";
import { generateAttackerSummary } from "./src/server/gemini.js";
import { connectMongoDB } from "./src/server/db.js";

const getFilename = () => {
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return fileURLToPath(import.meta.url);
  }
  return typeof __filename !== "undefined" ? __filename : "";
};

const getDirname = () => {
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url));
  }
  return typeof __dirname !== "undefined" ? __dirname : "";
};

const __filename = getFilename();
const __dirname = getDirname();

async function startServer() {
  // Connect to MongoDB if MONGODB_URI is provided
  await connectMongoDB();
  await loadEmployeesFromDb();

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3005;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const ip = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Unknown User Agent";

    if (!username) {
      return res.status(400).json({ status: "error", message: "Username is required." });
    }

    // 1. Check for genuine employee login (dynamic registered employees list)
    const registered = getRegisteredEmployees();
    const matchedUser = registered.find(
      e => e.username.toLowerCase() === username.trim().toLowerCase() && e.password === password
    );

    if (matchedUser) {
      // Successful real employee login
      // Clear login failures
      delete loginFailures[username];
      const session = createSession(matchedUser.username, "Genuine", ip, userAgent);
      return res.json({ status: "success", session });
    }

    // 2. Check for seeded trap credential
    if (username === "admin@corporate.sec") {
      // Seeded credentials trap immediately triggers a deception environment
      const session = createSession(username, "Deception", ip, userAgent);
      addLogEntry(session.id, "Trap Account Trigger", `Logged in successfully via known leaked trap account credentials: '${username}'`, 40);
      return res.json({ status: "success", session });
    }

    // 3. Brute force / failed login track
    const failures = loginFailures[username] || { count: 0, lastAttempt: Date.now() };
    failures.count += 1;
    failures.lastAttempt = Date.now();
    loginFailures[username] = failures;

    if (failures.count >= 3) {
      // 3rd or greater failure silently succeeds, redirecting to the Shadow Service!
      const session = createSession(username, "Deception", ip, userAgent);
      // Log the brute force entry
      addLogEntry(
        session.id,
        "Brute Force Threshold Breached",
        `Repeated failed logins (${failures.count} attempts). Silent deceptive diversion activated. Last tried password was '${password}'`,
        30
      );
      return res.json({ status: "success", session });
    } else {
      // Normal failed response
      createAlert("warning", `Failed login attempt for user '${username}' (Attempt ${failures.count}/3).`, "auth_system");
      return res.status(401).json({
        status: "error",
        message: `Invalid credentials. Attempt ${failures.count} of 3.`
      });
    }
  });

  app.post("/api/auth/admin-login", (req, res) => {
    const { username, password } = req.body;
    if (!username) {
      return res.status(400).json({ status: "error", message: "Admin username is required." });
    }
    // Accept admin / admin123 or any admin attempt for demo convenience
    if ((username.toLowerCase() === "admin" || username.toLowerCase() === "soc_admin" || username.toLowerCase() === "admin@svit.edu") && (password === "admin" || password === "admin123" || password === "password" || password === "")) {
      return res.json({
        status: "success",
        role: "admin",
        session: {
          id: `admin_${Date.now()}`,
          username: username.toLowerCase() === "admin" ? "SOC Security Lead" : username,
          role: "admin"
        }
      });
    }
    // Allow any admin username with password 'admin123' for smooth testing
    if (password === "admin123" || password === "admin") {
      return res.json({
        status: "success",
        role: "admin",
        session: {
          id: `admin_${Date.now()}`,
          username: username,
          role: "admin"
        }
      });
    }
    return res.status(401).json({
      status: "error",
      message: "Invalid SOC Admin credentials. Try username: admin / password: admin123"
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    const { sessionId } = req.body;
    if (sessionId) {
      endSession(sessionId);
    }
    res.json({ status: "success" });
  });

  app.get("/api/session/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      return res.status(404).json({ status: "error", message: "Session not found." });
    }
    res.json({ status: "success", session });
  });

  // ==========================================
  // REAL DASHBOARD DATA (LEGITIMATE USERS)
  // ==========================================

  app.get("/api/real/dashboard/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== "Genuine") {
      return res.status(403).json({ status: "error", message: "Unauthorized access." });
    }

    // Standard business dashboard data
    res.json({
      status: "success",
      data: {
        systemPostures: {
          firewall: "Operational",
          vpnGateway: "Secure (14 Active Tunnels)",
          threatLevel: "Low / Normal",
          endpoints: "42/42 Secured"
        },
        projects: [
          { id: 1, name: "Intranet Refresh V2", deadline: "2026-08-15", status: "In Progress", lead: "Alex R." },
          { id: 2, name: "Standard OS Security Patching", deadline: "2026-07-28", status: "Active", lead: "Nora S." },
          { id: 3, name: "Hardware Server Upgrade (Rack 4)", deadline: "2026-09-01", status: "Pending approval", lead: "John D." }
        ],
        tasks: [
          { id: 101, title: "Review standard firewall port mappings", completed: true },
          { id: 102, title: "Submit Q2 department hardware expenses", completed: false },
          { id: 103, title: "Update company workstation anti-virus lists", completed: true }
        ],
        news: [
          { date: "2026-07-19", text: "Standard quarterly system maintenance is scheduled for Sunday July 26th, from 01:00 to 04:00 UTC." },
          { date: "2026-07-15", text: "HR reminder: Please complete the yearly security awareness training questionnaire before Friday." }
        ]
      }
    });
  });

  // ==========================================
  // DECEPTION DASHBOARD ENDPOINTS (SHADOW ZONE)
  // ==========================================

  // Get deceptive files directory
  app.get("/api/deception/files/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== "Deception") {
      return res.status(403).json({ status: "error", message: "Unauthorized." });
    }

    addLogEntry(sessionId, "Accessed File Directory", "Queried root filesystem contents via Cloud File Explorer", 10);

    // Map files hiding confidential contents for the list overview
    const list = DECEPTION_FILES.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      sensitive: f.sensitive
    }));

    res.json({ status: "success", files: list });
  });

  // Access specific deceptive file
  app.get("/api/deception/file/:sessionId/:fileName", (req, res) => {
    const { sessionId, fileName } = req.params;
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== "Deception") {
      return res.status(403).json({ status: "error", message: "Unauthorized." });
    }

    const file = DECEPTION_FILES.find(f => f.name === fileName);
    if (!file) {
      return res.status(404).json({ status: "error", message: "File not found." });
    }

    // Determine threat points based on sensitivity
    const points = file.sensitive ? 30 : 5;
    const alertTag = file.sensitive ? "[HIGH SENSITIVITY]" : "[NORMAL]";
    addLogEntry(sessionId, `Viewed Document`, `Accessed file '${fileName}' ${alertTag}. Size: ${file.size}`, points);

    res.json({ status: "success", file });
  });

  // Custom terminal simulation inside shadow zone
  app.post("/api/deception/terminal/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const { command } = req.body;
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== "Deception") {
      return res.status(403).json({ status: "error", message: "Unauthorized." });
    }

    if (!command) {
      return res.json({ status: "success", output: "" });
    }

    const trimmed = command.trim();
    const parts = trimmed.split(" ");
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" ");

    addLogEntry(sessionId, "Terminal Command Execution", `Ran terminal command: '${trimmed}'`, 25);

    let output = "";

    switch (cmd) {
      case "help":
        output = `Available System Diagnostics Tools:
  ls               List files in current working directory
  cat [file]       Concatenate and display file content
  whoami           Show current logged in system profile
  env              Display current environment parameters
  netstat          Check active sockets and network interfaces
  ifconfig         Show gateway configurations
  clear            Clear screen
  ping [host]      Diagnostic packet test to targets`;
        break;
      case "ls":
      case "dir":
        output = DECEPTION_FILES.map(f => `${f.size.padEnd(10)}  ${f.name}`).join("\n");
        break;
      case "whoami":
        output = "root";
        break;
      case "env":
        addLogEntry(sessionId, "Revealed Vault Secrets", "Triggered 'env' command in console to harvest environmental variables", 35);
        output = `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
SHELL=/bin/bash
USER=root
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
POSTGRES_DB_USER=master_postgres_dba
POSTGRES_DB_PASSWORD=vault_master_db_root_pass_920%
JWT_SECRET_KEY=9a626a5be893ef10d8bbec9b26d84f886475fa3d16b
PROD_DATABASE_URL=postgresql://master_postgres_dba:vault_master_db_root_pass_920%@10.0.5.42:5432/apex_production`;
        break;
      case "netstat":
        output = `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State      
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN     
tcp        0      0 10.0.1.15:5432          10.0.5.42:39201         ESTABLISHED
tcp        0      0 10.0.1.15:80            127.0.0.1:49204         ESTABLISHED`;
        break;
      case "ifconfig":
        output = `eth0      Link encap:Ethernet  HWaddr 02:42:AC:11:00:02  
          inet addr:10.0.1.15  Bcast:10.0.1.255  Mask:255.255.255.0
          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
          RX packets:102048 errors:0 dropped:0 overruns:0 frame:0
          TX packets:95408 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:0 
          RX bytes:145029304 (145.0 MB)  TX bytes:102049820 (102.0 MB)`;
        break;
      case "cat":
        if (!arg) {
          output = "Usage: cat [filename]";
        } else {
          const file = DECEPTION_FILES.find(f => f.name.toLowerCase() === arg.toLowerCase());
          if (file) {
            const points = file.sensitive ? 30 : 5;
            addLogEntry(sessionId, "Read Document Content", `Read file content of '${file.name}' using terminal`, points);
            output = file.content;
          } else {
            output = `cat: ${arg}: No such file or directory`;
          }
        }
        break;
      case "ping":
        output = `PING ${arg || "10.0.1.1"} (${arg || "10.0.1.1"}) 56(84) bytes of data.
64 bytes from ${arg || "10.0.1.1"}: icmp_seq=1 ttl=64 time=0.421 ms
64 bytes from ${arg || "10.0.1.1"}: icmp_seq=2 ttl=64 time=0.312 ms
--- ${arg || "10.0.1.1"} ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1002ms
rtt min/avg/max/mdev = 0.312/0.366/0.421/0.057 ms`;
        break;
      default:
        output = `bash: ${cmd}: command not found. Enter 'help' to review available administrative utilities.`;
        break;
    }

    res.json({ status: "success", output });
  });

  // Custom generic search inside shadow environment
  app.post("/api/deception/search/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const { query } = req.body;
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== "Deception") {
      return res.status(403).json({ status: "error", message: "Unauthorized." });
    }

    const cleanQuery = (query || "").trim().toLowerCase();
    let points = 5;

    // Search query flags
    const highThreatKeywords = ["admin", "root", "password", "key", "secret", "db", "leak", "hack", "payment", "credit"];
    const matchesKeyword = highThreatKeywords.some(keyword => cleanQuery.includes(keyword));

    if (matchesKeyword) {
      points = 15;
    }

    addLogEntry(sessionId, "Search Console Query", `Searched deception system logs for query: '${query}'`, points);

    // Return fake matching assets
    const allFakeAssets = [
      { name: "production_postgres_secrets.yaml", location: "/vault/secrets/", match: "password, db, root" },
      { name: "private_ssh_key_root.pem", location: "/home/root/.ssh/", match: "key, root" },
      { name: "admin_panel_bypass_config.json", location: "/etc/nginx/conf.d/", match: "admin, bypass" },
      { name: "q3_merger_acquisition_plan.pdf", location: "/shared/corporate/", match: "merger, plan" },
      { name: "stripe_payment_api_key_live.txt", location: "/vault/keys/", match: "stripe, key, payment" },
      { name: "customer_pii_export_raw.csv", location: "/db_exports/backups/", match: "customer, credit, database" }
    ];

    const results = allFakeAssets.filter(asset => {
      if (!cleanQuery) return true;
      return asset.name.toLowerCase().includes(cleanQuery) ||
             asset.location.toLowerCase().includes(cleanQuery) ||
             asset.match.toLowerCase().includes(cleanQuery);
    });

    res.json({ status: "success", results });
  });

  // Custom specific action click triggers
  app.post("/api/deception/action/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const { action, details, threatPoints } = req.body;
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== "Deception") {
      return res.status(403).json({ status: "error", message: "Unauthorized." });
    }

    addLogEntry(sessionId, action, details, threatPoints || 20);
    res.json({ status: "success", feedback: "Operation accepted and processing in sandbox environment." });
  });


  // ==========================================
  // ADMIN MONITORING HUB ENDPOINTS
  // ==========================================

  // Get all registered employee credentials (admin only)
  app.get("/api/admin/employees", (req, res) => {
    res.json({ status: "success", employees: getRegisteredEmployees() });
  });

  // Alias for backward compatibility
  app.get("/api/admin/students", (req, res) => {
    res.json({ status: "success", students: getRegisteredEmployees(), employees: getRegisteredEmployees() });
  });

  // Register a new employee (admin only)
  app.post("/api/admin/employees", (req, res) => {
    const { username, password, department, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ status: "error", message: "Email and password are both required." });
    }
    try {
      const employee = registerEmployee(username, password, department, role);
      createAlert("info", `Admin provisioned a new employee credential for '${employee.username}' (${employee.department} - ${employee.role}).`, "admin_console");
      res.json({ status: "success", message: `Employee '${employee.username}' registered successfully.`, employee });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: err.message || "Registration failed." });
    }
  });

  // Remove an employee from company registry
  app.delete("/api/admin/employees/:username", (req, res) => {
    const { username } = req.params;
    try {
      const removed = removeEmployee(username);
      createAlert("warning", `Admin removed employee '${removed.username}' from the company registry.`, "admin_console");
      res.json({ status: "success", message: `Employee '${removed.username}' removed successfully.`, removed });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: err.message || "Removal failed." });
    }
  });

  // Alias for backward compatibility
  app.post("/api/admin/students", (req, res) => {
    const { username, password, department, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ status: "error", message: "Email and password are both required." });
    }
    try {
      const employee = registerEmployee(username, password, department, role);
      createAlert("info", `Admin provisioned a new employee credential for '${employee.username}' (${employee.department} - ${employee.role}).`, "admin_console");
      res.json({ status: "success", message: `Employee '${employee.username}' registered successfully.`, employee });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: err.message || "Registration failed." });
    }
  });

  // Get active sessions
  app.get("/api/admin/sessions", (req, res) => {
    res.json({ status: "success", sessions });
  });

  // Get alert feeds
  app.get("/api/admin/alerts", (req, res) => {
    res.json({ status: "success", alerts });
  });

  // ==========================================
  // REVERSE PROXY FORWARDING ROUTE (OPEN-SOURCE TARGET BENCHMARK PROXY)
  // ==========================================
  app.all("/api/proxy/*", async (req, res) => {
    const targetPath = req.params[0] || "";
    const sessionId = (req.headers["x-session-id"] as string) || (req.query.sessionId as string);
    const session = sessions.find(s => s.id === sessionId);

    // 1. Check Threat Score & Security Posture
    if (session && session.status === "Deception") {
      // SILENT HONEYPOT DIVERSION: Intercept attacker & return synthetic payload
      addLogEntry(session.id, "Proxy Access Intercepted", `Intercepted query to '/${targetPath}'. Silently served synthetic honeypot decoy data.`, 25);
      return res.json({
        status: "success",
        deceptionActive: true,
        securityPosture: "DECEPTION_SHADOW_CONTAINMENT",
        data: [
          { id: 901, name: "DECOY_EXECUTIVE_PII", email: "trap_exec@svit.sec", salary: "$185,000" },
          { id: 902, name: "TRAP_ADMIN_CREDENTIAL", email: "aws_root_trap@svit.sec", key: "AKIAIOSFODNN7EXAMPLE" }
        ],
        message: "Traffic containment active. Attacker served synthetic decoy response."
      });
    }

    // 2. Legitimate User Proxy Forwarding to Open-Source Target Application API (JSONPlaceholder / HTTPBin)
    try {
      const targetUrl = `https://jsonplaceholder.typicode.com/${targetPath || "users"}`;
      const response = await fetch(targetUrl);
      const data = await response.json();
      
      if (session) {
        addLogEntry(session.id, "Proxy Request Forwarded", `Forwarded legitimate request '/${targetPath}' to open-source backend web service.`, 0);
      }

      res.json({
        status: "success",
        deceptionActive: false,
        securityPosture: "GENUINE_FORWARDED",
        targetUrl,
        data
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Failed to forward request to target server." });
    }
  });

  // Get dashboard metrics stats
  app.get("/api/admin/stats", (req, res) => {
    res.json({ status: "success", stats: getStats() });
  });

  // Simulate an automated brute force attack on the fly
  app.post("/api/admin/simulate/brute", (req, res) => {
    const ip = "185.220.101." + Math.floor(Math.random() * 254 + 1);
    const userAgent = "Mozilla/5.0 (compatible; BotnetScanner/2.4; +http://recon.net)";
    const username = "recon_bot_" + Math.random().toString(36).substring(2, 6) + "@threat.org";

    // 1. Create a deception session directly
    const session = createSession(username, "Deception", ip, userAgent);
    session.failedAttempts = 3;

    // 2. Add realistic logs sequentially
    addLogEntry(session.id, "Brute Force Threshold Breached", "Repeated failed logins (3 attempts). Silent honeypot diversion activated. Last tried password was 'admin12345'", 30);
    
    setTimeout(() => {
      addLogEntry(session.id, "Terminal Command Execution", "Executed: 'whoami' via command interpreter", 15);
    }, 100);

    setTimeout(() => {
      addLogEntry(session.id, "Read Document Content", "Accessed file 'customer_pii_export_raw.csv'. Format: CSV | Size: 185 KB", 30);
    }, 200);

    setTimeout(() => {
      addLogEntry(session.id, "Revealed Vault Secrets", "Triggered 'env' command in console to harvest environmental variables", 35);
    }, 300);

    res.json({ status: "success", message: "Infiltration simulation triggered.", session });
  });

  // Trigger simulated critical posture warnings
  app.post("/api/admin/simulate/critical", (req, res) => {
    createAlert(
      "critical",
      `POSTURE ALARM: Brute-force credentials-stuffing attack detected targeting LDAP server node. Triggering automated telemetry quarantine.`,
      "sim_controller"
    );
    res.json({ status: "success", message: "Critical alarm injected into live feed." });
  });

  // Download real-time session logs report as CSV
  app.get("/api/admin/download-report/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      return res.status(404).send("Error: Session not found.");
    }

    let csvContent = "Timestamp,Action,Details,Threat Score Contribution\n";
    session.logs.forEach(log => {
      const escapedDetails = log.details.replace(/"/g, '""');
      csvContent += `"${log.timestamp}","${log.action}","${escapedDetails}",${log.threatPoints}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=aegis_telemetry_report_${sessionId}.csv`);
    res.status(200).send(csvContent);
  });

  // Generate plain English Attacker Intent Summary using Gemini / Fallback
  app.post("/api/admin/summary/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      return res.status(404).json({ status: "error", message: "Session not found." });
    }

    session.generatingSummary = true;
    broadcastToAdmins("session_update", session);

    try {
      const summary = await generateAttackerSummary(session);
      session.aiSummary = summary;
      session.generatingSummary = false;
      broadcastToAdmins("session_update", session);
      return res.json({ status: "success", summary });
    } catch (err: any) {
      session.generatingSummary = false;
      broadcastToAdmins("session_update", session);
      return res.status(500).json({ status: "error", message: err.message || "Failed to generate report." });
    }
  });

  // SSE (Server-Sent Events) Stream endpoint for real-time monitoring dashboard updates
  app.get("/api/admin/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Store subscription
    addSseClient(res);

    // Write a comment ping every 25 seconds to keep the connection alive
    const intervalId = setInterval(() => {
      res.write(": ping\n\n");
    }, 25000);

    req.on("close", () => {
      clearInterval(intervalId);
      removeSseClient(res);
    });
  });

  // ==========================================
  // VITE DEV SERVER & PRODUCTION ASSETS ROUTING
  // ==========================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom dev/production server running on port ${PORT}`);
  });
}

startServer();
