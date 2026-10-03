import express from "express";
import User from "../models/user.model.js";
import { profileFromWebhook, upsertUser } from "../lib/clerkSync.js";
import { verifyWebhook } from "@clerk/express/webhooks";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

    if (!signingSecret) {
      return res.status(503).json({
        message: "Webhook secret is not provided",
      });
    }

    const evt = await verifyWebhook(req, {
      signingSecret,
    });

    console.log("WEBHOOK VERIFIED:", evt.type);
    console.log("USER ID:", evt.data.id);

    if (evt.type === "user.created" || evt.type === "user.updated") {
      const u = evt.data;

      await upsertUser(profileFromWebhook(u));

      console.log("USER SAVED TO MONGODB:", u.id);
    }

    if (evt.type === "user.deleted") {
      if (evt.data.id) {
        await User.findOneAndDelete({
          clerkId: evt.data.id,
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error in Clerk webhook:", error);
    return res.status(400).json({
      message: "Webhook verification failed",
    });
  }
});

export default router;
