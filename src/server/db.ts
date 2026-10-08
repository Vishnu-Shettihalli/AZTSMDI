
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

const alertSchema = new mongoose.Schema<IAlert>({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  type: { type: String, enum: ["info", "warning", "critical"], required: true },
  message: { type: String, required: true },
  sessionId: { type: String }
});

export const UserModel = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export const EmployeeModel = UserModel;
export const SessionModel = mongoose.models.Session || mongoose.model<ISession>("Session", sessionSchema);
export const AlertModel = mongoose.models.Alert || mongoose.model<IAlert>("Alert", alertSchema);

let isConnected = false;

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  const isProd = process.env.NODE_ENV === "production";

  if (!uri || uri.includes("YOUR_MONGODB_URI") || uri.includes("placeholder")) {
    if (isProd) {
      throw new Error("FATAL ERROR: MONGODB_URI environment variable is required in production mode.");
    }
    console.log("ℹ️ MONGODB_URI environment variable not set. Running in development mode with fast in-memory persistence.");
    return false;
  }

  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }

  console.log("⏳ Connecting to MongoDB Cloud Database...");

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    isConnected = true;
    console.log("✅ Successfully connected to MongoDB Cloud Database!");

    await bootstrapInitialAdmin();

    return true;
  } catch (err: any) {
    console.error("❌ Failed to connect to MongoDB Cloud Database:", err.message || err);
    isConnected = false;
    if (isProd) {
      throw new Error(`FATAL ERROR: Failed to connect to MongoDB Atlas in production: ${err.message || err}`);
    }
    return false;
  }
}

async function bootstrapInitialAdmin() {
  try {
    const adminCount = await (UserModel as any).countDocuments({ role: "ADMIN" });
    if (adminCount === 0) {
      const adminUsername = (process.env.ADMIN_USERNAME || "admin@svit.edu").trim().toLowerCase();
      
      let passHash = process.env.ADMIN_PASSWORD_HASH;
      if (!passHash) {
        const rawPassword = process.env.ADMIN_PASSWORD || "AdminSecurePass#2026";
        passHash = bcrypt.hashSync(rawPassword, 10);
      }

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
  } catch (e) {
    console.error("Error bootstrapping initial admin account:", e);
  }
}

export function isDbConnected() {
  return isConnected || mongoose.connection.readyState === 1;
}
