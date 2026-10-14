import dotenv from "dotenv";
dotenv.config();

import express from "express";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import {
  sessions,
  setSessions,
  isSessionActive,
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
  addEmployeeTicket,
  generateJwtToken,
  verifyJwtToken,
  getAllPolicies,
  getActivePolicies,
  deployNewPolicy
} from "./src/server/store.js";
import { Session, Alert } from "./src/types.js";
import { generateAttackerSummary } from "./src/server/gemini.js";
import { connectMongoDB, UserModel, SessionModel, AlertModel, LoginFailureModel, PolicyModel, AuditEventModel, isDbConnected, lastConnectionError } from "./src/server/db.js";

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

// Apply Security Headers (Helmet) without breaking Vite/React inline assets
app.use(helmet({ contentSecurityPolicy: false }));

// Middleware for parsing JSON requests
app.use(express.json());

// Lazy database connection middleware for Vercel Serverless Function invocations
app.use(async (req, res, next) => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (mongoUri && !isDbConnected()) {
    try {
      await connectMongoDB();
      await loadEmployeesFromDb().catch(() => {});
    } catch (e) {
      console.warn("MongoDB connection attempt error in middleware:", e);
    }
  }
  next();
});

// Production Health & Environment Presence Verification Endpoint (Zero Secrets Exposed)
app.get("/api/health", async (req, res) => {
  if (!isDbConnected()) {
    try {
      await connectMongoDB();
    } catch (e: any) {}
  }
  res.json({
    status: "healthy",
    dbConnected: isDbConnected(),
    dbError: lastConnectionError,
    environmentPresence: {
      MONGODB_URI: !!(process.env.MONGODB_URI || process.env.MONGO_URI),
      ADMIN_USERNAME: !!process.env.ADMIN_USERNAME,
      ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
      ADMIN_PASSWORD_HASH: !!process.env.ADMIN_PASSWORD_HASH,
      JWT_SECRET: !!process.env.JWT_SECRET,
      SESSION_SECRET: !!process.env.SESSION_SECRET
    }
  });
});

// Helper function to find a session across serverless function instances & memory cache
export async function findSession(sessionId: string): Promise<any> {
  if (!sessionId) return null;
  let session = sessions.find(s => s.id === sessionId);
  // If a cached session exists and is terminated or inactive, honor it immediately.
  if (session && (session.active === false || session.status === "Terminated" || session.status === "Expired")) {
    return session;
  }

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
          // Forward the server-assigned deception sub-environment discriminant.
          // undefined when absent (genuine sessions and legacy deception sessions).
          ...(dbSess.deceptionRole ? { deceptionRole: dbSess.deceptionRole } : {}),
          threatScore: dbSess.threatScore || 0,
          failedAttempts: dbSess.failedAttempts || 0,
          logs: dbSess.logs || [],
          generatingSummary: dbSess.generatingSummary || false,
          aiSummary: dbSess.aiSummary
        };
        const idx = sessions.findIndex(s => s.id === formattedSession.id);
        if (idx === -1) {
          sessions.unshift(formattedSession);
        } else {
          sessions[idx] = formattedSession;
        }
        return formattedSession;
      }
    } catch (e) {
      console.error("Error fetching session from DB:", e);
    }
  }

  return session || null;
}

// Helper middleware for Admin Authorization (Strict RBAC & Signature Verification)
export const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = (req.headers["authorization"] as string) || "";
  const rawToken = authHeader.replace("Bearer ", "").trim();
  const sessionIdHeader = (req.headers["x-session-id"] as string) || (req.query.sessionId as string) || req.body?.sessionId;

  // 1. Must supply either a Bearer JWT token or an authenticated session identifier
  if (!rawToken && !sessionIdHeader) {
    return res.status(401).json({ status: "error", message: "Authentication required: Missing authorization credentials." });
  }

  // 2. Validate JWT token if provided
  let jwtPayload: any = null;
  if (rawToken) {
    jwtPayload = verifyJwtToken(rawToken);
    if (!jwtPayload && !sessionIdHeader) {
      return res.status(401).json({ status: "error", message: "Unauthorized: Invalid, expired, or tampered token." });
    }
  }

  // If JWT payload exists, it MUST have role === "ADMIN" and NOT be a Deception session
  if (jwtPayload) {
    const jwtRole = String(jwtPayload.role || "").toUpperCase();
    if (jwtRole !== "ADMIN") {
      return res.status(403).json({ status: "error", message: "Forbidden: Administrative privileges required." });
    }
    if (jwtPayload.status === "Deception") {
      return res.status(403).json({ status: "error", message: "Access Denied: Deception session cannot access administrative endpoints." });
    }
  }

  // 3. Resolve target session identity
  const targetSessionId = jwtPayload?.sessionId || sessionIdHeader;
  if (!targetSessionId || targetSessionId === "admin_session" || targetSessionId === "admin") {
    // If only placeholder string was passed without verified Admin JWT, reject!
    if (!jwtPayload || String(jwtPayload.role || "").toUpperCase() !== "ADMIN") {
      return res.status(401).json({ status: "error", message: "Authentication required: Valid administrator JWT token required." });
    }
    return next();
  }

  const session = await findSession(targetSessionId);
  if (!session) {
    if (jwtPayload && String(jwtPayload.role || "").toUpperCase() === "ADMIN") {
      return next();
    }
    return res.status(401).json({ status: "error", message: "Unauthorized: Administrator session not found." });
  }

  // 4. Verify session role and status strictly
  if (session.status === "Deception") {
    return res.status(403).json({ status: "error", message: "Access Denied: Deception session cannot access administrative endpoints." });
  }

  const sessionRole = String(session.role || "").toUpperCase();
  if (sessionRole !== "ADMIN") {
    return res.status(403).json({ status: "error", message: "Forbidden: Administrator privileges required." });
  }

  return next();
};

// ==========================================
// INTELLIGENT API GATEWAY SECURITY MIDDLEWARE
// ==========================================

