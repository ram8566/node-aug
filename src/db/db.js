import mongoose from "mongoose";
import { DB_Name } from "../constants.js";

const connectDB = async () => {
  try {
    console.log("Trying to connect to MongoDB...");
    const connectionInstance = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("MONGODB connection FAILED");
    console.error(error.message); // 👈 This shows actual error message
    process.exit(1);
  }
};

export default connectDB;