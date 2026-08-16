"use client";

import React, { useState } from "react";
import { useAuth } from "./AuthProvider";

type Mode = "login" | "register";

export default function AuthPanel() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMaxBirthDate = () => {
    const today = new Date();
    const maxYear = today.getFullYear() - 18;
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${maxYear}-${month}-${day}`;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        if (!dateOfBirth) {
          throw new Error("La date de naissance est obligatoire.");
        }
        await register({
          email,
          password,
          displayName,
          dateOfBirth: new Date(dateOfBirth).toISOString(),
        });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setMode("login")}
          className={`px-4 py-2 rounded-full text-sm font-bold ${mode === "login" ? "bg-[var(--app-foreground)] text-[var(--app-background)]" : "bg-[var(--app-surface-soft)] text-[var(--app-foreground)]"}`}
          type="button"
        >
          Connexion
        </button>
        <button
          onClick={() => setMode("register")}
          className={`px-4 py-2 rounded-full text-sm font-bold ${mode === "register" ? "bg-[var(--app-foreground)] text-[var(--app-background)]" : "bg-[var(--app-surface-soft)] text-[var(--app-foreground)]"}`}
          type="button"
        >
          Inscription
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "register" && (
          <input
            className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm outline-none"
            placeholder="Nom affiché"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}
        <input
          className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm outline-none"
          placeholder="Adresse e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <input
          className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm outline-none"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
        {mode === "register" && (
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-500 font-bold px-1 uppercase tracking-wider">Date de naissance (Min. 18 ans)</label>
            <input
              className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm outline-none"
              placeholder="Date de naissance"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              type="date"
              max={getMaxBirthDate()}
              required
            />
          </div>
        )}
        {error && <div className="text-sm text-red-500">{error}</div>}
        <button
          disabled={loading}
          className="w-full rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] font-black py-3 text-sm disabled:opacity-50"
          type="submit"
        >
          {loading ? "Chargement..." : mode === "login" ? "Se connecter" : "Créer le compte"}
        </button>
      </form>
    </div>
  );
}
