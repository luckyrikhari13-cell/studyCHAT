import { clerkClient, getAuth } from "@clerk/express";
import User from "../models/user.model.js";
import { profileFromClerkUser, upsertUser } from "../lib/clerkSync.js";

export async function protectRoute(req, res, next) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let user = await User.findOne({ clerkId: userId });

    // Not in MongoDB yet (webhook missed or not configured): fetch from Clerk and save now.
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);
      user = await upsertUser(profileFromClerkUser(clerkUser));
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in protectRoute:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}
