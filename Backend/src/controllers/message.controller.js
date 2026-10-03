import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { hasImagekitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";

export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-clerkId");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getUsersforSidebar:", error.message);
    res.status(500).json({
      message: "Internal Server error",
    });
  }
}

export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;
    const conversations = await Message.aggregate([
      // 1. Keep only the messages I sent or received.
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      // 2. Collapse them into one row per chat partner, noting our latest message time.
      {
        $group: {
          // The partner is the other person on the message (not me).
          _id: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessageAt: { $max: "$createdAt" },
        },
      },
      // 3. Put the most recent conversation at the top.
      { $sort: { lastMessageAt: -1 } },
      // 4. Look up each partner's user profile (comes back as an array).
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      // 4b. Skip partners whose account was deleted (empty array would crash $replaceRoot).
      { $match: { user: { $ne: [] } } },
      // 5. Pull that profile out of the array and make it the document.
      { $replaceRoot: { newRoot: { $first: "$user" } } },
      // 6. Hide the private clerkId field from the result.
      { $project: { clerkId: 0 } },
    ]);
     res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversationForSidebar", error.message);
    res.status(500).json({
      message: "Internal Server error",
    });
  }
}

export async function getMessages(req, res) {
  try {
    const { id: userToChatId } = req.params;

    if (!mongoose.isValidObjectId(userToChatId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages:", error.message);
    res.status(500).json({
      message: "internal server error",
    });
  }
}

export async function sendMessage(req, res) {
  try {
    const text = req.body?.text?.trim();
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!mongoose.isValidObjectId(receiverId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (String(receiverId) === String(senderId)) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    if (!text && !req.file) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "User not found" });
    }

    let imageUrl;
    let videoUrl;

    if (req.file) {
      if (!hasImagekitConfig()) {
        return res.status(500).json({
          message: "Media upload is not configured",
        });
      }

      const url = await uploadChatMedia(req.file);
      if (req.file.mimetype.startsWith("video/")) videoUrl = url;
      else imageUrl = url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
    });

    await newMessage.save();

    // only send in realtime if the user is online (on any of their tabs/devices)
    const receiverSocketIds = getReceiverSocketIds(receiverId);
    if (receiverSocketIds.length > 0) {
      io.to(receiverSocketIds).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage:", error.message);
    res.status(500).json({
      message: "Internal Server error",
    });
  }
}

// Chat Sidebar Aggregation
// $match → $group → $sort → $lookup → $replaceRoot → $project
// $match → Get messages involving me.
// $group → Find the other person using $cond; $max(createdAt) = latest message.
// $sort → Latest conversation first (-1).
// $lookup → Get that person's data from users (returns array).
// $replaceRoot → Take the user out of the array.
// $project → Remove private fields like clerkId.

// Main idea:
// messages → chat partners → latest chat → user profiles
