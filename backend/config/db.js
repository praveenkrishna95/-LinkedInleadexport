import mongoose from "mongoose";

export default async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is required in backend/.env");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || undefined
  });
  console.log(`MongoDB connected${process.env.MONGODB_DB_NAME ? ` to ${process.env.MONGODB_DB_NAME}` : ""}`);
}
