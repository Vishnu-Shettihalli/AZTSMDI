import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Session, LogEntry, Alert, DashboardStats } from '../types.js';
import { UserModel, SessionModel, AlertModel, TaskModel, ProjectModel, TicketModel, isDbConnected } from './db.js';
import { generateAttackerSummary } from './gemini.js';

// In-memory cache synced with MongoDB
export let sessions: Session[] = [];
export let alerts: Alert[] = [];
export let registeredUsers: any[] = [];
export let tasksCache: any[] = [];
export let projectsCache: any[] = [];
export let ticketsCache: any[] = [];
export const loginFailures: Record<string, { count: number; lastAttempt: number }> = {};

// SSE connection subscribers
export let sseClients: any[] = [];

// Synthetic deception research files (Decoy Assets)
export const DECEPTION_FILES = [
  {
    name: 'q3_merger_acquisition_plan.pdf',
    type: 'pdf',
    size: '14.2 MB',
    sensitive: true,
    content: 'CONFIDENTIAL SYNTHETIC DECOY: APEX CORP ACQUISITION STRATEGY Q3 2026. Target: CoreLogic solutions. Capital allocated: $42.5M. Strategy details: Undergoing silent stock buyback, finalizing board resolution. Authorized readers: Board of Directors only.'
  },
  {
    name: 'customer_pii_export_raw.csv',
    type: 'csv',
    size: '185 KB',
    sensitive: true,
    content: 'id,first_name,last_name,email,ssn,credit_card,phone\n1,James,Mercer,j.mercer@test.sec,***-**-3940,4111-****-****-1120,+1-555-0199\n2,Sarah,Conner,sconner@test.sec,***-**-1029,5520-****-****-9482,+1-555-1024\n3,Bruce,Wayne,bruce@test.sec,***-**-0001,4000-****-****-0001,+1-555-8888\n4,Clark,Kent,clark@test.sec,***-**-1122,4111-****-****-2233,+1-555-4433'
  },
  {
    name: 'infrastructure_network_map.vsd',
    type: 'vsd',
    size: '4.8 MB',
    sensitive: true,
    content: 'SYNTHETIC TOPOLOGY DIAGRAM: Core Router 10.0.0.1 -> Gateway PEP Firewall 10.0.0.5 -> Deception Zone Cluster 10.0.4.0/24 (Honeypot Decoy). Target DB Replica: 10.0.4.15.'
  },
  {
    name: 'private_ssh_key_root.pem',
    type: 'pem',
    size: '2.1 KB',
    sensitive: true,
    content: '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\nQyNTUxOQAAACCS+3J7+... SYNTHETIC DECOY REQUISITE: DO NOT EXPOSE ...-----END OPENSSH PRIVATE KEY-----'
  }
];

export function addSseClient(res: any) {
  sseClients.push(res);
}

export function removeSseClient(res: any) {
  sseClients = sseClients.filter(c => c !== res);
}

export function broadcastToAdmins(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data })}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(payload);
    } catch (err) {
      // client disconnected
    }
  });
}

// Create a new security session with persistent UUID
export function createSession(username: string, status: 'Genuine' | 'Deception', ip: string, userAgent: string, role: string = "USER", userId?: string): Session {
  const uuid = "sess_" + crypto.randomUUID().replace(/-/g, "").substring(0, 16);
  const now = new Date().toISOString();
  
  const session: Session = {
    id: uuid,
    username,
    role,
    ip: ip || "127.0.0.1",
    userAgent: userAgent || "Browser",
    loginTime: now,
    status,
    threatScore: status === 'Deception' ? 50 : 0,
    failedAttempts: 0,
    logs: [],
    generatingSummary: false
  };

  // Add to local cache array
  sessions.unshift(session);

  // Sync to MongoDB Cloud Atlas
  if (isDbConnected()) {
    SessionModel.create({
      id: session.id,
      sessionId: session.id,
      userId: userId || "",
      username: session.username,
      role: role,
      status: session.status,
      threatScore: session.threatScore,
      failedAttempts: 0,
      ip: session.ip,
      userAgent: session.userAgent,
      loginTime: session.loginTime,
      lastActivityAt: now,
      logs: []
    }).catch(e => console.error("Error saving session to MongoDB:", e));
  }

  // Add initial log entry
  addLogEntry(session.id, 'Session Initiated', `User logged in. Security classification: ${status}.`, status === 'Deception' ? 50 : 0);

  if (status === 'Deception') {
    createAlert('critical', `Policy Enforcement: Silently diverted traffic for '${username}' into Shadow Deception Zone.`, session.id);
  } else {
    createAlert('info', `Legitimate user session established for '${username}'.`, session.id);
  }

  return session;
}

