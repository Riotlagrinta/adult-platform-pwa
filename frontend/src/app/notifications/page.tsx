"use client";

import React, { useEffect, useState } from "react";
import { Bell, Heart, MessageCircle, DollarSign, UserPlus, Trash2 } from "lucide-react";
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
  data?: Record<string, unknown> | null;
};

export default function NotificationsPage() {
  const { token, ready } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const payload = await apiRequest<{ notifications: NotificationItem[] }>("/notifications", { token });
      setNotifications(payload.notifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadNotifications();
  }, [token]);

  const markAllRead = async () => {
    if (!token) return;
    const unread = notifications.filter((item) => !item.readAt);
    await Promise.all(
      unread.map((item) =>
        apiRequest(`/notifications/${item.id}/read`, {
          method: "POST",
          token,
        }),
      ),
    );
    await loadNotifications();
  };

  const iconForType = (type: string) => {
    if (type.includes("like")) return <Heart className="w-3 h-3 text-red-500 fill-red-500" />;
    if (type.includes("comment") || type.includes("message")) return <MessageCircle className="w-3 h-3 text-black dark:text-white" />;
    if (type.includes("follow")) return <UserPlus className="w-3 h-3 text-black dark:text-white" />;
    if (type.includes("tip")) return <DollarSign className="w-3.5 h-3.5 text-green-500" />;
    return <Bell className="w-3 h-3 text-black dark:text-white" />;
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
    <div className="bg-[var(--app-background)] min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-4">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-black dark:text-white" />
          <div>
            <h2 className="font-black text-xl tracking-tight uppercase">Notifications</h2>
            <p className="text-xs text-neutral-500">Activité récente sur votre compte.</p>
          </div>
        </div>
        {notifications.some((item) => !item.readAt) && (
          <button onClick={markAllRead} className="text-xs font-bold text-black dark:text-white hover:underline">
            Tout marquer comme lu
          </button>
        )}
      </div>

      {loading && <div className="text-sm text-neutral-500">Chargement...</div>}

      <div className="divide-y divide-[var(--app-border)] select-none">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 text-sm">Aucune notification pour le moment.</div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start justify-between gap-3 p-4 hover:bg-[var(--app-surface-soft)] transition ${
                notif.readAt ? "" : "bg-[var(--app-surface-raised)]"
              }`}
            >
              <div className="flex gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm">
                    OA
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-[var(--app-background)] flex items-center justify-center bg-[var(--app-surface)] shadow-sm">
                    {iconForType(notif.type)}
                  </span>
                </div>

                <div className="text-xs">
                  <p className="text-neutral-800 dark:text-neutral-200">
                    <span className="font-bold">{notif.title}</span>
                    <span> {notif.body}</span>
                  </p>
                  <span className="text-[10px] text-neutral-400 block mt-1">
                    {new Date(notif.createdAt).toLocaleString("fr-FR")}
                  </span>
                </div>
              </div>
              <button className="text-neutral-400 hover:text-red-500 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
