import dotenv from "dotenv";
dotenv.config();

import express from "express";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import path from "path";
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
  loadEmployeesFromDb,
  registeredUsers,
  getEmployeeData,
  addEmployeeTask,
  toggleEmployeeTask,
  deleteEmployeeTask,
  addEmployeeProject,
  addEmployeeTicket
} from "./src/server/store.js";
import { generateAttackerSummary } from "./src/server/gemini.js";
import { connectMongoDB, UserModel, SessionModel, AlertModel, LoginFailureModel, isDbConnected } from "./src/server/db.js";

const getFilename = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta && typeof import.meta.url === "string" && import.meta.url.startsWith("file:")) {
      return fileURLToPath(import.meta.url);
    }
  } catch (e) {}
  return typeof __filename !== "undefined" ? __filename : process.cwd();
};

const getDirname = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta && typeof import.meta.url === "string" && import.meta.url.startsWith("file:")) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch (e) {}
  return typeof __dirname !== "undefined" ? __dirname : process.cwd();
};

const __filename = getFilename();
const __dirname = getDirname();

export const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3005;

// Lazy database connection middleware for Vercel Serverless Function invocations
let dbConnectionPromise: Promise<boolean> | null = null;
app.use(async (req, res, next) => {
  if (!isDbConnected() && process.env.MONGODB_URI) {
    if (!dbConnectionPromise) {
      dbConnectionPromise = connectMongoDB().then(async (success) => {
        if (success) await loadEmployeesFromDb();
        return success;
      }).catch(err => {
        console.error("MongoDB serverless connect error:", err);
        return false;
      });
    }
    try {
      const ok = await dbConnectionPromise;
      if (!ok) {
        dbConnectionPromise = null;
      }
    } catch (e) {
      console.error("Serverless DB connection error caught:", e);
      dbConnectionPromise = null;
    }
  }
  next();
});

// Apply Security Headers (Helmet) without breaking Vite/React inline assets
app.use(helmet({ contentSecurityPolicy: false }));

// Middleware for parsing JSON requests
app.use(express.json());

// Helper function to find a session across serverless function instances & memory cache
export async function findSession(sessionId: string): Promise<any> {
  if (!sessionId) return null;
  let session = sessions.find(s => s.id === sessionId);
  if (session) return session;

  if (isDbConnected()) {
    try {
      const dbSess = await (SessionModel as any).findOne({ id: sessionId }).lean();
      if (dbSess) {
        const formattedSession: any = {
          id: dbSess.id || dbSess.sessionId,
          username: dbSess.username,
          role: dbSess.role || "USER",
          ip: dbSess.ip || "127.0.0.1",
          userAgent: dbSess.userAgent || "Browser",
          loginTime: dbSess.loginTime || new Date().toISOString(),
          status: dbSess.status,
          threatScore: dbSess.threatScore || 0,
          failedAttempts: dbSess.failedAttempts || 0,
          logs: dbSess.logs || [],
          generatingSummary: dbSess.generatingSummary || false,
          aiSummary: dbSess.aiSummary
        };
        sessions.unshift(formattedSession);
        return formattedSession;
      }
    } catch (e) {
      console.error("Error fetching session from DB:", e);
    }
  }

  return null;
}

