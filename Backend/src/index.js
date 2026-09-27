import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./lib/db.js";
import { clerkMiddleware } from "@clerk/express";
import User from "./models/user.model.js";
dotenv.config();
const app = express();
const port = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, Credential: true }));
app.use(clerkMiddleware);

app.listen(port, () => {
  connectDB();
  console.log("Server is running on Port ", port);
});

app.get("/health", (req, res) => {
  res.status(500).json({
    ok: true,
  });
});