export const intelligentApiGateway = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.path.startsWith("/api/") || req.path.startsWith("/api/auth/")) {
    return next();
  }

  const authHeader = (req.headers["authorization"] as string) || "";
  const rawToken = authHeader.replace("Bearer ", "").trim();
  let sessionIdHeader = (req.headers["x-session-id"] as string) || (req.query.sessionId as string) || req.body?.sessionId;

  // Extract session ID from URL path if not explicitly passed in headers or body
  if (!sessionIdHeader) {
    const match = req.path.match(/(sess_[a-zA-Z0-9_-]+)/);
    if (match) {
      sessionIdHeader = match[1];
    }
  }

  const jwtPayload = verifyJwtToken(authHeader || rawToken);
  let targetSessionId = jwtPayload?.sessionId || sessionIdHeader || rawToken;
  let session = targetSessionId ? await findSession(targetSessionId) : null;

  // Reject tampered/invalid Bearer JWT tokens on protected endpoints
  if (authHeader.startsWith("Bearer ") && !jwtPayload) {
    return res.status(401).json({ status: "error", message: "Invalid, tampered, or expired JWT Token signature." });
  }

  const role = (jwtPayload?.role || session?.role || "USER").toUpperCase();
  const status = session?.status || jwtPayload?.status || "Genuine";

  const isEmployeeRoute = req.path.startsWith("/api/employee") && !req.path.startsWith("/api/employee-deception");
  const isDeceptionRoute = req.path.startsWith("/api/deception");
  const isAdminRoute = req.path.startsWith("/api/admin");
  // Employee-deception namespace: isolated honeypot for EMPLOYEE_DECEPTION sessions only
  const isEmpDeceptionRoute = req.path.startsWith("/api/employee-deception");

  // Deception session isolation: DECEPTION sessions CANNOT access Admin or Employee endpoints
  if (status === "Deception" && (isAdminRoute || isEmployeeRoute)) {
    return res.status(403).json({ status: "error", message: "Access Denied: Session restricted to deception environment." });
  }

  // EMPLOYEE_DECEPTION sessions must NOT access the Admin-panel honeypot (/api/deception/*)
  if (isDeceptionRoute && session?.deceptionRole === "EMPLOYEE_DECEPTION") {
    return res.status(403).json({ status: "error", message: "Access Denied: Endpoint unavailable in this deception environment." });
  }

  // /api/employee-deception/* is ONLY accessible to EMPLOYEE_DECEPTION sessions.
  // Genuine sessions, Admin sessions, ADMIN_DECEPTION sessions, and unauthenticated
  // requests are all rejected. The client-supplied deceptionRole is never trusted —
  // the decision is made from the server-side session object returned by findSession().
  if (isEmpDeceptionRoute) {
    if (!session || session.status !== "Deception" || session.deceptionRole !== "EMPLOYEE_DECEPTION") {
      return res.status(403).json({ status: "error", message: "Access Denied: Employee deception zone requires a valid EMPLOYEE_DECEPTION session." });
    }
  }

  // Genuine sessions CANNOT access the employee-deception namespace
  if (status === "Genuine" && isEmpDeceptionRoute) {
    return res.status(403).json({ status: "error", message: "Access Denied: Deception environment is inaccessible to genuine profiles." });
  }

  // Terminated or Revoked session rejection on Employee routes
  if (isEmployeeRoute) {
    if (!session || session.active === false || session.status === "Terminated" || session.status === "Expired") {
      return res.status(403).json({ status: "error", message: "Access Denied: Session is terminated, revoked, or expired." });
    }
    // Signature verification alone is insufficient: verify user account persists and is active in database
    if (session.username && session.username !== "admin@svit.edu") {
      if (isDbConnected()) {
        const dbUser = await (UserModel as any).findOne({ username: session.username.toLowerCase() }).lean().catch(() => null);
        if (!dbUser || dbUser.active === false) {
          return res.status(403).json({ status: "error", message: "Access Denied: Employee account has been deactivated or removed from registry." });
        }
      }
    }
  }

  // Role isolation: Non-admin EMPLOYEE sessions CANNOT access Admin endpoints
  if (role === "EMPLOYEE" && isAdminRoute) {
    return res.status(403).json({ status: "error", message: "Access Denied: Admin authorization required." });
  }

  // Genuine Employee sessions CANNOT access Deception endpoints
  if (status === "Genuine" && role !== "ADMIN" && isDeceptionRoute) {
    return res.status(403).json({ status: "error", message: "Access Denied: Deception environment is inaccessible to legitimate employee profiles." });
  }

  // Dynamic Closed-Loop Policy Gateway Enforcement
  const activePolicies = await getActivePolicies();
  for (const policy of activePolicies) {
    if (policy.action === "DECEPTION" && session && session.threatScore >= policy.threshold && session.status !== "Deception") {
      session.status = "Deception";
      if (isDbConnected()) {
        await SessionModel.updateOne({ id: session.id }, { $set: { status: "Deception" } }).catch(() => {});
      }
      await createAlert("critical", `CLOSED-LOOP GATEWAY POLICY ENFORCED: Session '${session.id}' threat score ${session.threatScore} reached threshold ${policy.threshold}. Diverted to Deception Zone.`, session.id);
    }
  }

  // Record Audit Event in MongoDB
  if (isDbConnected() && session) {
    AuditEventModel.create({
      id: "audit_" + crypto.randomUUID().replace(/-/g, "").substring(0, 10),
      timestamp: new Date().toISOString(),
      sessionId: session.id,
      username: session.username,
      role: role,
      action: `API Request: ${req.method} ${req.path}`,
      endpoint: req.path,
      method: req.method,
      status: 200,
      threatScore: session.threatScore || 0,
      decision: session.status === "Deception" ? "DECEPTION" : "ALLOW"
    }).catch(() => {});
  }

  next();
};

