import dns from "dns";
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

import mongoose from "mongoose";
import { Session, Alert } from "../types.js";

// Mongoose Employee Schema
const employeeSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, default: "General Operations" },
  role: { type: String, default: "Staff Member" },
  createdAt: { type: String, default: () => new Date().toISOString().split("T")[0] }
});

// Mongoose Session / Attacker Activity Schema
const sessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  ip: { type: String },
  userAgent: { type: String },
  loginTime: { type: String },
  status: { type: String, enum: ["Genuine", "Deception"] },
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

// Mongoose Alert Schema
const alertSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String },
  type: { type: String, enum: ["info", "warning", "critical"] },
  message: { type: String },
  sessionId: { type: String }
});

export const EmployeeModel = mongoose.model("Employee", employeeSchema);
export const SessionModel = mongoose.model("Session", sessionSchema);
export const AlertModel = mongoose.model("Alert", alertSchema);

let isConnected = false;

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("YOUR_MONGODB_URI")) {
    console.log("ℹ️ MONGODB_URI environment variable not set. Running with fast in-memory persistence.");
    return false;
  }

  if (isConnected) return true;

  console.log("⏳ Connecting to MongoDB Cloud Database...");

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log("✅ Successfully connected to MongoDB Cloud Database!");

    // Seed default employee accounts to MongoDB if empty
    try {
      const count = await EmployeeModel.countDocuments();
      if (count === 0) {
        await EmployeeModel.create([
          { username: "employee@svit.edu", password: "password123", department: "Information Technology", role: "Senior System Admin", createdAt: "2026-07-20" },
          { username: "employee@company.com", password: "password123", department: "Cybersecurity Operations", role: "Security Analyst", createdAt: "2026-07-20" },
          { username: "staff@svit.edu", password: "password123", department: "Faculty Administration", role: "Assistant Professor", createdAt: "2026-07-21" }
        ]);
        console.log("✅ Seeded default employee accounts to MongoDB Database!");
      }
    } catch (e) {
      console.error("Error seeding default employees:", e);
    }

    return true;
  } catch (err: any) {
    // If SRV DNS times out on Wi-Fi, attempt direct connection
    if (uri.includes("+srv")) {
      try {
        const directUri = "mongodb://majorproject2027svit_db_user:w6E3TkzgrR3nbjCW@cluster0-shard-00-00.8fswwbb.mongodb.net:27017,cluster0-shard-00-01.8fswwbb.mongodb.net:27017,cluster0-shard-00-02.8fswwbb.mongodb.net:27017/test?ssl=true&authSource=admin&retryWrites=true&w=majority";
        await mongoose.connect(directUri, { serverSelectionTimeoutMS: 6000 });
        isConnected = true;
        console.log("✅ Successfully connected to MongoDB Cloud Database (Direct Cluster Connection)!");
        return true;
      } catch (e2: any) {}
    }

    console.log("ℹ️ Running in memory mode. (Session tracking & real-time monitoring active).");
    return false;
  }
}

export function isDbConnected() {
  return isConnected || mongoose.connection.readyState === 1;
}