// Add telemetry log entry to a session and persist to MongoDB
export async function addLogEntry(sessionId: string, action: string, details: string, basePoints: number) {
  let session = sessions.find(s => s.id === sessionId);
  
  if (!session && isDbConnected()) {
    try {
      const dbSess = await (SessionModel as any).findOne({ id: sessionId }).lean();
      if (dbSess) {
        session = {
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
        sessions.unshift(session);
      }
    } catch (e) {
      console.error("Error loading session from DB in addLogEntry:", e);
    }
  }

  if (!session) return;

  const timestamp = new Date().toISOString();
  let points = basePoints;

  // Rule 1: Rapid clicks detection algorithm
  if (session.logs.length > 0) {
    const lastLog = session.logs[session.logs.length - 1];
    const timeDiff = new Date(timestamp).getTime() - new Date(lastLog.timestamp).getTime();
    if (timeDiff < 1500) {
      points += 20;
      details += ' [ALGORITHM DETECTION: Rapid automated navigation pattern detected (+20 threat)]';
      createAlert('warning', `Suspicious behavior on Session ${session.id}: Rapid automated click actions (${timeDiff}ms).`, session.id);
    }
  }

  // Rule 2: Out of sequence secret views
  if (action === 'Reveal Vault Secrets' && session.logs.length <= 2) {
    points += 25;
    details += ' [ALGORITHM DETECTION: Out-of-sequence navigation. Secrets queried on session initialization (+25 threat)]';
    createAlert('warning', `Out-of-sequence security action: Vault revealed early in session.`, session.id);
  }

  const logId = "log_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
  const log: LogEntry = {
    id: logId,
    timestamp,
    action,
    details,
    threatPoints: points
  };

  session.logs.push(log);
  session.threatScore = Math.min(100, session.threatScore + points);

  if (points >= 25 && session.status === 'Deception') {
    createAlert('critical', `Intrusion Alert: Attacker performed high-threat action '${action}' in Shadow Zone. Details: ${details}`, session.id);
  }

  // Auto-generate AI Summary in background if session has actions
  if (!session.generatingSummary && session.logs.length >= 2) {
    generateAttackerSummary(session).then(summary => {
      if (session) {
        session.aiSummary = summary;
        if (isDbConnected()) {
          SessionModel.updateOne({ id: sessionId }, { $set: { aiSummary: summary } }).catch(() => {});
        }
        broadcastToAdmins('session_update', session);
      }
    }).catch(() => {});
  }

  // Sync log & threat score update to MongoDB Cloud Atlas
  if (isDbConnected()) {
    SessionModel.updateOne(
      { id: sessionId },
      { 
        $set: { 
          logs: session.logs, 
          threatScore: session.threatScore, 
          aiSummary: session.aiSummary,
          lastActivityAt: timestamp
        } 
      }
    ).catch(e => console.error("Error updating session telemetry in MongoDB:", e));
  }

  broadcastToAdmins('session_update', session);
}

// Create an alert
export function createAlert(type: 'info' | 'warning' | 'critical', message: string, sessionId: string) {
  const alertId = "alert_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);
  const alert: Alert = {
    id: alertId,
    timestamp: new Date().toISOString(),
    type,
    message,
    sessionId
  };

  alerts.unshift(alert);
  if (alerts.length > 50) alerts.pop();

  if (isDbConnected()) {
    AlertModel.create(alert).catch(e => console.error("Error saving alert to MongoDB:", e));
  }

  broadcastToAdmins('new_alert', alert);
}

// Terminate / end a session
export function endSession(sessionId: string) {
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions.splice(index, 1);

    if (isDbConnected()) {
      SessionModel.deleteOne({ id: sessionId }).catch(e => console.error("Error deleting session from MongoDB:", e));
    }

    broadcastToAdmins('session_deleted', sessionId);
    return true;
  }
  return false;
}