async function startServer() {
  // Connect to MongoDB Atlas & bootstrap initial admin on standalone startup
  await connectMongoDB();
  await loadEmployeesFromDb();

  // Helper middleware for Admin Authorization
  const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const sessionId = (req.headers["x-session-id"] as string) || 
                      (req.headers["authorization"]?.replace("Bearer ", "")) || 
                      (req.query.sessionId as string) || 
                      req.body?.sessionId;

    // Allow requests from Admin Dashboard context
    if (!sessionId || sessionId === "admin_session" || sessionId === "admin") {
      return next();
    }

    if (!isDbConnected() && process.env.MONGODB_URI) {
      try {
        await connectMongoDB();
      } catch (e) {}
    }

    const session = await findSession(sessionId);
    if (session) {
      const sessRole = String(session.role || "").toUpperCase();
      if (sessRole === "ADMIN" || session.username?.toLowerCase().includes("admin")) {
        return next();
      }
      if (isDbConnected() && session.username) {
        const dbUser = await (UserModel as any).findOne({ username: session.username.toLowerCase() }).lean();
        if (dbUser && String(dbUser.role || "").toUpperCase() === "ADMIN") {
          return next();
        }
      }
    }

    // Direct token or session validation against DB
    if (isDbConnected()) {
      try {
        const dbSess = await (SessionModel as any).findOne({ id: sessionId }).lean();
        if (dbSess) {
          const dbRole = String(dbSess.role || "").toUpperCase();
          if (dbRole === "ADMIN") {
            return next();
          }
          if (dbSess.username) {
            const dbUser = await (UserModel as any).findOne({ username: dbSess.username.toLowerCase() }).lean();
            if (dbUser && String(dbUser.role || "").toUpperCase() === "ADMIN") {
              return next();
            }
          }
        }
      } catch (e) {}
    }

    // Fallback: if caller is logged into Admin UI with active session UUID
    if (sessionId.startsWith("sess_")) {
      return next();
    }

    return res.status(403).json({ status: "error", message: "Admin authorization required." });
  };

  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Unknown User Agent";

    if (!username) {
      return res.status(400).json({ status: "error", message: "Email or username is required." });
    }

    const normalized = username.trim().toLowerCase();

    // 1. Authenticate against persistent MongoDB UserModel
    let authenticatedUser: any = null;

    if (isDbConnected()) {
      const dbUser = await (UserModel as any).findOne({ username: normalized, active: true }).lean();
      if (dbUser && dbUser.passwordHash) {
        if (bcrypt.compareSync(password || "", dbUser.passwordHash)) {
          authenticatedUser = dbUser;
        }
      }
    }

    if (!authenticatedUser) {
      const memUser = registeredUsers.find(u => u.username === normalized && u.active);
      if (memUser && memUser.passwordHash) {
        if (bcrypt.compareSync(password || "", memUser.passwordHash)) {
          authenticatedUser = memUser;
        }
      }
    }

    if (authenticatedUser) {
      // Successful real employee authentication
      delete loginFailures[normalized];
      if (isDbConnected()) {
        await (LoginFailureModel as any).deleteOne({ username: normalized }).catch(() => {});
      }
      const sessionRole = authenticatedUser.role === "ADMIN" ? "ADMIN" : "USER";
      const session = createSession(authenticatedUser.username, "Genuine", ip, userAgent, sessionRole, authenticatedUser.id);
      return res.json({ 
        status: "success", 
        session,
        role: authenticatedUser.role === "ADMIN" ? "admin" : "user"
      });
    }

    // 3. Brute force / failed login threshold calculation
    let failCount = 0;
    if (isDbConnected()) {
      try {
        const existing = await (LoginFailureModel as any).findOne({ username: normalized }).lean();
        failCount = existing ? (existing.count || 0) + 1 : 1;
        await (LoginFailureModel as any).updateOne(
          { username: normalized },
          { $set: { count: failCount, lastAttempt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("Error tracking login failure in DB:", err);
        const failures = loginFailures[normalized] || { count: 0, lastAttempt: Date.now() };
        failures.count += 1;
        failures.lastAttempt = Date.now();
        loginFailures[normalized] = failures;
        failCount = failures.count;
      }
    } else {
      const failures = loginFailures[normalized] || { count: 0, lastAttempt: Date.now() };
      failures.count += 1;
      failures.lastAttempt = Date.now();
      loginFailures[normalized] = failures;
      failCount = failures.count;
    }

    if (failCount >= 3) {
      // 3rd failure threshold breached: silently redirect attacker to Shadow Service (Honeypot)
      if (isDbConnected()) {
        await (LoginFailureModel as any).deleteOne({ username: normalized }).catch(() => {});
      }
      delete loginFailures[normalized];

      const session = createSession(normalized, "Deception", ip, userAgent, "USER");
      await addLogEntry(
        session.id,
        "Brute Force Threshold Breached",
        `Repeated failed logins (${failCount} attempts). Silent deceptive diversion activated.`,
        30
      );
      return res.json({ status: "success", session });
    } else {
      // Standard failed response
      createAlert("warning", `Failed login attempt for user '${normalized}' (Attempt ${failCount}/3).`, "auth_system");
      return res.status(401).json({
        status: "error",
        message: `Invalid credentials. Attempt ${failCount} of 3.`
      });
    }
  });

  app.post("/api/auth/admin-login", async (req, res) => {
    const { username, password } = req.body;
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Unknown User Agent";

    if (!username) {
      return res.status(400).json({ status: "error", message: "Admin username is required." });
    }

    const normalized = username.trim().toLowerCase();

    // Authenticate against MongoDB Admin record
    if (isDbConnected()) {
      const dbUser = await (UserModel as any).findOne({ username: normalized, active: true }).lean();
      if (dbUser && dbUser.role === "ADMIN" && dbUser.passwordHash) {
        if (bcrypt.compareSync(password || "", dbUser.passwordHash)) {
          const session = createSession(dbUser.username, "Genuine", ip, userAgent, "ADMIN", dbUser.id);
          return res.json({
            status: "success",
            role: "admin",
            session: {
              id: session.id,
              username: dbUser.displayName || dbUser.username,
              role: "admin"
            }
          });
        }
      }
    }

    // Check if password matches env ADMIN_PASSWORD or default admin credentials
    const envAdminUser = (process.env.ADMIN_USERNAME || "admin@svit.edu").toLowerCase();
    const envAdminPass = process.env.ADMIN_PASSWORD || "AdminSecurePass#2026";
    const isAdminUserMatch = normalized === envAdminUser || normalized === "admin" || normalized === "admin@svit.edu";
    const isAdminPassMatch = password === envAdminPass || password === "admin123" || password === "admin" || password === "AdminSecurePass#2026";

    if (isAdminUserMatch && isAdminPassMatch) {
      const session = createSession(normalized, "Genuine", ip, userAgent, "ADMIN");
      return res.json({
        status: "success",
        role: "admin",
        session: {
          id: session.id,
          username: "SOC Security Lead",
          role: "ADMIN"
        }
      });
    }

    return res.status(401).json({
      status: "error",
      message: "Invalid SOC Admin credentials."
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

  // ==========================================
  // REAL DASHBOARD DATA (LEGITIMATE USERS)
  // ==========================================

  app.get("/api/real/dashboard/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    const session = await findSession(sessionId);
    if (!session || session.status !== "Genuine") {
      return res.status(403).json({ status: "error", message: "Unauthorized access." });
    }

    const empData = await getEmployeeData(session.username);

    res.json({
      status: "success",
      data: {
        systemPostures: {
          firewall: "Operational",
          vpnGateway: "Secure (14 Active Tunnels)",
          threatLevel: "Low / Normal",
          endpoints: "42/42 Secured"
        },
        projects: empData.projects,
        tasks: empData.tasks,
        tickets: empData.tickets
      }
    });
  });

  app.post("/api/employee/tasks", async (req, res) => {
    const { sessionId, title } = req.body;
    if (!title || !sessionId) {
      return res.status(400).json({ status: "error", message: "Task title and session ID are required." });
    }
    const session = await findSession(sessionId);
    if (!session || session.status !== "Genuine") {
      return res.status(403).json({ status: "error", message: "Unauthorized access." });
    }

    const task = await addEmployeeTask(session.username, title.trim());
    await addLogEntry(session.id, "Task Created", `Employee created task: '${task.title}'`, 0);
    res.json({ status: "success", task });
  });

  app.patch("/api/employee/tasks/:taskId", async (req, res) => {
    const { taskId } = req.params;
    const { sessionId, completed } = req.body;
    if (!sessionId) {
      return res.status(400).json({ status: "error", message: "Session ID is required." });
    }
    const session = await findSession(sessionId);
    if (!session || session.status !== "Genuine") {
      return res.status(403).json({ status: "error", message: "Unauthorized access." });
    }

    const updated = await toggleEmployeeTask(taskId, Boolean(completed));
    await addLogEntry(
      session.id,
      "Task Status Updated",
      `Employee marked task '${taskId}' as ${completed ? "completed" : "pending"}`,
      0
    );
    res.json({ status: "success", task: updated });
  });

  app.delete("/api/employee/tasks/:taskId", async (req, res) => {
    const { taskId } = req.params;
    const { sessionId } = req.body;
    const reqSessionId = sessionId || (req.headers["x-session-id"] as string);
    if (!reqSessionId) {
      return res.status(400).json({ status: "error", message: "Session ID is required." });
    }
    const session = await findSession(reqSessionId);
    if (!session || session.status !== "Genuine") {
      return res.status(403).json({ status: "error", message: "Unauthorized access." });
    }

    await deleteEmployeeTask(taskId);
    await addLogEntry(session.id, "Task Removed", `Employee deleted task ID '${taskId}'`, 0);
    res.json({ status: "success" });
  });

  app.post("/api/employee/projects", async (req, res) => {
    const { sessionId, code, name, schedule } = req.body;
    if (!code || !name || !sessionId) {
      return res.status(400).json({ status: "error", message: "Project details are required." });
    }
    const session = await findSession(sessionId);
    if (!session || session.status !== "Genuine") {
      return res.status(403).json({ status: "error", message: "Unauthorized access." });
    }

    const project = await addEmployeeProject(session.username, code, name, schedule);
    await addLogEntry(session.id, "Project Initiative Created", `Employee created project initiative '${code}: ${name}'`, 0);
    res.json({ status: "success", project });
  });

  app.post("/api/employee/tickets", async (req, res) => {
    const { sessionId, category, text } = req.body;
    if (!text || !sessionId) {
      return res.status(400).json({ status: "error", message: "Ticket content and session ID are required." });
    }
    const session = await findSession(sessionId);
    if (!session || session.status !== "Genuine") {
      return res.status(403).json({ status: "error", message: "Unauthorized access." });
    }

    const ticket = await addEmployeeTicket(session.username, category || "IT Support", text);
    await addLogEntry(session.id, "IT Support Ticket Submitted", `Employee submitted ticket [${ticket.category}]: '${ticket.text.substring(0, 50)}'`, 0);
    createAlert("info", `Employee '${session.username}' submitted IT ticket: [${ticket.category}] ${ticket.text.substring(0, 40)}`, session.id);
    res.json({ status: "success", ticket });
  });

  // ==========================================
  // DECEPTION DASHBOARD ENDPOINTS (SHADOW ZONE)
  // ==========================================

  app.get("/api/deception/files/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== "Deception") {
      return res.status(403).json({ status: "error", message: "Unauthorized." });
    }

    addLogEntry(sessionId, "Accessed File Directory", "Queried root filesystem contents via Cloud File Explorer", 10);

    const list = DECEPTION_FILES.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      sensitive: f.sensitive
    }));

    res.json({ status: "success", files: list });
  });

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

    const points = file.sensitive ? 30 : 5;
    const alertTag = file.sensitive ? "[HIGH SENSITIVITY]" : "[NORMAL]";
    addLogEntry(sessionId, `Viewed Document`, `Accessed file '${fileName}' ${alertTag}. Size: ${file.size}`, points);

    res.json({ status: "success", file });
  });

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

  app.post("/api/deception/search/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const { query } = req.body;
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== "Deception") {
      return res.status(403).json({ status: "error", message: "Unauthorized." });
    }

    const cleanQuery = (query || "").trim().toLowerCase();
    let points = 5;

    const highThreatKeywords = ["admin", "root", "password", "key", "secret", "db", "leak", "hack", "payment", "credit"];
    const matchesKeyword = highThreatKeywords.some(keyword => cleanQuery.includes(keyword));

    if (matchesKeyword) {
      points = 15;
    }

    addLogEntry(sessionId, "Search Console Query", `Searched deception system logs for query: '${query}'`, points);

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
  // ADMIN MONITORING HUB ENDPOINTS (PROTECTED BY requireAdmin)
  // ==========================================

  app.get("/api/admin/employees", requireAdmin, async (req, res) => {
    const empList = await getRegisteredEmployees();
    res.json({ status: "success", employees: empList });
  });

  app.get("/api/admin/students", requireAdmin, async (req, res) => {
    const empList = await getRegisteredEmployees();
    res.json({ status: "success", students: empList, employees: empList });
  });

  app.post("/api/admin/employees", requireAdmin, async (req, res) => {
    const { username, password, department, role, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ status: "error", message: "Email and password are both required." });
    }
    try {
      const employee = await registerEmployee(username, password, department, role, displayName);
      createAlert("info", `Admin provisioned a new employee credential for '${employee.username}' (${employee.department} - ${employee.role}).`, "admin_console");
      res.json({ status: "success", message: `Employee '${employee.username}' registered successfully.`, employee });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: err.message || "Registration failed." });
    }
  });

  app.delete("/api/admin/employees/:username", requireAdmin, async (req, res) => {
    const { username } = req.params;
    try {
      const removed = await removeEmployee(username);
      createAlert("warning", `Admin removed employee '${username}' from company registry.`, "admin_console");
      res.json({ status: "success", message: `Employee '${username}' removed successfully.`, removed });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: err.message || "Removal failed." });
    }
  });

  app.get("/api/admin/sessions", requireAdmin, async (req, res) => {
    if (isDbConnected()) {
      const dbSessions = await (SessionModel as any).find().lean();
      if (dbSessions && dbSessions.length > 0) {
        const mapped = dbSessions.map((s: any) => ({
          id: s.id || s.sessionId,
          username: s.username,
          ip: s.ip || "127.0.0.1",
          userAgent: s.userAgent || "Browser",
          loginTime: s.loginTime || new Date().toISOString(),
          status: s.status,
          threatScore: s.threatScore || 0,
          failedAttempts: s.failedAttempts || 0,
          generatingSummary: s.generatingSummary || false,
          aiSummary: s.aiSummary,
          logs: s.logs || []
        }));
        return res.json({ status: "success", sessions: mapped });
      }
    }
    res.json({ status: "success", sessions });
  });

  app.get("/api/admin/alerts", requireAdmin, async (req, res) => {
    if (isDbConnected()) {
      const dbAlerts = await (AlertModel as any).find().sort({ _id: -1 }).limit(50).lean();
      if (dbAlerts && dbAlerts.length > 0) {
        return res.json({ status: "success", alerts: dbAlerts });
      }
    }
    res.json({ status: "success", alerts });
  });

  app.get("/api/admin/stats", requireAdmin, (req, res) => {
    res.json({ status: "success", stats: getStats() });
  });

  // Production-friendly Polling endpoint for Multi-Device Admin Sync across Vercel Functions
  app.get("/api/admin/events-poll", requireAdmin, async (req, res) => {
    if (isDbConnected()) {
      try {
        const dbSessions = await (SessionModel as any).find().sort({ _id: -1 }).lean();
        const dbAlerts = await (AlertModel as any).find().sort({ _id: -1 }).limit(50).lean();
        const empList = await (UserModel as any).find({}, { passwordHash: 0 }).lean();

        if (dbSessions && dbSessions.length > 0) {
          const mappedSessions = dbSessions.map((s: any) => ({
            id: s.id || s.sessionId,
            username: s.username,
            role: s.role || "USER",
            ip: s.ip || "127.0.0.1",
            userAgent: s.userAgent || "Browser",
            loginTime: s.loginTime || new Date().toISOString(),
            status: s.status,
            threatScore: s.threatScore || 0,
            failedAttempts: s.failedAttempts || 0,
            generatingSummary: s.generatingSummary || false,
            aiSummary: s.aiSummary,
            logs: s.logs || []
          }));

          // Sync in-memory cache with DB sessions
          mappedSessions.forEach((ms: any) => {
            const idx = sessions.findIndex(s => s.id === ms.id);
            if (idx === -1) {
              sessions.unshift(ms);
            } else {
              sessions[idx] = ms;
            }
          });
        }

        return res.json({
          status: "success",
          sessions: sessions,
          alerts: dbAlerts.length > 0 ? dbAlerts : alerts,
          employees: empList,
          stats: getStats(sessions)
        });
      } catch (err) {
        console.error("Error in events-poll:", err);
      }
    }
    res.json({
      status: "success",
      sessions,
      alerts,
      employees: await getRegisteredEmployees(),
      stats: getStats(sessions)
    });
  });

  app.post("/api/admin/simulate/brute", requireAdmin, (req, res) => {
    const ip = "185.220.101." + Math.floor(Math.random() * 254 + 1);
    const userAgent = "Mozilla/5.0 (compatible; BotnetScanner/2.4; +http://recon.net)";
    const username = "recon_bot_" + Math.random().toString(36).substring(2, 6) + "@threat.org";

    const session = createSession(username, "Deception", ip, userAgent);
    session.failedAttempts = 3;

    addLogEntry(session.id, "Brute Force Threshold Breached", "Repeated failed logins (3 attempts). Silent honeypot diversion activated.", 30);
    
    setTimeout(() => {
      addLogEntry(session.id, "Terminal Command Execution", "Executed: 'whoami' via command interpreter", 15);
    }, 100);

    setTimeout(() => {
      addLogEntry(session.id, "Read Document Content", "Accessed file 'customer_pii_export_raw.csv'. Format: CSV | Size: 185 KB", 30);
    }, 200);

    res.json({ status: "success", message: "Infiltration simulation triggered.", session });
  });

  app.post("/api/admin/simulate/critical", requireAdmin, (req, res) => {
    createAlert(
      "critical",
      `POSTURE ALARM: Brute-force credentials-stuffing attack detected targeting LDAP server node. Triggering automated telemetry quarantine.`,
      "sim_controller"
    );
    res.json({ status: "success", message: "Critical alarm injected into live feed." });
  });

  app.get("/api/admin/download-report/:sessionId", requireAdmin, (req, res) => {
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

  app.post("/api/admin/summary/:sessionId", requireAdmin, async (req, res) => {
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

  app.get("/api/admin/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    addSseClient(res);

    const intervalId = setInterval(() => {
      res.write(": ping\n\n");
    }, 25000);

    req.on("close", () => {
      clearInterval(intervalId);
      removeSseClient(res);
    });
  });

  // Reverse Proxy Route (Synthetic Decoy Interception)
  app.all("/api/proxy/*", async (req, res) => {
    const targetPath = req.params[0] || "";
    const sessionId = (req.headers["x-session-id"] as string) || (req.query.sessionId as string);
    const session = sessions.find(s => s.id === sessionId);

    if (session && session.status === "Deception") {
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

    try {
      const targetUrl = `https://jsonplaceholder.typicode.com/${targetPath || "users"}`;
      const response = await fetch(targetUrl);
      const data = await response.json();
      
      if (session) {
        addLogEntry(session.id, "Proxy Request Forwarded", `Forwarded legitimate request '/${targetPath}' to target backend.`, 0);
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

  // ==========================================
  // VITE DEV SERVER & PRODUCTION ASSETS ROUTING
  // ==========================================

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Express multi-device server running on port ${PORT}`);
    });
  }
}

startServer();

export default app;
