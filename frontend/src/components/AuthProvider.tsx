"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  apiRequest,
  clearStoredToken,
  getStoredToken,
  loginRequest,
  registerRequest,
  setStoredToken,
  type SessionUser,
} from "@/lib/api";
import { getSocket, disconnectSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

type AuthContextValue = {
  user: SessionUser | null;
  token: string | null;
  socket: Socket | null;
  ready: boolean;
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
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = getStoredToken();
    if (!storedToken) {
      queueMicrotask(() => setReady(true));
      return;
    }

    setToken(storedToken);
    apiRequest<{ user: SessionUser }>("/auth/me", { token: storedToken })
      .then((payload) => {
        setUser(payload.user);
        const sock = getSocket(storedToken);
        setSocket(sock);
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

  const syncSession = (payload: { user: SessionUser; token: string }) => {
    setStoredToken(payload.token);
    setToken(payload.token);
    setUser(payload.user);
    const sock = getSocket(payload.token);
    setSocket(sock);
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
  };

  const refreshUser = async () => {
    if (!token) {
      return;
    }

    const payload = await apiRequest<{ user: SessionUser }>("/auth/me", { token });
    setUser(payload.user);
  };

  return (
    <AuthContext.Provider value={{ user, token, socket, ready, login, register, logout, refreshUser }}>
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