app.use(intelligentApiGateway);

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = (req.headers["user-agent"] as string) || "Unknown User Agent";

    if (!username) {
      return res.status(400).json({ status: "error", message: "Email or username is required." });
    }

    const normalized = username.trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    // 1. Authenticate against persistent MongoDB UserModel
    let authenticatedUser: any = null;

    if (isDbConnected()) {
      try {
        const dbUser = await (UserModel as any).findOne({ username: normalized, active: true }).lean();
        if (dbUser && dbUser.passwordHash) {
          if (bcrypt.compareSync(cleanPassword, dbUser.passwordHash) || bcrypt.compareSync(password || "", dbUser.passwordHash)) {
            authenticatedUser = dbUser;
          }
        }
      } catch (e) {}
    }

    if (!authenticatedUser) {
      const memUser = registeredUsers.find(u => u.username === normalized && u.active);
      if (memUser && memUser.passwordHash) {
        if (bcrypt.compareSync(cleanPassword, memUser.passwordHash) || bcrypt.compareSync(password || "", memUser.passwordHash)) {
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
      const session = await createSession(authenticatedUser.username, "Genuine", ip, userAgent, sessionRole, authenticatedUser.id);
      const token = generateJwtToken({
        userId: authenticatedUser.id || session.id,
        username: authenticatedUser.username,
        role: sessionRole,
        sessionId: session.id,
        status: "Genuine"
      });
      return res.json({ 
        status: "success", 
        token,
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

      // Assign EMPLOYEE_DECEPTION so Phase 4 can route this session to the
      // employee-portal honeypot rather than the admin-panel honeypot.
      const session = await createSession(normalized, "Deception", ip, userAgent, "USER", undefined, false, "EMPLOYEE_DECEPTION");
    // Mark this session as a synthetic demonstration
    session.isSimulation = true;
      const token = generateJwtToken({
        userId: session.id,
        username: normalized,
        role: "USER",
        sessionId: session.id,
        status: "Deception"
      });
      await addLogEntry(
        session.id,
        "Brute Force Threshold Breached",
        `Repeated failed logins (${failCount} attempts). Silent deceptive diversion activated.`,
        30
      );
      return res.json({ status: "success", token, session });
    } else {
      // Standard failed response
      await createAlert("warning", `Failed login attempt for user '${normalized}' (Attempt ${failCount}/3).`, "auth_system");
      return res.status(401).json({
        status: "error",
        message: `Invalid credentials. Attempt ${failCount} of 3.`
      });
    }
  } catch (err: any) {
    console.error("Critical error in employee login:", err);
    return res.status(500).json({ status: "error", message: err.message || "Internal authentication error." });
  }
});

app.post("/api/auth/admin-login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = (req.headers["user-agent"] as string) || "Unknown User Agent";

    if (!username || !password) {
      return res.status(400).json({ status: "error", message: "Admin username and password are required." });
    }

    const normalized = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Ensure DB connection is active if configured
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!isDbConnected() && mongoUri) {
      try {
        await connectMongoDB();
      } catch (e) {}
    }

    // 2. Identify configured Admin environment credentials
    const envAdminUser = (process.env.ADMIN_USERNAME || "").trim().replace(/^["']/, "").replace(/["']$/, "").trim().toLowerCase();
    const envAdminPass = (process.env.ADMIN_PASSWORD || "").trim().replace(/^["']/, "").replace(/["']$/, "").trim();
    const envAdminPassHash = (process.env.ADMIN_PASSWORD_HASH || "").trim().replace(/^["']/, "").replace(/["']$/, "").trim();

    let authenticatedAdminUser: any = null;

    // 3. Authenticate against MongoDB UserModel
    if (isDbConnected()) {
      try {
        const dbUser = await (UserModel as any).findOne({ username: normalized, active: true }).lean();
        if (dbUser && String(dbUser.role || "").toUpperCase() === "ADMIN" && dbUser.passwordHash) {
          if (bcrypt.compareSync(cleanPassword, dbUser.passwordHash) || bcrypt.compareSync(password, dbUser.passwordHash)) {
            authenticatedAdminUser = dbUser;
          }
        }
      } catch (e) {
        console.error("DB query error during admin authentication:", e);
      }
    }

    // 4. Authenticate against configured environment variables if not matched in DB yet
    if (!authenticatedAdminUser && envAdminUser && normalized === envAdminUser) {
      let isEnvPassValid = false;
      if (envAdminPassHash) {
        isEnvPassValid = bcrypt.compareSync(cleanPassword, envAdminPassHash) || bcrypt.compareSync(password, envAdminPassHash);
      } else if (envAdminPass) {
        isEnvPassValid = (cleanPassword === envAdminPass) || (password === envAdminPass) || (envAdminPass.startsWith("$2") && bcrypt.compareSync(cleanPassword, envAdminPass));
      }

      if (isEnvPassValid) {
        authenticatedAdminUser = {
          id: "usr_admin_" + crypto.randomUUID().replace(/-/g, "").substring(0, 10),
          username: normalized,
          displayName: "SOC Lead Administrator",
          role: "ADMIN"
        };

        // Synchronize this verified admin record into MongoDB so it is authoritative
        if (isDbConnected()) {
          try {
            const hashToSave = envAdminPassHash || bcrypt.hashSync(envAdminPass, 10);
            await (UserModel as any).updateOne(
              { username: normalized },
              {
                $set: {
                  username: normalized,
                  passwordHash: hashToSave,
                  displayName: "SOC Lead Administrator",
                  department: "Cybersecurity Operations",
                  role: "ADMIN",
                  active: true,
                  updatedAt: new Date().toISOString()
                },
                $setOnInsert: {
                  id: authenticatedAdminUser.id,
                  createdAt: new Date().toISOString()
                }
              },
              { upsert: true }
            );
          } catch (e) {
            console.error("Error syncing env admin user to DB:", e);
          }
        }
      }
    }

    if (authenticatedAdminUser) {
      // Successful genuine admin login — reset any recorded failure counter.
      if (isDbConnected()) {
        await (LoginFailureModel as any).deleteOne({ username: normalized }).catch(() => {});
      }
      delete loginFailures[normalized];

      const session = await createSession(authenticatedAdminUser.username, "Genuine", ip, userAgent, "ADMIN", authenticatedAdminUser.id);
      const token = generateJwtToken({
        userId: authenticatedAdminUser.id || session.id,
        username: authenticatedAdminUser.username,
        role: "ADMIN",
        sessionId: session.id,
        status: "Genuine"
      });
      return res.json({
        status: "success",
        token,
        role: "admin",
        session: {
          id: session.id,
          username: authenticatedAdminUser.displayName || authenticatedAdminUser.username,
          role: "ADMIN"
        }
      });
    }

    // 5. Track repeated failed Admin login attempts and silently divert to ADMIN_DECEPTION
    //    after the same 3-attempt threshold used for employee logins.
    //    The response is deliberately identical to a normal 401 so no account-existence
    //    information is leaked (deception branch is triggered transparently on the 3rd fail).
    let adminFailCount = 0;
    if (isDbConnected()) {
      try {
        const existing = await (LoginFailureModel as any).findOne({ username: normalized }).lean();
        adminFailCount = existing ? (existing.count || 0) + 1 : 1;
        await (LoginFailureModel as any).updateOne(
          { username: normalized },
          { $set: { count: adminFailCount, lastAttempt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("Error tracking admin login failure in DB:", err);
        const failures = loginFailures[normalized] || { count: 0, lastAttempt: Date.now() };
        failures.count += 1;
        failures.lastAttempt = Date.now();
        loginFailures[normalized] = failures;
        adminFailCount = failures.count;
      }
    } else {
      const failures = loginFailures[normalized] || { count: 0, lastAttempt: Date.now() };
      failures.count += 1;
      failures.lastAttempt = Date.now();
      loginFailures[normalized] = failures;
      adminFailCount = failures.count;
    }

    if (adminFailCount >= 3) {
      // Threshold breached — silently divert to the existing Admin-panel honeypot.
      // The attacker receives HTTP 200 and a Deception session with ADMIN_DECEPTION,
      // indistinguishable from a genuine admin login from their perspective.
      if (isDbConnected()) {
        await (LoginFailureModel as any).deleteOne({ username: normalized }).catch(() => {});
      }
      delete loginFailures[normalized];

      const deceptionSession = await createSession(
        normalized, "Deception", ip, userAgent, "USER", undefined, false, "ADMIN_DECEPTION"
      );
      const deceptionToken = generateJwtToken({
        userId: deceptionSession.id,
        username: normalized,
        role: "USER",          // Never ADMIN — deception sessions have no admin privileges
        sessionId: deceptionSession.id,
        status: "Deception"
      });
      await addLogEntry(
        deceptionSession.id,
        "Admin Brute Force Threshold Breached",
        `Repeated failed Admin login attempts (${adminFailCount} attempts). Silently diverted to Admin deception environment.`,
        35
      );
      // Return the same shape as a successful admin login so the frontend renders
      // the deception environment. The session status === 'Deception' means
      // requireAdmin and intelligentApiGateway will reject any real admin API calls.
      return res.json({
        status: "success",
        token: deceptionToken,
        role: "user",           // Intentionally 'user' — deception route in App.tsx
        session: deceptionSession
      });
    }

    // 6. If configuration is missing in production and DB has no admin
    if (!envAdminUser && !envAdminPass && !envAdminPassHash && (!isDbConnected() || !(await (UserModel as any).countDocuments({ role: "ADMIN" }).catch(() => 0)))) {
      return res.status(500).json({
        status: "error",
        message: "Admin authentication configuration missing. Please configure ADMIN_USERNAME and ADMIN_PASSWORD in environment."
      });
    }

    // Standard failure — same message regardless of whether the username exists.
    await createAlert("warning", `Failed Admin login attempt for '${normalized}' (Attempt ${adminFailCount}/3).`, "auth_system");
    return res.status(401).json({
      status: "error",
      message: "Invalid SOC Admin credentials."
    });
  } catch (err: any) {
    console.error("Critical error in admin-login:", err);
    return res.status(500).json({ status: "error", message: err.message || "Internal authentication error." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    await endSession(sessionId);
    if (isDbConnected()) {
      await AuditEventModel.create({
        id: "audit_" + crypto.randomUUID().replace(/-/g, "").substring(0, 10),
        timestamp: new Date().toISOString(),
        sessionId,
        username: "system",
        role: "USER",
        action: `Session Logout: ${sessionId}`,
        endpoint: "/api/auth/logout",
        method: "POST",
        status: 200,
        threatScore: 0,
        decision: "ALLOW"
      }).catch(() => {});
    }
  }
  res.json({ status: "success" });
});

app.get("/api/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const session = await findSession(sessionId);
  if (!session) {
    return res.status(404).json({ status: "error", message: "Session not found." });
  }
  res.json({ status: "success", session });
});

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
  const reqSessionId = sessionId || (req.headers["x-session-id"] as string);
  if (!title || !reqSessionId) {
    return res.status(400).json({ status: "error", message: "Task title and session ID are required." });
  }
  const session = await findSession(reqSessionId);
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
  const reqSessionId = sessionId || (req.headers["x-session-id"] as string);
  if (!reqSessionId) {
    return res.status(400).json({ status: "error", message: "Session ID is required." });
  }
  const session = await findSession(reqSessionId);
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
  const reqSessionId = sessionId || (req.headers["x-session-id"] as string);
  if (!code || !name || !reqSessionId) {
    return res.status(400).json({ status: "error", message: "Project details are required." });
  }
  const session = await findSession(reqSessionId);
  if (!session || session.status !== "Genuine") {
    return res.status(403).json({ status: "error", message: "Unauthorized access." });
  }

  const project = await addEmployeeProject(session.username, code, name, schedule);
  await addLogEntry(session.id, "Project Initiative Created", `Employee created project initiative '${code}: ${name}'`, 0);
  res.json({ status: "success", project });
});

app.post("/api/employee/tickets", async (req, res) => {
  const { sessionId, category, text } = req.body;
  const reqSessionId = sessionId || (req.headers["x-session-id"] as string);
  if (!text || !reqSessionId) {
    return res.status(400).json({ status: "error", message: "Ticket content and session ID are required." });
  }
  const session = await findSession(reqSessionId);
  if (!session || session.status !== "Genuine") {
    return res.status(403).json({ status: "error", message: "Unauthorized access." });
  }

  const ticket = await addEmployeeTicket(session.username, category || "IT Support", text);
  await addLogEntry(session.id, "IT Support Ticket Submitted", `Employee submitted ticket [${ticket.category}]: '${ticket.text.substring(0, 50)}'`, 0);
  await createAlert("info", `Employee '${session.username}' submitted IT ticket: [${ticket.category}] ${ticket.text.substring(0, 40)}`, session.id);
  res.json({ status: "success", ticket });
});

// ==========================================
// DECEPTION DASHBOARD ENDPOINTS (SHADOW ZONE)
// ==========================================

app.get("/api/deception/files/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const session = await findSession(sessionId);
  if (!session || session.status !== "Deception") {
    return res.status(403).json({ status: "error", message: "Unauthorized: Deception zone session required." });
  }

  await addLogEntry(sessionId, "Accessed File Directory", "Queried root filesystem contents via Cloud File Explorer", 10);

  const list = DECEPTION_FILES.map(f => ({
    name: f.name,
    type: f.type,
    size: f.size,
    sensitive: f.sensitive
  }));

  res.json({ status: "success", files: list });
});

app.get("/api/deception/file/:sessionId/:fileName", async (req, res) => {
  const { sessionId, fileName } = req.params;
  const session = await findSession(sessionId);
  if (!session || session.status !== "Deception") {
    return res.status(403).json({ status: "error", message: "Unauthorized: Deception zone session required." });
  }

  const file = DECEPTION_FILES.find(f => f.name.toLowerCase() === fileName.toLowerCase());
  if (!file) {
    return res.status(404).json({ status: "error", message: "File not found." });
  }

  const points = file.sensitive ? 30 : 5;
  const alertTag = file.sensitive ? "[HIGH SENSITIVITY]" : "[NORMAL]";
  await addLogEntry(sessionId, `Viewed Document`, `Accessed file '${file.name}' ${alertTag}. Size: ${file.size}`, points);

  res.json({ status: "success", file });
});

app.post("/api/deception/terminal/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { command } = req.body;
  const session = await findSession(sessionId);
  if (!session || session.status !== "Deception") {
    return res.status(403).json({ status: "error", message: "Unauthorized: Deception zone session required." });
  }

  if (!command) {
    return res.json({ status: "success", output: "" });
  }

  const trimmed = command.trim();
  const parts = trimmed.split(" ");
  const cmd = parts[0].toLowerCase();
  const arg = parts.slice(1).join(" ");

  await addLogEntry(sessionId, "Terminal Command Execution", `Ran terminal command: '${trimmed}'`, 25);

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
      await addLogEntry(sessionId, "Revealed Vault Secrets", "Triggered 'env' command in console to harvest environmental variables", 35);
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
          await addLogEntry(sessionId, "Read Document Content", `Read file content of '${file.name}' using terminal`, points);
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

app.post("/api/deception/search/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { query } = req.body;
  const session = await findSession(sessionId);
  if (!session || session.status !== "Deception") {
    return res.status(403).json({ status: "error", message: "Unauthorized: Deception zone session required." });
  }

  const cleanQuery = (query || "").trim().toLowerCase();
  let points = 5;

  const highThreatKeywords = ["admin", "root", "password", "key", "secret", "db", "leak", "hack", "payment", "credit"];
  const matchesKeyword = highThreatKeywords.some(keyword => cleanQuery.includes(keyword));

  if (matchesKeyword) {
    points = 15;
  }

  await addLogEntry(sessionId, "Search Console Query", `Searched deception system logs for query: '${query}'`, points);

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

app.post("/api/deception/action/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { action, details, threatPoints } = req.body;
  const session = await findSession(sessionId);
  if (!session || session.status !== "Deception") {
    return res.status(403).json({ status: "error", message: "Unauthorized: Deception zone session required." });
  }

  await addLogEntry(sessionId, action, details, threatPoints || 20);
  res.json({ status: "success", feedback: "Operation accepted and processing in sandbox environment." });
});

// ==========================================
// EMPLOYEE DECEPTION DASHBOARD ENDPOINTS (SHADOW EMPLOYEE ZONE)
// Authorization: session.status === "Deception" AND session.deceptionRole === "EMPLOYEE_DECEPTION"
// No real business collections are read or written. All data is synthetic.
// ==========================================

/**
 * Isolated synthetic employee data served to EMPLOYEE_DECEPTION sessions.
 * These constants live only in server memory — never written to any DB collection.
 */
const EMPLOYEE_DECEPTION_DATA = {
  profile: {
    department: "Network Operations",
    position: "Level 2 Technician",
    staffId: "SVIT_EMP_2026_7741",
    payrollStatus: "Disbursed (Verified)",
    leaveBalance: "12 / 24 Days",
    clearanceLevel: "LEVEL 2 APPROVED",
    clearancePct: 50
  },
  tasks: [
    { id: "dtask_001", title: "Verify cable routes in Server Room B", completed: true },
    { id: "dtask_002", title: "Update network switch firmware — Rack 3", completed: false },
    { id: "dtask_003", title: "Submit quarterly incident summary report", completed: false },
    { id: "dtask_004", title: "Run scheduled UPS battery load test", completed: true }
  ],
  projects: [
    { code: "PRJ-555", name: "Campus VPN Rollout — Phase 2", schedule: "Deadline: Nov 20", status: "Active" },
    { code: "PRJ-612", name: "Fibre Backbone Inspection & Audit", schedule: "Deadline: Dec 05", status: "Active" },
    { code: "PRJ-489", name: "Endpoint Compliance Validation", schedule: "Deadline: Jan 15", status: "Pending Review" }
  ],
  systemPostures: {
    switchFabric: "Operational (48-port)",
    vpnTunnel: "Secure (6 Active Tunnels)",
    threatLevel: "Low / Normal",
    endpoints: "18/18 Compliant"
  }
};

/**
 * Helper: validate that a session is a live EMPLOYEE_DECEPTION session.
 * Returns the session or null. Never trusts client-provided fields.
 */
async function resolveEmpDeceptionSession(sessionId: string): Promise<any> {
  if (!sessionId) return null;
  const session = await findSession(sessionId);
  if (
    !session ||
    session.status !== "Deception" ||
    session.deceptionRole !== "EMPLOYEE_DECEPTION" ||
    session.active === false
  ) return null;
  return session;
}

/** GET /api/employee-deception/dashboard/:sessionId
 *  Returns the isolated synthetic employee dashboard payload.
 *  Records a "Dashboard Accessed" telemetry event.
 */
app.get("/api/employee-deception/dashboard/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const session = await resolveEmpDeceptionSession(sessionId);
  if (!session) {
    return res.status(403).json({ status: "error", message: "Unauthorized: Valid EMPLOYEE_DECEPTION session required." });
  }

  await addLogEntry(
    session.id,
    "Employee Deception Dashboard Accessed",
    "Attacker loaded the employee-portal honeypot dashboard.",
    10
  );

  return res.json({
    status: "success",
    data: EMPLOYEE_DECEPTION_DATA
  });
});

/** POST /api/employee-deception/action/:sessionId
 *  Records a decoy employee interaction (task view, project click, ticket submit).
 *  Returns a synthetic success response; no real collection is written.
 *  Idempotency note: each call is intentionally recorded as a distinct event
 *  because each client-side interaction represents a new attacker action.
 */
app.post("/api/employee-deception/action/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { action, details, threatPoints } = req.body;
  const session = await resolveEmpDeceptionSession(sessionId);
  if (!session) {
    return res.status(403).json({ status: "error", message: "Unauthorized: Valid EMPLOYEE_DECEPTION session required." });
  }

  if (!action) {
    return res.status(400).json({ status: "error", message: "Action description is required." });
  }

  const safePoints = Math.min(50, Math.max(0, Number(threatPoints) || 15));
  await addLogEntry(
    session.id,
    `[EMP-DECEPTION] ${String(action).substring(0, 120)}`,
    `DECOY INTERACTION — ${String(details || action).substring(0, 200)}`,
    safePoints
  );

  return res.json({
    status: "success",
    feedback: "Request submitted. Processing in secure operations queue."
  });
});

/** POST /api/employee-deception/ticket/:sessionId
 *  Simulates an IT helpdesk ticket submission.
 *  Returns a synthetic ticket ID; nothing is written to TicketModel.
 */
app.post("/api/employee-deception/ticket/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { category, text } = req.body;
  const session = await resolveEmpDeceptionSession(sessionId);
  if (!session) {
    return res.status(403).json({ status: "error", message: "Unauthorized: Valid EMPLOYEE_DECEPTION session required." });
  }

  if (!text) {
    return res.status(400).json({ status: "error", message: "Ticket text is required." });
  }

  const fakeTicketId = "TKT-DEC-" + Math.floor(1000 + Math.random() * 9000);
  const safeCategory = String(category || "IT Support").substring(0, 50);
  const safeText = String(text).substring(0, 300);

  await addLogEntry(
    session.id,
    "[EMP-DECEPTION] IT Ticket Submitted",
    `DECOY TICKET [${safeCategory}]: '${safeText.substring(0, 80)}' — assigned ID ${fakeTicketId}`,
    20
  );

  return res.json({
    status: "success",
    ticket: {
      id: fakeTicketId,
      category: safeCategory,
      text: safeText,
      status: "Open",
      date: new Date().toISOString().split("T")[0]
    }
  });
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
    await createAlert("info", `Admin provisioned a new employee credential for '${employee.username}' (${employee.department} - ${employee.role}).`, "admin_console");
    res.json({ status: "success", message: `Employee '${employee.username}' registered successfully.`, employee });
  } catch (err: any) {
    res.status(400).json({ status: "error", message: err.message || "Registration failed." });
  }
});

app.delete("/api/admin/employees/:identifier", requireAdmin, async (req, res) => {
  const { identifier } = req.params;
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!isDbConnected() && mongoUri) {
      try {
        await connectMongoDB();
      } catch (e) {}
    }

    const result = await removeEmployee(identifier);

    if (!result.success) {
      if (result.code === "NOT_FOUND") {
        return res.status(404).json({ status: "error", code: "NOT_FOUND", message: result.message });
      }
      if (result.code === "FORBIDDEN") {
        return res.status(403).json({ status: "error", code: "FORBIDDEN", message: result.message });
      }
      return res.status(500).json({ status: "error", code: result.code, message: result.message });
    }

    // Record EXACTLY ONE alert for confirmed successful removal
    await createAlert(
      "warning",
      `Admin removed employee '${result.employee?.username}' (ID: ${result.employee?.id}) from company registry. Access revoked.`,
      "admin_console"
    );

    res.json({
      status: "success",
      message: result.message,
      employee: result.employee,
      deletedCount: result.deletedCount,
      revokedSessionsCount: result.revokedSessionsCount
    });
  } catch (err: any) {
    console.error("Critical error in employee removal endpoint:", err);
    res.status(500).json({ status: "error", message: err.message || "Removal failed." });
  }
});

