"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  UserCheck,
  UserX,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import AuthPanel from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

type VerificationRequest = {
  id: string;
  documentType: string;
  documentLast4?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
};

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
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);

  const isStaff = user?.role === "MODERATOR" || user?.role === "ADMIN";
  const selectedRequest = requests.find((request) => request.id === selectedReqId) ?? null;

  useEffect(() => {
    if (!token || !isStaff) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const [summaryPayload, queuePayload, reportsPayload, usersPayload] = await Promise.all([
        apiRequest<{ summary: Record<string, number> }>("/admin/summary", { token }),
        apiRequest<{ queue: VerificationRequest[] }>("/verification/queue", { token }),
        apiRequest<{ reports: ReportItem[] }>("/reports/queue", { token }),
        apiRequest<{ users: AdminUser[] }>("/admin/users", { token }),
      ]);

      if (cancelled) {
        return;
      }

      setSummary(summaryPayload.summary);
      setRequests(queuePayload.queue);
      setReports(reportsPayload.reports);
      setUsers(usersPayload.users);
      setSelectedReqId(queuePayload.queue[0]?.id ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [token, isStaff]);

  const reviewRequest = async (id: string, status: "APPROVED" | "REJECTED" | "SUSPENDED") => {
    if (!token) return;
    await apiRequest(`/verification/${id}/review`, {
      method: "POST",
      token,
      body: JSON.stringify({ status }),
    });
    if (token && isStaff) {
      const [summaryPayload, queuePayload, reportsPayload, usersPayload] = await Promise.all([
        apiRequest<{ summary: Record<string, number> }>("/admin/summary", { token }),
        apiRequest<{ queue: VerificationRequest[] }>("/verification/queue", { token }),
        apiRequest<{ reports: ReportItem[] }>("/reports/queue", { token }),
        apiRequest<{ users: AdminUser[] }>("/admin/users", { token }),
      ]);
      setSummary(summaryPayload.summary);
      setRequests(queuePayload.queue);
      setReports(reportsPayload.reports);
      setUsers(usersPayload.users);
      setSelectedReqId(queuePayload.queue[0]?.id ?? null);
    }
  };

  const changeRole = async (id: string, role: AdminUser["role"]) => {
    if (!token) return;
    await apiRequest(`/admin/users/${id}/role`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ role }),
    });
    if (token && isStaff) {
      const [summaryPayload, queuePayload, reportsPayload, usersPayload] = await Promise.all([
        apiRequest<{ summary: Record<string, number> }>("/admin/summary", { token }),
        apiRequest<{ queue: VerificationRequest[] }>("/verification/queue", { token }),
        apiRequest<{ reports: ReportItem[] }>("/reports/queue", { token }),
        apiRequest<{ users: AdminUser[] }>("/admin/users", { token }),
      ]);
      setSummary(summaryPayload.summary);
      setRequests(queuePayload.queue);
      setReports(reportsPayload.reports);
      setUsers(usersPayload.users);
      setSelectedReqId(queuePayload.queue[0]?.id ?? null);
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (filter === "pending" && request.status !== "PENDING_REVIEW") return false;
    if (filter === "approved" && request.status !== "APPROVED") return false;
    if (filter === "rejected" && request.status === "APPROVED") return false;
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      request.user.displayName.toLowerCase().includes(query) ||
      request.user.email.toLowerCase().includes(query) ||
      request.documentType.toLowerCase().includes(query)
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
      <div className="flex items-center gap-3 border-b border-[var(--app-border)] pb-4">
        <ShieldAlert className="h-6 w-6 text-[var(--app-foreground)]" />
        <div>
          <h2 className="font-black text-xl tracking-tight uppercase">Panel d'administration</h2>
          <p className="text-xs text-neutral-500">Gestion des membres de la plateforme et des signalements d'abus.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilisateurs */}
        <div className="border border-[var(--app-border)] rounded-2xl p-5 bg-[var(--app-surface)] space-y-4 shadow-sm">
          <div className="font-black text-base">Membres de la plateforme</div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {users.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] p-3 text-xs bg-[var(--app-surface-raised)]">
                <div>
                  <div className="font-bold">{item.displayName}</div>
                  <div className="text-neutral-500">{item.email}</div>
                  <div className="text-neutral-400 capitalize">{item.role.toLowerCase()}</div>
                </div>
                <select
                  value={item.role}
                  onChange={(e) => changeRole(item.id, e.target.value as AdminUser["role"])}
                  className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl px-3 py-2 text-xs"
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
