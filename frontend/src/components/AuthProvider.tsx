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
    let cachedUser: SessionUser | null = null;
    try {
      const u = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
      if (u) cachedUser = JSON.parse(u);
    } catch {}

    if (cachedUser && storedToken) {
      setUser(cachedUser);
      setToken(storedToken);
      const sock = getSocket(storedToken);
      setSocket(sock);
      fetchUnreadCount(storedToken);
      setReady(true);
    }

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
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_user", JSON.stringify(payload.user));
        }
        const sock = getSocket(storedToken);
        setSocket(sock);
        fetchUnreadCount(storedToken);
      })
      .catch((err) => {
        // En cas d'erreur explicite d'authentification uniquement (401/403), on déconnecte
        const msg = err instanceof Error ? err.message.toLowerCase() : "";
        if (msg.includes("401") || msg.includes("token") || msg.includes("credential") || msg.includes("unauthorized")) {
          clearStoredToken();
          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_user");
          }
          setToken(null);
          setUser(null);
          disconnectSocket();
          setSocket(null);
        }
      })
      .finally(() => setReady(true));
  }, []);

  // Écoute des notifications et messages temps réel
  useEffect(() => {
    if (!socket) return;

    const handleNotification = () => {
      setUnreadNotificationsCount((prev) => prev + 1);
    };

    socket.on("notification:new", handleNotification);

    return () => {
      socket.off("notification:new", handleNotification);
    };
  }, [router, socket, user]);

  // Synchronisation du badge d'application sur l'écran d'accueil (iOS 16.4+ / Android)
  useEffect(() => {
    if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
      if (unreadNotificationsCount > 0) {
        navigator.setAppBadge(unreadNotificationsCount).catch(() => {});
      } else if ("clearAppBadge" in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }, [unreadNotificationsCount]);

  const syncSession = (payload: { user: SessionUser; token: string }) => {
    setStoredToken(payload.token);
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_user", JSON.stringify(payload.user));
    }
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_user");
    }
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
