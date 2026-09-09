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

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await login(email.trim().toLowerCase(), password);
      } else {
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedDisplayName = displayName.trim();

        if (!trimmedDisplayName) {
          throw new Error("Le nom d'utilisateur est requis.");
        }
        if (password !== confirmPassword) {
          throw new Error("Les mots de passe ne correspondent pas.");
        }
        if (!dateOfBirth) {
          throw new Error("La date de naissance est obligatoire.");
        }
        const parsedDob = new Date(dateOfBirth);
        if (isNaN(parsedDob.getTime())) {
          throw new Error("Format de date de naissance invalide.");
        }

        await register({
          email: trimmedEmail,
          password,
          displayName: trimmedDisplayName,
          dateOfBirth: parsedDob.toISOString(),
        });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[32px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4 p-1 rounded-2xl bg-[var(--app-surface-soft)] border border-[var(--app-border)]">
        <button
          onClick={() => setMode("login")}
          className={`px-4 py-2 rounded-full text-sm font-bold flex-1 ${mode === "login" ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-sm" : "bg-transparent text-[var(--app-foreground)]"}`}
          type="button"
        >
          Connexion
        </button>
        <button
          onClick={() => setMode("register")}
          className={`px-4 py-2 rounded-full text-sm font-bold flex-1 ${mode === "register" ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-sm" : "bg-transparent text-[var(--app-foreground)]"}`}
          type="button"
        >
          Inscription
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "register" && (
          <div className="bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 rounded-[22px] p-3 text-xs font-semibold leading-relaxed mb-4">
            🔞 L'inscription est strictement réservée aux personnes âgées de 18 ans et plus. Tout compte ne respectant pas cette règle sera immédiatement supprimé.
          </div>
        )}

        {mode === "register" && (
          <input
            className="w-full rounded-[22px] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[var(--app-accent)]/15"
            placeholder="Nom d'utilisateur"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        )}
        <input
          className="w-full rounded-[22px] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[var(--app-accent)]/15"
          placeholder="Adresse e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <div className="relative">
          <input
            className="w-full rounded-[22px] border border-[var(--app-border)] bg-[var(--app-surface)] pl-4 pr-10 py-3 text-sm outline-none focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[var(--app-accent)]/15"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[var(--app-foreground)] transition-all duration-300 ease-out"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {mode === "register" && (
          <div className="relative">
            <input
              className="w-full rounded-[22px] border border-[var(--app-border)] bg-[var(--app-surface)] pl-4 pr-10 py-3 text-sm outline-none focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[var(--app-accent)]/15"
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
          className="w-full rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] font-black py-3 text-sm disabled:opacity-50 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-out"
          type="submit"
        >
          {loading ? "Chargement..." : mode === "login" ? "Se connecter" : "Créer le compte"}
        </button>
      </form>
    </div>
  );
}