// Aggregate Dashboard metrics
export function getStats(sessionList?: Session[]): DashboardStats {
  const targetSessions = sessionList || sessions;
  const totalSessions = targetSessions.length;
  const activeGenuine = targetSessions.filter(s => String(s.status).toLowerCase() === 'genuine').length;
  const activeDeception = targetSessions.filter(s => String(s.status).toLowerCase() === 'deception').length;
  
  const totalThreat = targetSessions.reduce((acc, s) => acc + (s.threatScore || 0), 0);
  const avgThreatScore = totalSessions > 0 ? Math.round(totalThreat / totalSessions) : 0;

  // Resource access frequency counting
  const resourceCounts: Record<string, number> = {};
  targetSessions.forEach(s => {
    (s.logs || []).forEach(l => {
      if (l.action && (l.action.includes('Viewed Document') || l.action.includes('Reveal Vault Secrets') || l.action.includes('Terminal Command') || l.action.includes('Task') || l.action.includes('Ticket') || l.action.includes('Initiated'))) {
        const key = l.action + ' - ' + (l.details ? l.details.split('.')[0] : '');
        resourceCounts[key] = (resourceCounts[key] || 0) + 1;
      }
    });
  });

  const resourceAccessCounts = Object.entries(resourceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalSessions,
    activeGenuine,
    activeDeception,
    avgThreatScore,
    mostAccessedResource: resourceAccessCounts[0]?.name || "None",
    resourceAccessCounts
  };
}

// Load users, sessions, and alerts from MongoDB on server start
export async function loadEmployeesFromDb() {
  if (isDbConnected()) {
    try {
      // Sessions from MongoDB
      const dbSessions = await (SessionModel as any).find().lean();
      if (dbSessions && dbSessions.length > 0) {
        sessions = dbSessions.map((s: any) => ({
          id: s.id || s.sessionId,
          username: s.username,
          ip: s.ip || "127.0.0.1",
          userAgent: s.userAgent || "Browser",
          loginTime: s.loginTime || new Date().toISOString(),
          status: (s.status as "Genuine" | "Deception") || "Genuine",
          threatScore: s.threatScore || 0,
          failedAttempts: s.failedAttempts || 0,
          generatingSummary: false,
          aiSummary: s.aiSummary,
          logs: (s.logs || []).map((l: any) => ({
            id: l.id || "log_" + crypto.randomUUID().replace(/-/g, "").substring(0, 8),
            timestamp: l.timestamp || new Date().toISOString(),
            action: l.action || "",
            details: l.details || "",
            threatPoints: l.threatPoints || 0
          }))
        }));
      }

      // Alerts from MongoDB
      const dbAlerts = await (AlertModel as any).find().lean();
      if (dbAlerts && dbAlerts.length > 0) {
        alerts = dbAlerts.map((a: any) => ({
          id: a.id,
          timestamp: a.timestamp || new Date().toISOString(),
          type: (a.type as "info" | "warning" | "critical") || "info",
          message: a.message,
          sessionId: a.sessionId || ""
        }));
      }

      const userCount = await (UserModel as any).countDocuments();
      console.log(`✅ MongoDB Synced: Loaded ${userCount} persistent users, ${sessions.length} sessions, and ${alerts.length} alerts.`);
    } catch (e) {
      console.error("Error loading state from MongoDB:", e);
    }
  }
}

