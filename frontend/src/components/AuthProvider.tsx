"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiRequest,
  clearStoredToken,
  getStoredToken,
  getApiBaseUrl,
  loginRequest,
  registerRequest,
  setStoredToken,
  type SessionUser,
} from "@/lib/api";
import { getSocket, disconnectSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import { soundManager } from "@/lib/sound";

type AuthContextValue = {
  user: SessionUser | null;
  token: string | null;
  socket: Socket | null;
  ready: boolean;
  unreadNotificationsCount: number;
  setUnreadNotificationsCount: React.Dispatch<React.SetStateAction<number>>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    dateOfBirth?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function showNotificationToast(title: string, body: string, onClick?: () => void) {
  if (typeof window === 'undefined') return;

  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(el);
    return el;
  })();

  const toast = document.createElement('div');
  toast.className = 'bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-foreground)] px-4 py-3 rounded-2xl shadow-xl flex flex-col gap-0.5 pointer-events-auto transform translate-y-2 opacity-0 transition-all duration-300 max-w-sm cursor-pointer select-none';
  toast.innerHTML = `
    <div class="font-black text-xs uppercase tracking-tight flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
      ${title}
    </div>
    <div class="text-[11px] text-neutral-500">${body}</div>
  `;

  toast.onclick = onClick ?? null;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [ready, setReady] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const fetchUnreadCount = async (authToken: string) => {
    try {
      const payload = await apiRequest<{ notifications: { readAt?: string | null }[] }>("/notifications", { token: authToken });
      const unread = payload.notifications.filter((n) => !n.readAt).length;
      setUnreadNotificationsCount(unread);
    } catch (err) {
      console.error("Failed to load initial notifications count", err);
    }
  };

  useEffect(() => {
    const storedToken = getStoredToken();
    if (!storedToken) {
      // Préchauffage silencieux en arrière-plan pour réveiller le backend Render immédiatement
      fetch(`${getApiBaseUrl()}/health`).catch(() => {});
      queueMicrotask(() => setReady(true));
      return;
    }

    setToken(storedToken);
    apiRequest<{ user: SessionUser }>("/auth/me", { token: storedToken })
      .then((payload) => {
        setUser(payload.user);
        const sock = getSocket(storedToken);
        setSocket(sock);
        fetchUnreadCount(storedToken);
      })
      .catch(() => {
        clearStoredToken();
        setToken(null);
        setUser(null);
        disconnectSocket();
        setSocket(null);
      })
      .finally(() => setReady(true));
  }, []);

  // Écoute des notifications et messages temps réel
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif: { title: string; body: string }) => {
      setUnreadNotificationsCount((prev) => prev + 1);
      soundManager.playNotificationSound();
      showNotificationToast(notif.title, notif.body, () => {
        router.push("/notifications");
      });
    };

    const handleMessage = (data: { message: { senderId: string; text?: string | null }; conversationId: string }) => {
      if (user && data.message.senderId !== user.id) {
        soundManager.playMessageSound();
      }
    };

    socket.on("notification:new", handleNotification);
    socket.on("message:new", handleMessage);

    return () => {
      socket.off("notification:new", handleNotification);
      socket.off("message:new", handleMessage);
    };
  }, [router, socket, user]);

  const syncSession = (payload: { user: SessionUser; token: string }) => {
    setStoredToken(payload.token);
    setToken(payload.token);
    setUser(payload.user);
    const sock = getSocket(payload.token);
    setSocket(sock);
    fetchUnreadCount(payload.token);
  };

  const login = async (email: string, password: string) => {
    const payload = await loginRequest(email, password);
    syncSession(payload);
  };

  const register = async (input: {
    email: string;
    password: string;
    displayName: string;
    dateOfBirth?: string;
  }) => {
    const payload = await registerRequest(input);
    syncSession(payload);
  };

  const logout = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    disconnectSocket();
    setSocket(null);
    setUnreadNotificationsCount(0);
  };

  const refreshUser = async () => {
    if (!token) {
      return;
    }

    const payload = await apiRequest<{ user: SessionUser }>("/auth/me", { token });
    setUser(payload.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        socket,
        ready,
        unreadNotificationsCount,
        setUnreadNotificationsCount,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