app.get("/api/admin/sessions", requireAdmin, async (req, res) => {
  if (isDbConnected()) {
    try {
      const dbSessions = await (SessionModel as any).find().sort({ _id: -1 }).lean();
      if (dbSessions) {
        const mapped = dbSessions.map((s: any) => ({
          id: s.id || s.sessionId,
          username: s.username,
          role: s.role || "USER",
          ip: s.ip || "127.0.0.1",
          userAgent: s.userAgent || "Browser",
          loginTime: s.loginTime || new Date().toISOString(),
          status: s.status,
          ...(s.deceptionRole ? { deceptionRole: s.deceptionRole } : {}),
          threatScore: s.threatScore || 0,
          failedAttempts: s.failedAttempts || 0,
          generatingSummary: s.generatingSummary || false,
          aiSummary: s.aiSummary,
          logs: s.logs || []
        }));
        return res.json({ status: "success", sessions: mapped });
      }
    } catch (err: any) {
      console.error("Error fetching sessions from DB:", err);
      return res.status(503).json({ status: "error", message: "Database query failed for active sessions." });
    }
  }
  res.json({ status: "success", sessions });
});

app.get("/api/admin/alerts", requireAdmin, async (req, res) => {
  if (isDbConnected()) {
    try {
      const dbAlerts = await (AlertModel as any).find().sort({ _id: -1 }).limit(50).lean();
      if (dbAlerts) {
        return res.json({ status: "success", alerts: dbAlerts });
      }
    } catch (err: any) {
      console.error("Error fetching alerts from DB:", err);
      return res.status(503).json({ status: "error", message: "Database query failed for alerts." });
    }
  }
  res.json({ status: "success", alerts });
});