// Register a new employee in MongoDB with hashed password
export async function registerEmployee(username: string, password: string, department: string = "General Operations", role: string = "EMPLOYEE", displayName?: string) {
  const normalized = username.trim().toLowerCase();
  const passHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  
  if (isDbConnected()) {
    const existing = await (UserModel as any).findOne({ username: normalized }).lean();
    if (existing) {
      const updated = await (UserModel as any).findOneAndUpdate(
        { username: normalized },
        { 
          $set: { 
            passwordHash: passHash, 
            department: department || existing.department || "General Operations",
            role: role.toUpperCase() === "ADMIN" ? "ADMIN" : "EMPLOYEE",
            active: true,
            updatedAt: now
          } 
        },
        { new: true }
      ).lean();

      const memIdx = registeredUsers.findIndex(u => u.username === normalized);
      if (memIdx !== -1) {
        registeredUsers[memIdx].passwordHash = passHash;
        registeredUsers[memIdx].department = department;
      }

      console.log(`✅ MongoDB Updated existing user '${normalized}' credentials.`);
      return {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName || updated.username,
        department: updated.department,
        role: updated.role,
        createdAt: updated.createdAt
      };
    }
  } else {
    const existingMemory = registeredUsers.find(u => u.username === normalized);
    if (existingMemory) {
      existingMemory.passwordHash = passHash;
      existingMemory.department = department;
      return {
        id: existingMemory.id,
        username: existingMemory.username,
        displayName: existingMemory.displayName,
        department: existingMemory.department,
        role: existingMemory.role,
        createdAt: existingMemory.createdAt
      };
    }
  }

  const userId = "usr_" + crypto.randomUUID().replace(/-/g, "").substring(0, 12);

  const newUser = {
    id: userId,
    username: normalized,
    passwordHash: passHash,
    displayName: displayName || normalized.split("@")[0],
    department: department || "General Operations",
    role: role.toUpperCase() === "ADMIN" ? "ADMIN" : "EMPLOYEE",
    active: true,
    createdAt: now,
    updatedAt: now
  };

  registeredUsers.push(newUser);

  if (isDbConnected()) {
    await (UserModel as any).create(newUser);
    console.log(`✅ MongoDB Created user '${normalized}' (Role: ${newUser.role}).`);
  }

  return {
    id: newUser.id,
    username: newUser.username,
    displayName: newUser.displayName,
    department: newUser.department,
    role: newUser.role,
    createdAt: newUser.createdAt
  };
}

// Remove an employee from MongoDB
export async function removeEmployee(username: string) {
  const normalized = username.trim().toLowerCase();

  registeredUsers = registeredUsers.filter(u => u.username !== normalized);

  if (isDbConnected()) {
    const res = await (UserModel as any).deleteOne({ username: normalized });
    console.log(`✅ MongoDB Deleted user '${normalized}' (Count: ${res.deletedCount})`);
  }

  return { username: normalized };
}

// Query all registered users from MongoDB
export async function getRegisteredEmployees() {
  if (isDbConnected()) {
    const docs = await (UserModel as any).find({}, { passwordHash: 0 }).lean();
    return docs.map((d: any) => ({
      id: d.id,
      username: d.username,
      displayName: d.displayName || d.username,
      department: d.department || "General Operations",
      role: d.role || "EMPLOYEE",
      createdAt: d.createdAt
    }));
  }
  return registeredUsers.map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    department: u.department,
    role: u.role,
    createdAt: u.createdAt
  }));
}

// ==========================================
// REAL EMPLOYEE DATA MANAGEMENT
// ==========================================

