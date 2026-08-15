"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Search,
  Users,
  MessageSquare,
  Image as ImageIcon,
  Activity,
  RefreshCw,
} from "lucide-react";
import AuthPanel from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

type ReportItem = {
  id: string;
  reason: string;
  createdAt: string;
  reporter: { id: string; displayName: string; email: string };
  targetUser?: { id: string; displayName: string } | null;
};

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  verificationStatus: string;
};

export default function AdminPage() {
  const { token, ready, user } = useAuth();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const isStaff = user?.role === "MODERATOR" || user?.role === "ADMIN";

  const loadData = async () => {
    if (!token || !isStaff) return;
    setRefreshing(true);
    try {
      const [summaryPayload, reportsPayload, usersPayload] = await Promise.all([
        apiRequest<{ summary: Record<string, number> }>("/admin/summary", { token }),
        apiRequest<{ reports: ReportItem[] }>("/reports/queue", { token }),
        apiRequest<{ users: AdminUser[] }>("/admin/users", { token }),
      ]);

      setSummary(summaryPayload.summary);
      setReports(reportsPayload.reports);
      setUsers(usersPayload.users);
    } catch (err) {
      console.error("Erreur de chargement d'administration:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!token || !isStaff) return;
    loadData();
    const interval = setInterval(loadData, 10000); // Polling de 10 secondes
    return () => clearInterval(interval);
  }, [token, isStaff]);

  const changeRole = async (id: string, role: AdminUser["role"]) => {
    if (!token) return;
    await apiRequest(`/admin/users/${id}/role`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ role }),
    });
    await loadData();
  };

  const filteredUsers = users.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.displayName.toLowerCase().includes(query) ||
      item.email.toLowerCase().includes(query)
    );
  });

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

  if (!isStaff) {
    return <div className="p-6 text-sm text-neutral-500">Accès réservé aux administrateurs et modérateurs.</div>;
  }

  return (
    <div className="bg-[var(--app-background)] min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-[var(--app-foreground)]" />
          <div>
            <h2 className="font-black text-xl tracking-tight uppercase">Panel d'administration</h2>
            <p className="text-xs text-neutral-500">Gestion des membres de la plateforme et statistiques en temps réel.</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="p-2.5 rounded-full border border-[var(--app-border)] hover:bg-[var(--app-surface-soft)] transition disabled:opacity-50"
          title="Rafraîchir les statistiques"
        >
          <RefreshCw className={`h-4 w-4 text-neutral-500 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Statistiques KPI en temps réel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-[var(--app-border)] rounded-2xl p-4 bg-[var(--app-surface)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-xl">
            <Activity className="h-6 w-6 text-green-500 animate-pulse" />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">En ligne (Live)</div>
            <div className="text-xl font-black">{summary.onlineUsers ?? 0}</div>
          </div>
        </div>

        <div className="border border-[var(--app-border)] rounded-2xl p-4 bg-[var(--app-surface)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-xl">
            <Users className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">Total Membres</div>
            <div className="text-xl font-black">{summary.users ?? 0}</div>
          </div>
        </div>

        <div className="border border-[var(--app-border)] rounded-2xl p-4 bg-[var(--app-surface)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <MessageSquare className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">Messages</div>
            <div className="text-xl font-black">{summary.messages ?? 0}</div>
          </div>
        </div>

        <div className="border border-[var(--app-border)] rounded-2xl p-4 bg-[var(--app-surface)] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-xl">
            <ImageIcon className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold">Photos & Vidéos</div>
            <div className="text-xl font-black">{summary.mediaMessages ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilisateurs */}
        <div className="border border-[var(--app-border)] rounded-2xl p-5 bg-[var(--app-surface)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="font-black text-base">Membres de la plateforme</div>
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[var(--app-border)] rounded-full text-xs bg-[var(--app-surface-raised)] outline-none focus:border-[var(--app-foreground)]"
              />
            </div>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredUsers.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] p-3 text-xs bg-[var(--app-surface-raised)]">
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>{item.displayName}</span>
                    {item.role === "ADMIN" && (
                      <span className="bg-red-500/10 text-red-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full">Admin</span>
                    )}
                  </div>
                  <div className="text-neutral-500">{item.email}</div>
                </div>
                <select
                  value={item.role}
                  onChange={(e) => changeRole(item.id, e.target.value as AdminUser["role"])}
                  className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl px-3 py-2 text-xs outline-none"
                >
                  <option value="USER">USER</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Signalements */}
        <div className="border border-[var(--app-border)] rounded-2xl p-5 bg-[var(--app-surface)] space-y-4 shadow-sm">
          <div className="font-black text-base">Signalements d'abus</div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {reports.map((report) => (
              <div key={report.id} className="rounded-xl border border-[var(--app-border)] p-3 text-xs bg-[var(--app-surface-raised)]">
                <div className="font-bold">{report.reason}</div>
                <div className="text-neutral-500">Par {report.reporter.displayName}</div>
                <div className="text-neutral-400">{new Date(report.createdAt).toLocaleString("fr-FR")}</div>
              </div>
            ))}
            {reports.length === 0 && (
              <div className="text-center py-12 border border-dashed border-[var(--app-border)] rounded-2xl text-neutral-400 text-xs">
                Aucun signalement d'abus en attente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
