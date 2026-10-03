// MUST be the first import, so .env is loaded before any other file reads process.env
import "dotenv/config";

import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { connectDB } from "./lib/db.js";
import clerkwebhook from "./webhooks/clerk.webhook.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import job from "./lib/cron.js";
import { app, server } from "./lib/socket.js";

const port = process.env.PORT || 3000;
// default to the Vite dev URL: with credentials:true the browser rejects a wildcard origin,
// so an unset FRONTEND_URL would make every API call fail in development
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const publicDir = path.join(process.cwd(), "public");

app.use(cors({ origin: FRONTEND_URL, credentials: true }));

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// 1. Webhook first: Clerk needs the RAW body to verify the signature,
//    so this has to come BEFORE express.json().
app.use(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  clerkwebhook,
);

// 2. JSON body parser: must come BEFORE the routes, otherwise req.body is
//    undefined for text messages (they are sent as JSON).
app.use(express.json());

// 3. Clerk auth + API routes
app.use(clerkMiddleware());
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// 4. Production build: serve the frontend if the public folder exists
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.get("/{*any}", (req, res, next) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

// 5. Error handler (last): always answer with JSON so the frontend toast shows a real message
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File is too large (max 25MB)" });
  }

  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  if (status >= 500) console.error("Unhandled error:", err);

  res.status(status).json({
    message: status >= 500 ? "Internal Server error" : err.message,
  });
});

server.listen(port, "0.0.0.0", () => {
  connectDB();

  console.log(`Server is running on 0.0.0.0:${port}`);

  if (process.env.NODE_ENV === "production") {
    job.start();
  }
});

// server.listen(...) starts the real server; app.use / app.get only describe the routes.
