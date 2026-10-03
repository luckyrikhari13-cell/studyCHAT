import express from "express";
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import path from "path";
import cors from "cors";
import { connectDB } from "./lib/db.js";
import { clerkMiddleware } from "@clerk/express";
import User from "./models/user.model.js";
import clerkwebhook from "./webhooks/clerk.webhook.js";
import authRoutes from "./routes/auth.route.js"
import job from "./lib/cron.js";
import messageRoutes from "./routes/message.route.js"
import { app , server } from "./lib/socket.js";
import { overwriteMiddlewareResult } from "mongoose";
const port = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(clerkMiddleware())
const publicDir = path.join(process.cwd(), "public");
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages" , messageRoutes);

//if the public  directory exists serve the static files
// this is for the production build

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.get("/{*any}", (req, res, next) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
  });
}
app.use(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  clerkwebhook,
);

app.use(express.json());
server.listen(port, "0.0.0.0", () => {
  connectDB();

  console.log(`Server is running on 0.0.0.0:${port}`);

  if (process.env.NODE_ENV === "production") {
    job.start();
  }
});



// basic ideology of why server for listen and app for routes and overwriteMiddlewareResult
// app.use(...)       // "Express, use this."
// app.get(...)       // "Express, handle this route."
// app.use(...)       // "Express, use these routes."

// server.listen(...) // "Actual server, START."