export async function getEmployeeData(username: string) {
  const normalized = username.trim().toLowerCase();
  
  let tasks: any[] = [];
  let projects: any[] = [];
  let tickets: any[] = [];

  if (isDbConnected()) {
    tasks = await (TaskModel as any).find({ username: normalized }).lean();
    projects = await (ProjectModel as any).find({ username: normalized }).lean();
    tickets = await (TicketModel as any).find({ username: normalized }).sort({ _id: -1 }).lean();
  } else {
    tasks = tasksCache.filter(t => t.username === normalized);
    projects = projectsCache.filter(p => p.username === normalized);
    tickets = ticketsCache.filter(tk => tk.username === normalized);
  }

  // Seed default initial tasks if user has none
  if (tasks.length === 0) {
    const initialTasks = [
      { id: "task_101", username: normalized, title: "Review quarterly IT security compliance report", completed: true, createdAt: new Date().toISOString() },
      { id: "task_102", username: normalized, title: "Approve server maintenance window for Rack 4", completed: false, createdAt: new Date().toISOString() },
      { id: "task_103", username: normalized, title: "Submit annual employee performance self-appraisal", completed: false, createdAt: new Date().toISOString() },
      { id: "task_104", username: normalized, title: "Complete mandatory zero-trust security refresher course", completed: true, createdAt: new Date().toISOString() }
    ];
    for (const t of initialTasks) {
      tasksCache.push(t);
      if (isDbConnected()) {
        await (TaskModel as any).create(t).catch(() => {});
      }
    }
    tasks = initialTasks;
  }

  // Seed default initial projects if user has none
  if (projects.length === 0) {
    const initialProjects = [
      { id: "prj_901", code: "PRJ-901", name: "Campus Network Infrastructure Upgrade", schedule: "Deadline: Aug 15", status: "Active", username: normalized, createdAt: new Date().toISOString() },
      { id: "prj_882", code: "PRJ-882", name: "Employee Directory & SSO Modernization", schedule: "Deadline: Sep 01", status: "Active", username: normalized, createdAt: new Date().toISOString() },
      { id: "prj_750", code: "PRJ-750", name: "Institutional Data Backup & DR Sync", schedule: "Deadline: Oct 10", status: "Pending Review", username: normalized, createdAt: new Date().toISOString() }
    ];
    for (const p of initialProjects) {
      projectsCache.push(p);
      if (isDbConnected()) {
        await (ProjectModel as any).create(p).catch(() => {});
      }
    }
    projects = initialProjects;
  }

  return { tasks, projects, tickets };
}

export async function addEmployeeTask(username: string, title: string) {
  const normalized = username.trim().toLowerCase();
  const taskId = "task_" + crypto.randomUUID().replace(/-/g, "").substring(0, 10);
  const task = {
    id: taskId,
    username: normalized,
    title,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasksCache.unshift(task);

  if (isDbConnected()) {
    await (TaskModel as any).create(task);
  }

  return task;
}

export async function toggleEmployeeTask(taskId: string, completed: boolean) {
  const memIndex = tasksCache.findIndex(t => t.id === taskId);
  if (memIndex !== -1) {
    tasksCache[memIndex].completed = completed;
  }

  if (isDbConnected()) {
    await (TaskModel as any).updateOne({ id: taskId }, { $set: { completed } });
  }

  return { id: taskId, completed };
}

export async function deleteEmployeeTask(taskId: string) {
  tasksCache = tasksCache.filter(t => t.id !== taskId);

  if (isDbConnected()) {
    await (TaskModel as any).deleteOne({ id: taskId });
  }

  return { id: taskId };
}

export async function addEmployeeProject(username: string, code: string, name: string, schedule: string) {
  const normalized = username.trim().toLowerCase();
  const prjId = "prj_" + crypto.randomUUID().replace(/-/g, "").substring(0, 10);
  const prj = {
    id: prjId,
    code,
    name,
    schedule: schedule || "TBD",
    status: "Active",
    username: normalized,
    createdAt: new Date().toISOString()
  };

  projectsCache.push(prj);

  if (isDbConnected()) {
    await (ProjectModel as any).create(prj);
  }

  return prj;
}

export async function addEmployeeTicket(username: string, category: string, text: string) {
  const normalized = username.trim().toLowerCase();
  const ticketId = "req_" + crypto.randomUUID().replace(/-/g, "").substring(0, 10);
  const ticket = {
    id: ticketId,
    username: normalized,
    category,
    text,
    status: "Open",
    createdAt: new Date().toISOString(),
    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  ticketsCache.unshift(ticket);

  if (isDbConnected()) {
    await (TicketModel as any).create(ticket);
  }

  return ticket;
}

