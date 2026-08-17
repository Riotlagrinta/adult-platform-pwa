"use client";

import React, { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Eye, EyeOff } from "lucide-react";
import ModernDatePicker from "./ModernDatePicker";


type Mode = "login" | "register";

export default function AuthPanel() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        if (password !== confirmPassword) {
          throw new Error("Les mots de passe ne correspondent pas.");
        }
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
          <div className="bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 rounded-2xl p-3 text-xs font-semibold leading-relaxed mb-4">
            🔞 L'inscription est strictement réservée aux personnes âgées de 18 ans et plus. Tout compte ne respectant pas cette règle sera immédiatement supprimé.
          </div>
        )}

        {mode === "register" && (
          <input
            className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm outline-none"
            placeholder="Nom d'utilisateur"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        )}
        <input
          className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm outline-none"
          placeholder="Adresse e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <div className="relative">
          <input
            className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] pl-4 pr-10 py-3 text-sm outline-none"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[var(--app-foreground)] transition"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {mode === "register" && (
          <div className="relative">
            <input
              className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] pl-4 pr-10 py-3 text-sm outline-none"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              required
            />
          </div>
        )}
        {mode === "register" && (
          <ModernDatePicker
            value={dateOfBirth}
            onChange={setDateOfBirth}
            required
          />
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
