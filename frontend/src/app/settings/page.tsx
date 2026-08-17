"use client";

import React from "react";
import { Settings, User, Eye, Bell, HelpCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import AuthPanel from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import ThemeSelector from "@/components/ThemeSelector";
import PwaIconSelector from "@/components/PwaIconSelector";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function SettingsPage() {
  const router = useRouter();
  const { token, ready, logout } = useAuth();

  const handleItemClick = (label: string) => {
    if (label === "Modifier les informations de profil") {
      router.push("/profile");
    } else if (label === "Visibilité & Confidentialité") {
      alert("🔒 Confidentialité : Vos conversations et publications sont entièrement privées et protégées. Les membres bloqués ne peuvent ni voir votre profil, ni vous contacter.");
    } else if (label === "Notifications push et courriels") {
      alert("🔔 Notifications : Les alertes en direct de l'application (PWA) sont gérées automatiquement par les autorisations de votre navigateur.");
    } else if (label === "Centre d'aide et assistance") {
      alert("💬 Assistance : Pour toute demande de support, contactez l'administrateur de la plateforme à l'adresse support@onlyadults.com.");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
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
      <div className="border-b border-[var(--app-border)] pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center shadow-sm">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-black text-xl tracking-tight uppercase">Paramètres</h2>
            <p className="text-xs text-neutral-400">Personnalisez votre expérience OnlyAdults.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-xl">
        {/* ── 1. SÉLECTEUR D'ICÔNE D'APPLICATION & CAMOUFLAGE (PWA) ── */}
        <section className="p-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
          <PwaIconSelector />
        </section>

        {/* ── 2. SÉLECTEUR DE THÈMES (SNAPCHAT STYLE DUAL MODE) ── */}
        <section className="p-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
          <ThemeSelector />
        </section>

        {/* ── 3. CHANGEMENT DE MOT DE PASSE SÉCURISÉ ── */}
        <section>
          <ChangePasswordForm />
        </section>

        {/* ── 4. AUTRES OPTIONS DE PARAMÈTRES ── */}
        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] divide-y divide-[var(--app-border)] text-xs overflow-hidden shadow-sm">
          {[
            { label: "Modifier les informations de profil", icon: User },
            { label: "Visibilité & Confidentialité", icon: Eye },
            { label: "Notifications push et courriels", icon: Bell },
            { label: "Centre d'aide et assistance", icon: HelpCircle },
          ].map((item, i) => (
            <div
              key={i}
              onClick={() => handleItemClick(item.label)}
              className="flex items-center justify-between p-4 hover:bg-[var(--app-surface-soft)] cursor-pointer transition"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-neutral-400" />
                <span className="font-bold">{item.label}</span>
              </div>
              <span className="text-neutral-400">›</span>
            </div>
          ))}
        </section>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 py-3.5 rounded-2xl font-bold text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter de OnlyAdults</span>
        </button>
      </div>
    </div>
  );
}
