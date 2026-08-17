"use client";

import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, CheckCircle2, ShieldCheck } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { apiRequest } from "@/lib/api";

export default function ChangePasswordForm() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword.length < 8) {
      setStatus({ type: "error", message: "Le nouveau mot de passe doit comporter au moins 8 caractères." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "Les nouveaux mots de passe ne correspondent pas." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        token,
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      setStatus({ type: "success", message: "Votre mot de passe a été mis à jour avec succès !" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setOpen(false), 2500);
    } catch (err: any) {
      setStatus({ type: "error", message: err?.message || "Erreur lors du changement de mot de passe." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--app-surface-soft)] transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--app-surface-raised)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-foreground)]">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs">Sécurité & Mot de passe</h4>
            <p className="text-[10px] text-neutral-400">Modifier votre mot de passe d'accès</p>
          </div>
        </div>
        <span className="text-xs font-bold text-neutral-400 px-2 py-1 rounded-full bg-[var(--app-surface-soft)]">
          {open ? "Fermer" : "Modifier"}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="p-4 pt-0 space-y-3 border-t border-[var(--app-border)]/60">
          <div className="pt-3 space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Mot de passe actuel</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Votre mot de passe actuel"
                required
                className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] pl-4 pr-10 py-2.5 text-xs outline-none focus:border-[var(--app-foreground)] transition"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[var(--app-foreground)] transition"
              >
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Nouveau mot de passe (Min. 8 car.)</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                required
                className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] pl-4 pr-10 py-2.5 text-xs outline-none focus:border-[var(--app-foreground)] transition"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[var(--app-foreground)] transition"
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-1">Confirmer le nouveau mot de passe</label>
            <input
              type={showNew ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répétez le nouveau mot de passe"
              required
              className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-2.5 text-xs outline-none focus:border-[var(--app-foreground)] transition"
            />
          </div>

          {status && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                status.type === "success"
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-500 border border-red-500/20"
              }`}
            >
              {status.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <ShieldCheck className="w-4 h-4 flex-shrink-0" />}
              <span>{status.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-[var(--app-foreground)] text-[var(--app-background)] text-xs font-black hover:opacity-90 transition disabled:opacity-50 shadow-sm"
          >
            {loading ? "Mise à jour..." : "Enregistrer le nouveau mot de passe"}
          </button>
        </form>
      )}
    </div>
  );
}
