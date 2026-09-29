import mongoose from "mongoose";
 
export async function connectDB() {
  try {
    const mongouri = process.env.MONGO_URI;
    if (!mongouri) throw new Error("MONGO_URI is required");
    const conn = await mongoose.connect(mongouri);
    console.log("MongoDb connected", conn.connection.host);
  } catch (error) {
    console.log("MongoDb connection error ", error);
    process.exit(1);
  }
}
