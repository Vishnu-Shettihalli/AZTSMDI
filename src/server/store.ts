import { Session, LogEntry, Alert, DashboardStats } from '../types.js';
import { EmployeeModel, SessionModel, AlertModel, isDbConnected } from './db.js';
import { generateAttackerSummary } from './gemini.js';

// In-memory databases (fast cache)
export let sessions: Session[] = [];
export let alerts: Alert[] = [];
export const loginFailures: Record<string, { count: number; lastAttempt: number }> = {};

// SSE connection subscribers for real-time monitoring dashboard updates
export let sseClients: any[] = [];

// Fake deception files that look highly sensitive
export const DECEPTION_FILES = [
  {
    name: 'q3_merger_acquisition_plan.pdf',
    type: 'pdf',
    size: '14.2 MB',
    sensitive: true,
    content: 'CONFIDENTIAL: APEX CORP ACQUISITION STRATEGY Q3 2026. Target: CoreLogic solutions. Capital allocated: $42.5M. Strategy details: Undergoing silent stock buyback, finalizing board resolution. Authorized readers: Board of Directors only.'
  },
  {
    name: 'customer_pii_export_raw.csv',
    type: 'csv',
    size: '185 KB',
    sensitive: true,
    content: 'id,first_name,last_name,email,ssn,credit_card,phone\n1,James,Mercer,j.mercer@gmail.com,***-**-3940,4111-****-****-1120,+1-555-0199\n2,Sarah,Conner,sconner@cyber.com,***-**-1029,5520-****-****-9482,+1-555-1024\n3,Bruce,Wayne,bruce@waynecorp.com,***-**-0001,4000-****-****-0001,+1-555-8888\n4,Clark,Kent,clark@dailyplanet.com,***-**-1122,4111-****-****-2233,+1-555-4433'
  },
  {
    name: 'infrastructure_network_map.vsd',
    type: 'vsd',
    size: '4.8 MB',
    sensitive: true,
    content: 'INTERNAL TOPOLOGY DIAGRAM: Core Router 10.0.0.1 -> Gateway PEP Firewall 10.0.0.5 -> Deception Zone Cluster 10.0.4.0/24 (Honeypot Decoy). Target DB Replica: 10.0.4.15.'
  },
  {
    name: 'private_ssh_key_root.pem',
    type: 'pem',
    size: '2.1 KB',
    sensitive: true,
    content: '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\nQyNTUxOQAAACCS+3J7+... DEPLOYMENT REQUISITE: DO NOT EXPOSE ...-----END OPENSSH PRIVATE KEY-----'
  }
];

export interface RegisteredEmployee {
  username: string;
  password: string;
  department: string;
  role: string;
  createdAt: string;
}

export let registeredEmployees: RegisteredEmployee[] = [
  { username: "employee@svit.edu", password: "password123", department: "Information Technology", role: "Senior System Admin", createdAt: "2026-07-20" },
  { username: "employee@company.com", password: "password123", department: "Cybersecurity Operations", role: "Security Analyst", createdAt: "2026-07-20" },
  { username: "staff@svit.edu", password: "password123", department: "Faculty Administration", role: "Assistant Professor", createdAt: "2026-07-21" }
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

// Create a new security session
export function createSession(username: string, status: 'Genuine' | 'Deception', ip: string, userAgent: string): Session {
  const session: Session = {
    id: 'sess_' + Math.random().toString(36).substring(2, 10),
    username,
    ip,
    userAgent,
    loginTime: new Date().toISOString(),
    status,
    threatScore: status === 'Deception' ? 50 : 0,
    failedAttempts: 0,
    logs: [],
    generatingSummary: false
  };

  sessions.unshift(session);

  // Sync to MongoDB asynchronously
  if (isDbConnected()) {
    SessionModel.create(session).catch(e => console.error("Error saving session to MongoDB:", e));
  }

  // Add initial log entry
  addLogEntry(session.id, 'Session Initiated', `User logged in. Determined security posture: ${status}.`, status === 'Deception' ? 50 : 0);

  if (status === 'Deception') {
    createAlert('critical', `Policy Enforcement: Silently diverted user '${username}' into Shadow Deception Zone. Reason: Suspicious activity/credentials.`, session.id);
  } else {
    createAlert('info', `Legitimate session established for user '${username}'.`, session.id);
  }

  return session;
}

// Add a log entry for a session
export function addLogEntry(sessionId: string, action: string, details: string, basePoints: number) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  const timestamp = new Date().toISOString();
  let points = basePoints;

  // Rule 1: Rapid clicks detection
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

  const log: LogEntry = {
    id: 'log_' + Math.random().toString(36).substring(2, 10),
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
      session.aiSummary = summary;
      if (isDbConnected()) {
        SessionModel.updateOne({ id: sessionId }, { $set: { aiSummary: summary } }).catch(() => {});
      }
      broadcastToAdmins('session_update', session);
    }).catch(() => {});
  }

  // Sync to MongoDB
  if (isDbConnected()) {
    SessionModel.updateOne(
      { id: sessionId },
      { $set: { logs: session.logs, threatScore: session.threatScore, aiSummary: session.aiSummary } }
    ).catch(e => console.error("Error updating session in MongoDB:", e));
  }

  broadcastToAdmins('session_update', session);
}

