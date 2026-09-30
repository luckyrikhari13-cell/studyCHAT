import { getAuth } from "@clerk/express";
import User from "../models/user.model.js";

export async function protectRoute(req, res, next) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await User.findOne({
        clerkId:userId
    })

    if(!user){
        res.status(404).json({
            message : "User profile is not synced yet"
        })
        return ;
    }

    req.user = user

    next();


  } catch (error) {
    return res.status(503).json({
        message : "Internal server error",
        error : error
    })
  }
}
