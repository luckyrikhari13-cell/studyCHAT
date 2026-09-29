import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import cors from "cors";
import { connectDB } from "./lib/db.js";
import { clerkMiddleware } from "@clerk/express";
import User from "./models/user.model.js";
import clerkwebhook from "../src/webhooks/clerk.webhook.js"
import job from "./lib/cron.js";
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL;

const publicDir = path.join(process.cwd(), "public");
app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
  });
});

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
app.listen(port, "0.0.0.0", () => {
  connectDB();

  console.log(`Server is running on 0.0.0.0:${port}`);

  if (process.env.NODE_ENV === "production") {
    job.start();
  }
});
app.use(clerkMiddleware);