// Create an alert
export function createAlert(type: 'info' | 'warning' | 'critical', message: string, sessionId: string) {
  const alert: Alert = {
    id: 'alert_' + Math.random().toString(36).substring(2, 10),
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

// Clear a session
export function endSession(sessionId: string) {
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    const deletedSession = sessions[index];
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
export function getStats(): DashboardStats {
  const totalSessions = sessions.length;
  const activeGenuine = sessions.filter(s => s.status === 'Genuine').length;
  const activeDeception = sessions.filter(s => s.status === 'Deception').length;
  
  const totalThreat = sessions.reduce((acc, s) => acc + s.threatScore, 0);
  const avgThreatScore = totalSessions > 0 ? Math.round(totalThreat / totalSessions) : 0;

  // Resource access frequency counting
  const resourceCounts: Record<string, number> = {};
  sessions.forEach(s => {
    s.logs.forEach(l => {
      if (l.action.includes('Viewed Document') || l.action.includes('Reveal Vault Secrets') || l.action.includes('Terminal Command')) {
        const key = l.action + ' - ' + l.details.split('.')[0];
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

// Load registered employees, sessions, and alerts from MongoDB on server start
export async function loadEmployeesFromDb() {
  if (isDbConnected()) {
    try {
      // Employees
      const docs = await EmployeeModel.find().lean();
      if (docs && docs.length > 0) {
        registeredEmployees = docs.map(e => ({
          username: e.username,
          password: e.password,
          department: e.department,
          role: e.role,
          createdAt: e.createdAt
        }));
      }

      // Sessions
      const dbSessions = await SessionModel.find().lean();
      if (dbSessions && dbSessions.length > 0) {
        sessions = dbSessions.map(s => ({
          id: s.id,
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
            id: l.id || "log_" + Math.random().toString(36).substring(2, 8),
            timestamp: l.timestamp || new Date().toISOString(),
            action: l.action || "",
            details: l.details || "",
            threatPoints: l.threatPoints || 0
          }))
        }));
      }

      // Alerts
      const dbAlerts = await AlertModel.find().lean();
      if (dbAlerts && dbAlerts.length > 0) {
        alerts = dbAlerts.map(a => ({
          id: a.id,
          timestamp: a.timestamp || new Date().toISOString(),
          type: (a.type as "info" | "warning" | "critical") || "info",
          message: a.message,
          sessionId: a.sessionId || ""
        }));
      }

      console.log(`✅ Loaded ${registeredEmployees.length} employees, ${sessions.length} sessions, and ${alerts.length} alerts from MongoDB!`);
    } catch (e) {
      console.error("Error loading data from MongoDB:", e);
    }
  }
}

export function getRegisteredEmployees() {
  return registeredEmployees;
}

export function registerEmployee(username: string, password: string, department: string = "General Operations", role: string = "Staff Member") {
  const normalized = username.trim().toLowerCase();
  if (registeredEmployees.some(e => e.username.toLowerCase() === normalized)) {
    throw new Error("An employee account with this email address already exists.");
  }
  const newEmp: RegisteredEmployee = {
    username: normalized,
    password,
    department: department || "General Operations",
    role: role || "Staff Member",
    createdAt: new Date().toISOString().split("T")[0]
  };
  registeredEmployees.push(newEmp);

  if (isDbConnected()) {
    EmployeeModel.create(newEmp)
      .then(() => console.log(`✅ MongoDB Synced: Created employee '${normalized}' in cloud database.`))
      .catch(e => console.error("Error creating employee in MongoDB:", e));
  }

  return newEmp;
}

export function removeEmployee(username: string) {
  const normalized = username.trim().toLowerCase();
  const idx = registeredEmployees.findIndex(e => e.username.toLowerCase() === normalized);
  const removedObj = idx !== -1 ? registeredEmployees[idx] : { username: normalized };
  if (idx !== -1) {
    registeredEmployees.splice(idx, 1);
  }

  if (isDbConnected()) {
    EmployeeModel.deleteOne({ username: { $regex: new RegExp("^" + normalized.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + "$", "i") } })
      .then(res => console.log(`✅ MongoDB Synced: Deleted employee '${normalized}' (Deleted count: ${res.deletedCount})`))
      .catch(e => console.error("Error deleting employee from MongoDB:", e));
  }

  return removedObj;
}
