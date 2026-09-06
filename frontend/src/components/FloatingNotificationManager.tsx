"use client";

import React, { useEffect, useState, useCallback } from "react";
import { MessageSquare, Bell, X, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { soundManager } from "@/lib/sound";

export type FloatingToast = {
  id: string;
  title: string;
  body: string;
  type: "message" | "notification";
  conversationId?: string;
  createdAt: number;
};

export default function FloatingNotificationManager() {
  const router = useRouter();
  const { socket, user } = useAuth();
  const [toasts, setToasts] = useState<FloatingToast[]>([]);

  const addToast = useCallback((toast: Omit<FloatingToast, "id" | "createdAt">) => {
    const newToast: FloatingToast = {
      ...toast,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 2)]); // Garder max 3 toasts simultanés

    // Notification native du navigateur si autorisée
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const notif = new Notification(newToast.title, {
          body: newToast.body,
          icon: "/api/pwa-icon?v=2026",
          badge: "/api/pwa-icon?v=2026",
          tag: newToast.type === "message" ? `msg-${newToast.conversationId || Date.now()}` : `notif-${Date.now()}`,
        });
        notif.onclick = () => {
          window.focus();
          if (newToast.conversationId) {
            router.push("/messages");
          } else {
            router.push("/notifications");
          }
        };
      } catch {
        // Fallback Service Worker pour mobile / PWA
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(newToast.title, {
              body: newToast.body,
              icon: "/api/pwa-icon?v=2026",
              badge: "/api/pwa-icon?v=2026",
            });
          }).catch(() => {});
        }
      }
    }

    // Auto-suppression après 5 secondes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  }, [router]);

  // Demander la permission des notifications navigateur au premier clic utilisateur si par défaut
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      const requestPerm = () => {
        Notification.requestPermission().catch(() => {});
        window.removeEventListener("click", requestPerm);
        window.removeEventListener("touchstart", requestPerm);
      };
      window.addEventListener("click", requestPerm, { once: true });
      window.addEventListener("touchstart", requestPerm, { once: true });
      return () => {
        window.removeEventListener("click", requestPerm);
        window.removeEventListener("touchstart", requestPerm);
      };
    }
  }, []);

  const removeToast = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToastClick = (toast: FloatingToast) => {
    removeToast(toast.id);
    if (toast.conversationId) {
      router.push("/messages");
    } else {
      router.push("/notifications");
    }
  };

  useEffect(() => {
    if (!socket) return;

    // 1. Écoute des nouveaux messages privés
    const handleNewMessage = (data: {
      message: { senderId: string; text?: string | null; media?: any[] };
      conversationId: string;
    }) => {
      // Ne pas notifier si c'est notre propre message
      if (user && data.message.senderId === user.id) return;

      soundManager.playMessageSound();

      let snippet = data.message.text || "";
      if (!snippet && data.message.media?.length) {
        snippet = "📷 Vous a envoyé un média privé";
      }

      addToast({
        title: "Nouveau message privé",
        body: snippet || "Message reçu",
        type: "message",
        conversationId: data.conversationId,
      });
    };

    // 2. Écoute des nouvelles notifications générales
    const handleNewNotification = (notif: {
      title: string;
      body: string;
      data?: { conversationId?: string };
      type?: string;
    }) => {
      soundManager.playNotificationSound();
      addToast({
        title: notif.title || "Notification",
        body: notif.body || "",
        type: notif.type?.includes("message") ? "message" : "notification",
        conversationId: notif.data?.conversationId,
      });
    };

    socket.on("message:new", handleNewMessage);
    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, user, addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-[9999] flex flex-col gap-2 pointer-events-none select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => handleToastClick(toast)}
          className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_94%,transparent)] backdrop-blur-xl text-[var(--app-foreground)] shadow-[0_15px_35px_rgba(0,0,0,0.22)] cursor-pointer hover:bg-[var(--app-surface-soft)] transition-all duration-200 animate-slideDown group"
        >
          {/* Icône animée */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
              toast.type === "message"
                ? "bg-[var(--app-accent,#25D366)] text-white"
                : "bg-[var(--app-foreground)] text-[var(--app-background)]"
            }`}
          >
            {toast.type === "message" ? (
              <MessageSquare className="w-4 h-4" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </div>

          {/* Corps de la notification */}
          <div className="flex-1 min-w-0 pr-1 space-y-0.5">
            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-tight text-[var(--app-foreground)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent,#25D366)] animate-pulse" />
              <span className="truncate">{toast.title}</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-tight">
              {toast.body}
            </p>
          </div>

          {/* Bouton fermeture / flèche */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => removeToast(toast.id, e)}
              className="p-1 rounded-full text-neutral-400 hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-raised)] transition"
              title="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[var(--app-accent,#25D366)] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      ))}
    </div>
  );
}
