"use client";

import React, { useEffect, useState } from "react";
import { BellRing, X, CheckCircle2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { isPushSupported, getSubscriptionStatus, subscribeToPush } from "@/lib/push";
import { soundManager } from "@/lib/sound";

export default function PushNotificationBanner() {
  const { token, user } = useAuth();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      setShow(false);
      return;
    }

    const checkStatus = async () => {
      const supported = await isPushSupported();
      if (!supported) return;

      const isSubscribed = await getSubscriptionStatus();
      setSubscribed(isSubscribed);

      if (!isSubscribed && typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          const dismissedUntil = localStorage.getItem("push_banner_dismissed_until");
          if (!dismissedUntil || Date.now() > parseInt(dismissedUntil, 10)) {
            setShow(true);
          }
        }
      }
    };

    checkStatus();
  }, [token, user]);

  const handleEnablePush = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await subscribeToPush(token);
      setSubscribed(true);
      setShow(false);
      soundManager.playMessageSound();
      alert("🎉 Notifications en direct activées avec succès !");
    } catch (err: any) {
      console.error("Erreur activation push:", err);
      alert(err?.message || "Impossible d'activer les notifications.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    // Masquer pendant 7 jours
    localStorage.setItem("push_banner_dismissed_until", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  if (!show || subscribed) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-[420px] z-50 animate-[slideDown_0.3s_ease-out_forwards]">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_95%,transparent)] backdrop-blur-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)] flex items-start gap-3.5">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full text-neutral-400 hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-soft)] transition"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-2xl bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center flex-shrink-0 shadow-sm">
          <BellRing className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 pr-4 space-y-1">
          <h4 className="text-xs font-black tracking-tight uppercase">Activer les alertes en direct</h4>
          <p className="text-[11px] text-neutral-500 leading-snug">
            Reçois instantanément une notification lorsque quelqu'un t'écrit un message privé ou interagit avec toi.
          </p>

          <div className="pt-2">
            <button
              onClick={handleEnablePush}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[var(--app-foreground)] hover:opacity-90 text-[var(--app-background)] text-xs font-black transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? "Activation..." : "Autoriser les notifications"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
