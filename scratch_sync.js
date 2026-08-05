import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}

import mongoose from 'mongoose';

async function syncDb() {
  const srvUri = 'mongodb+srv://majorproject2027svit_db_user:w6E3TkzgrR3nbjCW@cluster0.8fswwbb.mongodb.net/test?retryWrites=true&w=majority';
  
  await mongoose.connect(srvUri);
  console.log('✅ Connected to MongoDB Cloud Atlas!');
  
  const EmployeeModel = mongoose.model('Employee', new mongoose.Schema({ username: String, password: String, department: String, role: String, createdAt: String }));

  // Remove sppranav2005@gmail.com
  const delRes = await EmployeeModel.deleteOne({ username: { $regex: /^sppranav/i } });
  console.log('✅ Deleted sppranav2005@gmail.com count:', delRes.deletedCount);

  // Ensure vishnu@gmail.com exists
  const createRes = await EmployeeModel.updateOne(
    { username: 'vishnu@gmail.com' },
    { $set: { username: 'vishnu@gmail.com', password: '123', department: 'Engineering & IT', role: 'Staff Specialist', createdAt: '2026-08-05' } },
    { upsert: true }
  );
  console.log('✅ Created vishnu@gmail.com in MongoDB Cloud Atlas:', createRes);

  const all = await EmployeeModel.find().lean();
  console.log('📊 Current Employees in MongoDB Atlas:', all.map(e => e.username));

  await mongoose.disconnect();
}

syncDb().catch(console.error);