app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  let targetSessions = sessions;
  if (isDbConnected()) {
    try {
      const dbSessions = await (SessionModel as any).find().lean();
      if (dbSessions && dbSessions.length > 0) {
        targetSessions = dbSessions.map((s: any) => ({
          id: s.id || s.sessionId,
          username: s.username,
          role: s.role || "USER",
          ip: s.ip || "127.0.0.1",
          userAgent: s.userAgent || "Browser",
          loginTime: s.loginTime || new Date().toISOString(),
          status: s.status,
          ...(s.deceptionRole ? { deceptionRole: s.deceptionRole } : {}),
          threatScore: s.threatScore || 0,
          failedAttempts: s.failedAttempts || 0,
          generatingSummary: s.generatingSummary || false,
          aiSummary: s.aiSummary,
          logs: s.logs || []
        }));
      }
    } catch (err) {
      console.error("Error fetching sessions in /api/admin/stats:", err);
    }
  }
  res.json({ status: "success", stats: getStats(targetSessions) });
});

// Production-friendly Polling endpoint for Multi-Device Admin Sync across Vercel Functions
app.get("/api/admin/events-poll", requireAdmin, async (req, res) => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!isDbConnected() && mongoUri) {
      try {
        await connectMongoDB();
        await loadEmployeesFromDb().catch(() => {});
      } catch (e) {
        console.warn("Database reconnection attempt in poll endpoint:", e);
      }
    }

    let resolvedSessions: Session[] = [];
    let resolvedAlerts: Alert[] = [];
    let resolvedEmployees: any[] = [];
    let resolvedPolicies: any[] = await getAllPolicies();

    if (isDbConnected()) {
      try {
        const now = new Date();
        const idleThreshold = new Date(Date.now() - 45 * 60 * 1000).toISOString();

        // Expire any sessions that passed expiresAt or have been idle for > 45 mins
        await (SessionModel as any).updateMany(
          {
            active: true,
            $or: [
              { expiresAt: { $lte: now } },
              { lastActivityAt: { $lte: idleThreshold } }
            ]
          },
          { $set: { active: false, status: "Expired" } }
        ).catch(() => {});

        // Query ONLY currently active sessions for the live monitoring view
        const [dbSessions, dbAlerts, empList, polList] = await Promise.all([
          (SessionModel as any).find({ 
            active: true, 
            status: { $in: ["Genuine", "Deception"] } 
          }).sort({ _id: -1 }).lean(),
          (AlertModel as any).find().sort({ _id: -1 }).limit(50).lean(),
          (UserModel as any).find({ role: "EMPLOYEE" }, { passwordHash: 0 }).lean(),
          getAllPolicies()
        ]);

        if (dbSessions) {
          resolvedSessions = dbSessions.map((s: any) => ({
            id: s.id || s.sessionId,
            sessionId: s.sessionId || s.id,
            userId: s.userId || "",
            username: s.username,
            role: s.role || "USER",
            ip: s.ip || "127.0.0.1",
            userAgent: s.userAgent || "Browser",
            loginTime: s.loginTime || new Date().toISOString(),
            lastActivityAt: s.lastActivityAt || s.loginTime,
            expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString() : undefined,
            status: s.status,
            // Propagate the server-assigned deception sub-environment discriminant.
            // Spread-only-if-defined so genuine and legacy sessions stay clean.
            ...(s.deceptionRole ? { deceptionRole: s.deceptionRole } : {}),
            active: s.active !== false,
            isSimulation: Boolean(s.isSimulation),
            threatScore: s.threatScore || 0,
            failedAttempts: s.failedAttempts || 0,
            generatingSummary: s.generatingSummary || false,
            aiSummary: s.aiSummary,
            logs: s.logs || []
          }));

          // Synchronize in-memory cache to only reflect active sessions
          setSessions(resolvedSessions);
        }

        if (dbAlerts && dbAlerts.length > 0) {
          resolvedAlerts = dbAlerts;
        }

        if (empList) {
          resolvedEmployees = empList.map((d: any) => ({
            id: d.id || d._id,
            username: d.username,
            displayName: d.displayName || d.username,
            department: d.department || "General Operations",
            role: d.role || "EMPLOYEE",
            active: d.active !== false,
            createdAt: d.createdAt
          }));
        }

        if (polList && polList.length > 0) {
          resolvedPolicies = polList;
        }
      } catch (dbQueryErr: any) {
        console.error("Database query error in /api/admin/events-poll:", dbQueryErr);
        return res.status(503).json({
          status: "error",
          code: "DB_QUERY_FAILURE",
          message: "Database query failed during telemetry poll. Preserving active state.",
          details: dbQueryErr.message
        });
      }
    } else {
      resolvedSessions = sessions.filter(s => isSessionActive(s));
      resolvedAlerts = alerts;
      resolvedEmployees = registeredUsers.filter(u => u.role === "EMPLOYEE");
    }

    const calculatedStats = getStats(resolvedSessions);

    return res.json({
      status: "success",
      timestamp: Date.now(),
      sessions: resolvedSessions,
      alerts: resolvedAlerts,
      employees: resolvedEmployees,
      policies: resolvedPolicies,
      stats: calculatedStats
    });
  } catch (err: any) {
    console.error("Critical error in /api/admin/events-poll:", err);
    return res.status(500).json({
      status: "error",
      code: "INTERNAL_POLL_ERROR",
      message: err.message || "Failed to retrieve telemetry events."
    });
  }
});

