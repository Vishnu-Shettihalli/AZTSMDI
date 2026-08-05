import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import mongoose from "mongoose";

const uri = "mongodb+srv://majorproject2027svit_db_user:w6E3TkzgrR3nbjCW@cluster0.8fswwbb.mongodb.net/zerotrust_db?retryWrites=true&w=majority";

console.log("Testing connection with Google DNS...");
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("SUCCESS! Connected to MongoDB Atlas Cloud Database.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("FAILURE:", err.message);
    process.exit(1);
  });
