import dotenv from "dotenv";
dotenv.config();


import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("FAILURE: MONGODB_URI environment variable is not defined.");
  process.exit(1);
}

console.log("Testing connection to MongoDB Cloud Database...");
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("SUCCESS! Connected to MongoDB Cloud Database.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("FAILURE CATEGORY:", err.name);
    console.error("FAILURE DETAILS:", err.message);
    if (err.reason) {
      console.error("CLUSTER REASON:", err.reason);
    }
    process.exit(1);
  });