// ==========================================
// CLOSED-LOOP SECURITY POLICY ENDPOINTS
// ==========================================

app.get("/api/admin/policies", requireAdmin, async (req, res) => {
  const pols = await getAllPolicies();
  res.json({ status: "success", policies: pols });
});

app.post("/api/admin/policies/deploy", requireAdmin, async (req, res) => {
  const { title, trigger, condition, action, threshold, scope, priority, version, sourceEvent } = req.body;
  if (!title || !action) {
    return res.status(400).json({ status: "error", message: "Policy title and enforcement action are required." });
  }

  try {
    const deployed = await deployNewPolicy({
      title,
      trigger: trigger || "Observed Intrusion Behavior",
      condition: condition || "threatScore >= threshold",
      action: action || "DECEPTION",
      threshold: threshold || 50,
      scope: scope || "GATEWAY_ENFORCEMENT",
      priority: priority || 1,
      version: version || 1,
      sourceEvent: sourceEvent || "AI_ATTACK_ANALYSIS"
    });

    res.json({ status: "success", message: `Policy '${deployed.title}' (${deployed.policyId}) deployed successfully to API Gateway!`, policy: deployed });
  } catch (err: any) {
    res.status(400).json({ status: "error", message: err.message || "Policy deployment failed." });
  }
});

