import dotenv from "dotenv";
dotenv.config();

import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}

import mongoose from 'mongoose';

async function syncDb() {
  const srvUri = process.env.MONGODB_URI;
  if (!srvUri) {
    console.error('❌ MONGODB_URI environment variable not set.');
    process.exit(1);
  }
  
  await mongoose.connect(srvUri);
  console.log('✅ Connected to MongoDB Cloud Atlas!');
  
  const EmployeeModel = mongoose.model('Employee', new mongoose.Schema({ username: String, password: String, department: String, role: String, createdAt: String }));

  const all = await EmployeeModel.find().lean();
  console.log('📊 Current Employees in MongoDB Atlas:', all.map(e => e.username));

  await mongoose.disconnect();
}

syncDb().catch(console.error);

