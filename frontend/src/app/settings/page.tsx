"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  User,
  Camera,
  Edit3,
  Share2,
  CheckCircle2,
  KeyRound,
  Lock,
  Eye,
  ShieldCheck,
  Palette,
  Bell,
  Download,
  HelpCircle,
  LogOut,
  ChevronRight,
  ChevronDown,
  Loader2,
  Users,
  ShieldAlert,
  Sparkles,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthPanel from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import ThemeSelector from "@/components/ThemeSelector";
import PwaIconSelector from "@/components/PwaIconSelector";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { useIsStandalone } from "@/lib/use-standalone";
import { apiRequest, toPublicUrl } from "@/lib/api";
import { soundManager } from "@/lib/sound";

type MyUser = {
  id: string;
  email: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  verificationStatus: string;
  profile?: { city?: string | null; country?: string | null; headline?: string | null } | null;
};

type BlockedUser = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const { token, ready, user, logout, refreshUser } = useAuth();
  const isStandalone = useIsStandalone();

  const [me, setMe] = useState<MyUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Formulaire d'édition de profil
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [headline, setHeadline] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Relations & Social
  const [followers, setFollowers] = useState<{ id: string; displayName: string; avatarUrl?: string | null }[]>([]);
  const [following, setFollowing] = useState<{ id: string; displayName: string; avatarUrl?: string | null }[]>([]);
  const [showRelations, setShowRelations] = useState(false);

  // Blocages & Confidentialité
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  // Accordéons de réglages
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (name: string) => {
    setOpenSection((prev) => (prev === name ? null : name));
  };

  const loadFullProfile = useCallback(async () => {
    if (!token) return;
    setLoadingProfile(true);
    try {
      const mePayload = await apiRequest<{ user: MyUser }>("/auth/me", { token });
      const followersPayload = await apiRequest<{ followers: any[] }>("/social/followers", { token });
      const followingPayload = await apiRequest<{ following: any[] }>("/social/following", { token });
      const blocksPayload = await apiRequest<{ blocked: any[] }>("/blocks", { token }).catch(() => ({ blocked: [] }));

      setMe(mePayload.user);
      setDisplayName(mePayload.user.displayName);
      setBio(mePayload.user.bio ?? "");
      setCity(mePayload.user.profile?.city ?? "");
      setHeadline(mePayload.user.profile?.headline ?? "");
      setFollowers(followersPayload.followers || []);
      setFollowing(followingPayload.following || []);
      setBlockedUsers(blocksPayload.blocked || []);
    } catch (err) {
      console.error("Erreur de chargement du profil:", err);
    } finally {
      setLoadingProfile(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadFullProfile();
    }
  }, [loadFullProfile, token]);

  const handleSaveProfile = async () => {
    if (!token) return;
    setSavingProfile(true);
    try {
      await apiRequest("/profile/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          displayName,
          bio,
          city,
          headline,
        }),
      });

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        await apiRequest("/files/avatar", {
          method: "POST",
          token,
          body: formData,
        });
      }

      await refreshUser();
      await loadFullProfile();
      setAvatarFile(null);
      setIsEditingProfile(false);
      alert("✅ Profil mis à jour avec succès !");
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du profil:", err);
      alert(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    if (!token) return;
    try {
      await apiRequest(`/blocks/${blockedId}`, {
        method: "DELETE",
        token,
      });
      setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedId));
      alert("Membre débloqué avec succès.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur de déblocage");
    }
  };

  const handleCopyLink = () => {
    if (!me) return;
    const url = `${window.location.origin}/profile/${me.id}`;
    navigator.clipboard.writeText(url);
    alert("📋 Votre lien de profil privé a été copié dans le presse-papier !");
  };

  const handleTestSound = () => {
    soundManager.playMessageSound();
    alert("🔔 Son de notification joué avec succès !");
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--app-background)] text-neutral-500 text-sm">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--app-accent,#25D366)] mr-2" />
        <span>Chargement des paramètres...</span>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="p-4 md:p-6 min-h-screen bg-[var(--app-background)]">
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-background)] min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] text-[var(--app-foreground)] select-none">
      {/* ─── HEADER TYPE WHATSAPP (Barre supérieure) ─── */}
      <header className="sticky top-0 bg-[color-mix(in_srgb,var(--app-surface)_96%,transparent)] backdrop-blur-xl border-b border-[var(--app-border)] px-4 py-3 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[var(--app-accent,#25D366)]/15 text-[var(--app-accent,#25D366)] flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-black tracking-tight">Paramètres & Profil</h1>
        </div>
        <button
          onClick={handleCopyLink}
          className="p-2 rounded-full hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-[var(--app-foreground)] transition"
          title="Partager mon lien de profil"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* ─── 1. CARTE PROFIL WHATSAPP ─── */}
        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            {/* Avatar interactif avec déclencheur de photo */}
            <label className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-2xl border-2 border-[var(--app-border)] overflow-hidden cursor-pointer group flex-shrink-0 shadow-md">
              {avatarFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Aperçu avatar" src={URL.createObjectURL(avatarFile)} className="w-full h-full object-cover" />
              ) : me?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={me.displayName} src={toPublicUrl(me.avatarUrl) ?? undefined} className="w-full h-full object-cover" />
              ) : (
                <span>{(me?.displayName || "OA").slice(0, 2).toUpperCase()}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-6 h-6" />
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setAvatarFile(e.target.files[0]);
                    setIsEditingProfile(true);
                  }
                }}
              />
            </label>

            {/* Infos rapides */}
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-1.5 font-black text-base sm:text-lg">
                <span className="truncate">{me?.displayName || user?.displayName}</span>
                {me?.verificationStatus === "APPROVED" && (
                  <CheckCircle2 className="h-4 w-4 fill-[var(--app-accent,#25D366)] text-white dark:text-black flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-neutral-500 truncate">
                {me?.profile?.headline ?? me?.bio ?? "Disponible sur OnlyAdults"}
              </p>
              {me?.profile?.city && (
                <p className="text-[11px] text-neutral-400 truncate">
                  📍 {me.profile.city}
                </p>
              )}
            </div>

            {/* Bouton d'édition rapide */}
            <button
              onClick={() => setIsEditingProfile((prev) => !prev)}
              className="p-2.5 rounded-2xl bg-[var(--app-surface-raised)] border border-[var(--app-border)] hover:bg-[var(--app-surface-soft)] transition text-[var(--app-foreground)] flex-shrink-0 shadow-sm"
              title="Modifier mes informations"
            >
              <Edit3 className="w-4 h-4 text-[var(--app-accent,#25D366)]" />
            </button>
          </div>

          {/* Formulaire d'édition de profil dépliable */}
          {isEditingProfile && (
            <div className="pt-3 border-t border-[var(--app-border)] space-y-3 animate-fadeIn">
              <div className="text-[10px] uppercase font-bold text-[var(--app-accent,#25D366)] tracking-wider">
                Modifier mes informations de profil
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 block mb-1">Nom affiché</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-sm outline-none focus:border-[var(--app-accent,#25D366)]"
                    placeholder="Votre nom ou pseudonyme"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 block mb-1">Actu / Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-sm outline-none focus:border-[var(--app-accent,#25D366)] min-h-[70px]"
                    placeholder="Votre bio ou statut WhatsApp..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 block mb-1">Ville</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-xs outline-none focus:border-[var(--app-accent,#25D366)]"
                      placeholder="Paris, Lyon..."
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 block mb-1">Titre</label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-xs outline-none focus:border-[var(--app-accent,#25D366)]"
                      placeholder="Profession, passion..."
                    />
                  </div>
                </div>

                {avatarFile && (
                  <div className="text-[11px] text-[var(--app-accent,#25D366)] font-bold">
                    📸 Nouvelle photo sélectionnée : {avatarFile.name}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex-1 py-2.5 rounded-2xl bg-[var(--app-accent,#25D366)] hover:opacity-90 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <span>Enregistrer les modifications</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingProfile(false);
                      setAvatarFile(null);
                    }}
                    className="px-4 py-2.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-xs font-bold hover:bg-[var(--app-surface-soft)] transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Statistiques Relations (Abonnés / Suivis) */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--app-border)] text-xs">
            <button
              onClick={() => setShowRelations((v) => !v)}
              className="flex items-center gap-4 hover:opacity-80 transition"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[var(--app-foreground)]">{followers.length}</span>
                <span className="text-neutral-500">Abonnés</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[var(--app-foreground)]">{following.length}</span>
                <span className="text-neutral-500">Suivis</span>
              </div>
            </button>

            <button
              onClick={handleCopyLink}
              className="text-[11px] font-bold text-[var(--app-accent,#25D366)] hover:underline flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" />
              <span>Inviter</span>
            </button>
          </div>

          {/* Liste déroulante des relations */}
          {showRelations && (
            <div className="pt-3 border-t border-[var(--app-border)] space-y-3 animate-fadeIn text-xs">
              <div className="font-bold text-neutral-400">Contacts & Relations</div>
              {followers.length === 0 && following.length === 0 ? (
                <p className="text-neutral-500 italic">Aucun abonné ou suivi pour le moment.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {[...followers, ...following].map((u, idx) => (
                    <div
                      key={`${u.id}-${idx}`}
                      onClick={() => router.push(`/profile/${u.id}`)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[var(--app-surface-soft)] cursor-pointer transition"
                    >
                      <div className="w-7 h-7 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-[10px]">
                        {u.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold truncate">{u.displayName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── 2. SECTIONS DE RÉGLAGES STYLE WHATSAPP ─── */}

        {/* SECTION A : COMPTE & SÉCURITÉ */}
        <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden shadow-sm divide-y divide-[var(--app-border)]">
          <div
            onClick={() => toggleSection("account")}
            className="flex items-center justify-between p-4 hover:bg-[var(--app-surface-soft)] cursor-pointer transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm">Compte & Sécurité</div>
                <div className="text-[11px] text-neutral-400">Mot de passe, vérification d&apos;identité</div>
              </div>
            </div>
            {openSection === "account" ? (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            )}
          </div>

          {openSection === "account" && (
            <div className="p-4 bg-[var(--app-surface-raised)] space-y-4 animate-fadeIn">
              <ChangePasswordForm />
              <div className="pt-2 flex items-center justify-between text-xs border-t border-[var(--app-border)]">
                <span className="text-neutral-500">Statut de vérification :</span>
                <span className="font-black px-2.5 py-1 rounded-full bg-[var(--app-accent,#25D366)]/10 text-[var(--app-accent,#25D366)] border border-[var(--app-accent,#25D366)]/20">
                  {me?.verificationStatus === "APPROVED" ? "Vérifié officiel" : "Membre Standard"}
                </span>
              </div>
            </div>
          )}

          {/* SECTION B : CONFIDENTIALITÉ */}
          <div
            onClick={() => toggleSection("privacy")}
            className="flex items-center justify-between p-4 hover:bg-[var(--app-surface-soft)] cursor-pointer transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm">Confidentialité</div>
                <div className="text-[11px] text-neutral-400">Chiffrement E2E, anti-capture, blocages</div>
              </div>
            </div>
            {openSection === "privacy" ? (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            )}
          </div>

          {openSection === "privacy" && (
            <div className="p-4 bg-[var(--app-surface-raised)] space-y-3 animate-fadeIn text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold">Chiffrement de bout en bout</span>
                </div>
                <span className="text-[10px] text-emerald-500 font-bold">Actif</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className="font-bold">Protection anti-capture (Filigrane)</span>
                </div>
                <span className="text-[10px] text-blue-500 font-bold">Actif</span>
              </div>

              <div className="pt-2 space-y-2">
                <div className="font-bold text-neutral-400">Membres bloqués ({blockedUsers.length})</div>
                {blockedUsers.length === 0 ? (
                  <p className="text-neutral-500 italic">Aucun membre bloqué.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {blockedUsers.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-2 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)]">
                        <span className="font-bold truncate">{b.displayName}</span>
                        <button
                          onClick={() => handleUnblock(b.id)}
                          className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold text-[10px] transition"
                        >
                          Débloquer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION C : APPARENCE & ICÔNES DE CAMOUFLAGE */}
          <div
            onClick={() => toggleSection("appearance")}
            className="flex items-center justify-between p-4 hover:bg-[var(--app-surface-soft)] cursor-pointer transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm">Apparence & Camouflage PWA</div>
                <div className="text-[11px] text-neutral-400">Icônes discrètes, thèmes sombre et clair</div>
              </div>
            </div>
            {openSection === "appearance" ? (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            )}
          </div>

          {openSection === "appearance" && (
            <div className="p-4 bg-[var(--app-surface-raised)] space-y-4 animate-fadeIn">
              <PwaIconSelector />
              <div className="border-t border-[var(--app-border)] pt-4">
                <ThemeSelector />
              </div>
            </div>
          )}

          {/* SECTION D : NOTIFICATIONS & SONS */}
          <div
            onClick={() => toggleSection("notifications")}
            className="flex items-center justify-between p-4 hover:bg-[var(--app-surface-soft)] cursor-pointer transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm">Notifications & Sons</div>
                <div className="text-[11px] text-neutral-400">Alertes en direct et sonneries</div>
              </div>
            </div>
            {openSection === "notifications" ? (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            )}
          </div>

          {openSection === "notifications" && (
            <div className="p-4 bg-[var(--app-surface-raised)] space-y-3 animate-fadeIn text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]">
                <div>
                  <div className="font-bold">Notifications Flottantes In-App</div>
                  <div className="text-[11px] text-neutral-400">Affichage automatique lors de nouveaux messages privés</div>
                </div>
                <span className="text-[10px] text-[var(--app-accent,#25D366)] font-black">Actif</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)]">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[var(--app-accent,#25D366)]" />
                  <div>
                    <div className="font-bold">Sonneries de messages</div>
                    <div className="text-[11px] text-neutral-400">Signal sonore discret WhatsApp style</div>
                  </div>
                </div>
                <button
                  onClick={handleTestSound}
                  className="px-3 py-1.5 rounded-full bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-soft)] border border-[var(--app-border)] font-bold text-[10px] transition"
                >
                  Tester le son
                </button>
              </div>
            </div>
          )}

          {/* SECTION E : APK ANDROID (si pas en standalone) */}
          {!isStandalone && (
            <div
              onClick={() => router.push("/download")}
              className="flex items-center justify-between p-4 hover:bg-[var(--app-surface-soft)] cursor-pointer transition"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-500/15 text-teal-500 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm">Application Android (.APK)</div>
                  <div className="text-[11px] text-neutral-400">Télécharger le fichier d&apos;installation officiel</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          )}

          {/* SECTION F : AIDE & SUPPORT */}
          <div
            onClick={() => alert("💬 Support OnlyAdults : Pour toute assistance, écrivez à contact@onlyadults.club")}
            className="flex items-center justify-between p-4 hover:bg-[var(--app-surface-soft)] cursor-pointer transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-neutral-500/15 text-neutral-400 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm">Aide & Informations</div>
                <div className="text-[11px] text-neutral-400">Règlement du club, version OnlyAdults 2026</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </div>
        </section>

        {/* ─── 3. BOUTON DE DÉCONNEXION WHATSAPP-STYLE ─── */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 dark:bg-red-950/25 dark:text-red-400 py-3.5 rounded-2xl font-black text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition shadow-sm border border-red-200 dark:border-red-900/30"
        >
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter d&apos;OnlyAdults</span>
        </button>
      </div>
    </div>
  );
}