app.patch("/api/admin/policies/:policyId/toggle", requireAdmin, async (req, res) => {
  const { policyId } = req.params;
  const { status } = req.body;
  const newStatus = status === "ACTIVE" ? "ACTIVE" : "INACTIVE";

  if (isDbConnected()) {
    await (PolicyModel as any).updateOne({ policyId }, { $set: { status: newStatus } }).catch(() => {});
  }

  await createAlert("info", `Admin toggled Security Policy [${policyId}] status to ${newStatus}.`, "admin_policy_engine");
  res.json({ status: "success", policyId, policyStatus: newStatus });
});

app.get("/api/admin/audit-events", requireAdmin, async (req, res) => {
  if (isDbConnected()) {
    try {
      const dbAudits = await (AuditEventModel as any).find().sort({ _id: -1 }).limit(100).lean();
      if (dbAudits && dbAudits.length > 0) {
        return res.json({ status: "success", auditEvents: dbAudits });
      }
    } catch (e) {}
  }
  res.json({ status: "success", auditEvents: [] });
});

app.post("/api/admin/simulate/brute", requireAdmin, async (req, res) => {
  const ip = "185.220.101." + Math.floor(Math.random() * 254 + 1);
  const userAgent = "Mozilla/5.0 (compatible; BotnetScanner/2.4; +http://recon.net)";
  const username = "recon_bot_" + Math.random().toString(36).substring(2, 6) + "@threat.org";

  const session = await createSession(username, "Deception", ip, userAgent, "USER", undefined, true);
  session.failedAttempts = 3;

  await addLogEntry(session.id, "Brute Force Threshold Breached", "Repeated failed logins (3 attempts). Silent honeypot diversion activated. [SIMULATION DEMONSTRATION]", 30);
  await addLogEntry(session.id, "Terminal Command Execution", "Executed: 'whoami' via command interpreter [SIMULATION DEMONSTRATION]", 15);
  await addLogEntry(session.id, "Read Document Content", "Accessed file 'customer_pii_export_raw.csv'. Format: CSV | Size: 185 KB [SIMULATION DEMONSTRATION]", 30);

  await createAlert("critical", `[SIMULATION DEMO] Botnet infiltration simulation initiated for '${username}'. Diverted to Deception zone.`, session.id);
+    // Attach simulation marker to alert via message prefix (already present)
+    // No dedicated field in Alert model; using message prefix for identification

  res.json({ status: "success", message: "Infiltration simulation triggered.", session });
});

