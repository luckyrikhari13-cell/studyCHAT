import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    set({ isCheckingAuth: true });

    // Right after sign-up the Clerk webhook may not have saved the user yet
    // (backend answers 404). Retry a few times before giving up.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await axiosInstance.get("/auth/check");
        set({ authUser: res.data });
        get().connectSocket(res.data);
        break;
      } catch (error) {
        const notSyncedYet = error.response?.status === 404;
        if (notSyncedYet && attempt < 3) {
          await sleep(1500);
          continue;
        }
        console.log("Error in checkAuth ", error);
        set({ authUser: null });
        break;
      }
    }

    set({ isCheckingAuth: false });
  },

  clearAuth: () => {
    set({ authUser: null, isCheckingAuth: false, onlineUsers: [] });
    get().disconnectSocket();
  },

  connectSocket: (user) => {
    // check "socket exists" (not "connected"), otherwise a second call made
    // while the first socket is still connecting opens a duplicate socket
    if (!user || get().socket) return;

    const socket = io(BASE_URL, { query: { userId: user._id } });

    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    get().socket?.disconnect();
    set({ socket: null });
  },
}));
