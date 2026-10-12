
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface IUser {
  id: string;
  username: string;
  passwordHash: string;
  displayName?: string;
  department?: string;
  role: "ADMIN" | "EMPLOYEE" | "USER";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ISession {
  id: string;
  sessionId?: string;
  userId?: string;
  username: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  loginTime?: string;
  lastActivityAt?: string;
  expiresAt?: Date;
  status: "Genuine" | "Deception";
  threatScore: number;
  failedAttempts: number;
  generatingSummary?: boolean;
  aiSummary?: string;
  logs: any[];
}

export interface IAlert {
  id: string;
  timestamp?: string;
  type: "info" | "warning" | "critical";
  message: string;
  sessionId?: string;
}

export interface ILoginFailure {
  username: string;
  count: number;
  lastAttempt: string;
}

// Mongoose Schemas
const userSchema = new mongoose.Schema<IUser>({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, default: "" },
  department: { type: String, default: "General Operations" },
  role: { type: String, enum: ["ADMIN", "EMPLOYEE", "USER"], default: "EMPLOYEE" },
  active: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

const sessionSchema = new mongoose.Schema<ISession>({
  id: { type: String, required: true, unique: true },
  sessionId: { type: String },
  userId: { type: String },
  username: { type: String, required: true },
  role: { type: String, default: "USER" },
  ip: { type: String, default: "127.0.0.1" },
  userAgent: { type: String, default: "Browser" },
  loginTime: { type: String, default: () => new Date().toISOString() },
  lastActivityAt: { type: String, default: () => new Date().toISOString() },
  expiresAt: { type: Date },
  status: { type: String, enum: ["Genuine", "Deception"], required: true },
  threatScore: { type: Number, default: 0 },
  failedAttempts: { type: Number, default: 0 },
  generatingSummary: { type: Boolean, default: false },
  aiSummary: { type: String },
  logs: [{
    id: String,
    timestamp: String,
    action: String,
    details: String,
    threatPoints: Number
  }]
});

export interface ITask {
  id: string;
  username: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface IProject {
  id: string;
  code: string;
  name: string;
  schedule: string;
  status: string;
  username: string;
  createdAt: string;
}

export interface ITicket {
  id: string;
  username: string;
  category: string;
  text: string;
  status: string;
  createdAt: string;
}

const taskSchema = new mongoose.Schema<ITask>({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, lowercase: true, trim: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

const projectSchema = new mongoose.Schema<IProject>({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  schedule: { type: String, default: "TBD" },
  status: { type: String, default: "Active" },
  username: { type: String, required: true, lowercase: true, trim: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

const ticketSchema = new mongoose.Schema<ITicket>({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, lowercase: true, trim: true },
  category: { type: String, required: true },
  text: { type: String, required: true },
  status: { type: String, default: "Open" },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

const alertSchema = new mongoose.Schema<IAlert>({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  type: { type: String, enum: ["info", "warning", "critical"], required: true },
  message: { type: String, required: true },
  sessionId: { type: String }
});

const loginFailureSchema = new mongoose.Schema<ILoginFailure>({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  count: { type: Number, default: 0 },
  lastAttempt: { type: String, default: () => new Date().toISOString() }
});

export interface IPolicy {
  id: string;
  policyId: string;
  title: string;
  trigger: string;
  condition: string;
  action: "DECEPTION" | "QUARANTINE" | "BLOCK" | "INCREASE_MONITORING";
  threshold: number;
  scope: string;
  priority: number;
  status: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
  version: number;
  deployedAt?: string;
  createdAt: string;
  sourceEvent?: string;
}

export interface IAuditEvent {
  id: string;
  timestamp: string;
  sessionId: string;
  username: string;
  role: string;
  action: string;
  endpoint: string;
  method: string;
  status: number;
  threatScore: number;
  decision: "ALLOW" | "DECEPTION" | "DENY";
  details?: string;
}

const policySchema = new mongoose.Schema<IPolicy>({
  id: { type: String, required: true, unique: true },
  policyId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  trigger: { type: String, required: true },
  condition: { type: String, required: true },
  action: { type: String, enum: ["DECEPTION", "QUARANTINE", "BLOCK", "INCREASE_MONITORING"], required: true },
  threshold: { type: Number, default: 50 },
  scope: { type: String, default: "GLOBAL" },
  priority: { type: Number, default: 1 },
  status: { type: String, enum: ["ACTIVE", "INACTIVE", "PENDING_APPROVAL"], default: "ACTIVE" },
  version: { type: Number, default: 1 },
  deployedAt: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  sourceEvent: { type: String }
});

const auditEventSchema = new mongoose.Schema<IAuditEvent>({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  sessionId: { type: String, required: true },
  username: { type: String, required: true },
  role: { type: String, default: "USER" },
  action: { type: String, required: true },
  endpoint: { type: String, required: true },
  method: { type: String, default: "GET" },
  status: { type: Number, default: 200 },
  threatScore: { type: Number, default: 0 },
  decision: { type: String, enum: ["ALLOW", "DECEPTION", "DENY"], default: "ALLOW" },
  details: { type: String }
});

export const UserModel = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export const EmployeeModel = UserModel;
export const SessionModel = mongoose.models.Session || mongoose.model<ISession>("Session", sessionSchema);
export const AlertModel = mongoose.models.Alert || mongoose.model<IAlert>("Alert", alertSchema);
export const LoginFailureModel = mongoose.models.LoginFailure || mongoose.model<ILoginFailure>("LoginFailure", loginFailureSchema);
export const TaskModel = mongoose.models.Task || mongoose.model<ITask>("Task", taskSchema);
export const ProjectModel = mongoose.models.Project || mongoose.model<IProject>("Project", projectSchema);
export const TicketModel = mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", ticketSchema);
export const PolicyModel = mongoose.models.Policy || mongoose.model<IPolicy>("Policy", policySchema);
export const AuditEventModel = mongoose.models.AuditEvent || mongoose.model<IAuditEvent>("AuditEvent", auditEventSchema);

let isConnected = false;

// Global connection cache across serverless function invocations
declare global {
  var mongooseConn: { conn: typeof mongoose | null; promise: Promise<boolean> | null } | undefined;
}

let cached = global.mongooseConn;
if (!cached) {
  cached = global.mongooseConn = { conn: null, promise: null };
}

mongoose.connection.on("connected", () => {
  isConnected = true;
});

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  if (cached) cached.promise = null;
});

mongoose.connection.on("error", () => {
  isConnected = false;
  if (cached) cached.promise = null;
});

export let lastConnectionError: string | null = null;

export async function connectMongoDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri || uri.includes("YOUR_MONGODB_URI") || uri.includes("placeholder")) {
    lastConnectionError = "MONGODB_URI not set or is placeholder";
    console.warn("⚠️ MONGODB_URI environment variable not set or invalid. Running with in-memory persistence mode.");
    return false;
  }

  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }

  if (cached?.promise) {
    try {
      return await cached.promise;
    } catch (e: any) {
      lastConnectionError = e.message || String(e);
      cached.promise = null;
    }
  }

  console.log("⏳ Connecting to MongoDB Cloud Database...");

  cached!.promise = (async () => {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 20000,
        maxPoolSize: 10
      });
      isConnected = true;
      cached!.conn = mongoose;
      lastConnectionError = null;
      console.log("✅ Successfully connected to MongoDB Cloud Database!");

      bootstrapInitialAdmin().catch(() => {});

      return true;
    } catch (err: any) {
      lastConnectionError = err.message || String(err);
      console.error("❌ Failed to connect to MongoDB Cloud Database:", lastConnectionError);
      isConnected = false;
      cached!.promise = null;
      return false;
    }
  })();

  return await cached!.promise;
}

async function bootstrapInitialAdmin() {
  try {
    const adminCount = await (UserModel as any).countDocuments({ role: "ADMIN" });
    if (adminCount === 0) {
      const adminUsername = (process.env.ADMIN_USERNAME || "").trim().toLowerCase();
      let passHash = process.env.ADMIN_PASSWORD_HASH;
      if (!passHash && process.env.ADMIN_PASSWORD) {
        passHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
      }

      if (adminUsername && passHash) {
        await (UserModel as any).create({
          id: "usr_admin_" + crypto.randomUUID().replace(/-/g, "").substring(0, 10),
          username: adminUsername,
          passwordHash: passHash,
          displayName: "SOC Lead Administrator",
          department: "Cybersecurity Operations",
          role: "ADMIN",
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log(`✅ Initial Admin Account bootstrapped to MongoDB Database (${adminUsername})!`);
      }
    }
  } catch (e) {
    console.error("Error bootstrapping initial admin account:", e);
  }
}

export function isDbConnected(): boolean {
  return isConnected || mongoose.connection.readyState === 1;
}