app.post("/api/admin/simulate/critical", requireAdmin, async (req, res) => {
  await createAlert(
    "critical",
    `[SIMULATION DEMO] POSTURE ALARM: Brute-force credentials-stuffing attack detected targeting LDAP server node. Triggering automated telemetry quarantine.`,
    "sim_controller"
  );
  res.json({ status: "success", message: "Critical alarm injected into live feed." });
});

app.get("/api/admin/download-report/:sessionId", requireAdmin, async (req, res) => {
  const { sessionId } = req.params;
  const session = await findSession(sessionId);
  if (!session) {
    return res.status(404).send("Error: Session not found.");
  }

  let csvContent = "Timestamp,Action,Details,Threat Score Contribution\n";
  (session.logs || []).forEach((log: any) => {
    const escapedDetails = (log.details || "").replace(/"/g, '""');
    csvContent += `"${log.timestamp}","${log.action}","${escapedDetails}",${log.threatPoints}\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=deception_telemetry_report_${sessionId}.csv`);
  res.status(200).send(csvContent);
});

app.post("/api/admin/summary/:sessionId", requireAdmin, async (req, res) => {
  const { sessionId } = req.params;
  const session = await findSession(sessionId);
  if (!session) {
    return res.status(404).json({ status: "error", message: "Session not found." });
  }

  session.generatingSummary = true;
  broadcastToAdmins("session_update", session);

  try {
    const summary = await generateAttackerSummary(session);
    session.aiSummary = summary;
    session.generatingSummary = false;
    if (isDbConnected()) {
      await SessionModel.updateOne({ id: sessionId }, { $set: { aiSummary: summary } }).catch(() => {});
    }
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
  const session = sessionId ? await findSession(sessionId) : null;

  if (session && session.status === "Deception") {
    await addLogEntry(session.id, "Proxy Access Intercepted", `Intercepted query to '/${targetPath}'. Silently served synthetic honeypot decoy data.`, 25);
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
      await addLogEntry(session.id, "Proxy Request Forwarded", `Forwarded legitimate request '/${targetPath}' to target backend.`, 0);
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

if (!process.env.VERCEL) {
  (async () => {
    await connectMongoDB();
    await loadEmployeesFromDb();

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

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Express multi-device server running on port ${PORT}`);
    });
  })().catch(err => {
    console.error("Server startup error:", err);
  });
}

export default app;
