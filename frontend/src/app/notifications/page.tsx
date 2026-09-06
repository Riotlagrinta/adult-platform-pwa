"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Heart, MessageCircle, DollarSign, UserPlus, Trash2, CheckCheck } from "lucide-react";
import AuthPanel from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
  data?: Record<string, any> | null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { token, ready, socket, setUnreadNotificationsCount } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const payload = await apiRequest<{ notifications: NotificationItem[] }>("/notifications", { token });
      setNotifications(payload.notifications);
      const unreadCount = payload.notifications.filter((n) => !n.readAt).length;
      setUnreadNotificationsCount(unreadCount);
    } finally {
      setLoading(false);
    }
  }, [setUnreadNotificationsCount, token]);

  useEffect(() => {
    if (token) {
      void loadNotifications();
    }
  }, [loadNotifications, token]);

  // Écoute en temps réel des nouvelles notifications via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeNotification = (notif: NotificationItem) => {
      setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      setUnreadNotificationsCount((prev) => prev + 1);
    };

    socket.on("notification:new", handleRealtimeNotification);

    return () => {
      socket.off("notification:new", handleRealtimeNotification);
    };
  }, [socket, setUnreadNotificationsCount]);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await apiRequest("/notifications/read-all", {
        method: "POST",
        token,
      });
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))
      );
      setUnreadNotificationsCount(0);
    } catch {
      // Fallback
      const unread = notifications.filter((item) => !item.readAt);
      await Promise.all(
        unread.map((item) =>
          apiRequest(`/notifications/${item.id}/read`, {
            method: "POST",
            token,
          })
        )
      );
      await loadNotifications();
    }
  };

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await apiRequest(`/notifications/${id}/read`, {
        method: "POST",
        token,
      });
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await apiRequest(`/notifications/${id}`, {
        method: "DELETE",
        token,
      });
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.readAt) {
      void markAsRead(notif.id);
    }

    if (notif.data?.conversationId || notif.type.includes("message")) {
      router.push("/messages");
    } else if (notif.data?.postId || notif.type.includes("post")) {
      router.push("/");
    } else if (notif.data?.followerId || notif.type.includes("follow")) {
      router.push("/profile");
    }
  };

  const iconForType = (type: string) => {
    if (type.includes("like")) return <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />;
    if (type.includes("comment") || type.includes("message")) return <MessageCircle className="w-3.5 h-3.5 text-black dark:text-white" />;
    if (type.includes("follow")) return <UserPlus className="w-3.5 h-3.5 text-black dark:text-white" />;
    if (type.includes("tip")) return <DollarSign className="w-3.5 h-3.5 text-green-500" />;
    return <Bell className="w-3.5 h-3.5 text-black dark:text-white" />;
  };

  if (!ready) {
    return <div className="p-6 text-sm text-neutral-500">Chargement...</div>;
  }

  if (!token) {
    return (
      <div className="p-4 md:p-6">
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-background)] min-h-screen p-4 md:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-4">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-black dark:text-white" />
          <div>
            <h2 className="font-black text-xl tracking-tight uppercase">Notifications</h2>
            <p className="text-xs text-neutral-500">Activité en direct sur votre compte.</p>
          </div>
        </div>
        {notifications.some((item) => !item.readAt) && (
          <button
            onClick={markAllRead}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--app-surface-raised)] border border-[var(--app-border)] text-[var(--app-foreground)] hover:bg-[var(--app-surface-soft)] transition flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Tout marquer comme lu</span>
          </button>
        )}
      </div>

      {loading && notifications.length === 0 && <div className="text-sm text-neutral-500">Chargement...</div>}

      <div className="divide-y divide-[var(--app-border)] select-none">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 text-sm">Aucune notification pour le moment.</div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`flex items-start justify-between gap-3 p-4 hover:bg-[var(--app-surface-soft)] transition cursor-pointer ${
                notif.readAt ? "" : "bg-[var(--app-surface-raised)] border-l-2 border-l-[var(--app-foreground)]"
              }`}
            >
              <div className="flex gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm">
                    OA
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-[var(--app-background)] flex items-center justify-center bg-[var(--app-surface)] shadow-sm">
                    {iconForType(notif.type)}
                  </span>
                </div>

                <div className="text-xs min-w-0">
                  <p className="text-neutral-800 dark:text-neutral-200">
                    <span className="font-bold">{notif.title}</span>
                    <span> {notif.body}</span>
                  </p>
                  <span className="text-[10px] text-neutral-400 block mt-1">
                    {new Date(notif.createdAt).toLocaleString("fr-FR")}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => deleteNotification(notif.id, e)}
                className="text-neutral-400 hover:text-red-500 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition flex-shrink-0"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
