"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Users,
  CheckCircle2,
  Shield,
  Eye,
  Download,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import AuthPanel from "@/components/AuthPanel";
import StoryTray from "@/components/StoryTray";
import { GlobalPulseLoader } from "@/components/SkeletonLoader";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest, toPublicUrl } from "@/lib/api";
import { useIsStandalone } from "@/lib/use-standalone";

type CommunityMember = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  verificationStatus: string;
};

export default function Home() {
  const router = useRouter();
  const { token, user, ready } = useAuth();
  const isStandalone = useIsStandalone();
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadMembers = useCallback(async () => {
    if (!token) return;
    try {
      const followersPayload = await apiRequest<{ followers: CommunityMember[] }>("/social/followers", { token });
      const followingPayload = await apiRequest<{ following: CommunityMember[] }>("/social/following", { token });

      const seen = new Map<string, CommunityMember>();
      [...followersPayload.followers, ...followingPayload.following].forEach((m) => {
        if (m.id !== user?.id && !seen.has(m.id)) {
          seen.set(m.id, m);
        }
      });
      setMembers(Array.from(seen.values()));
    } catch {}
  }, [token, user?.id]);

  useEffect(() => {
    if (token) {
      void loadMembers();
    }
  }, [loadMembers, token]);

  const filteredMembers = members.filter((m) =>
    searchQuery ? m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--app-background)]">
      {/* Mobile Top Bar – WhatsApp style */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)] sticky top-0 bg-[color-mix(in_srgb,var(--app-surface)_96%,transparent)] backdrop-blur-xl z-20">
        <Logo size="sm" showText={true} />
        <div className="flex items-center gap-2">
          {!isStandalone && (
            <Link
              href="/download"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--app-surface-soft)] border border-[var(--app-border)] text-[10px] font-black text-[var(--app-foreground)] hover:opacity-80 transition shadow-sm"
            >
              <Download className="w-3 h-3 text-[var(--app-accent,#25D366)]" />
              <span>APK</span>
            </Link>
          )}
          {user ? (
            <Link href="/profile">
              <div className="w-9 h-9 rounded-full bg-[var(--app-accent,#25D366)]/15 text-[var(--app-accent,#25D366)] flex items-center justify-center font-black text-xs border border-[var(--app-accent,#25D366)]/20">
                {user.displayName.slice(0, 2).toUpperCase()}
              </div>
            </Link>
          ) : (
            <div className="text-xs text-neutral-500">Connexion</div>
          )}
        </div>
      </header>

      {!ready ? (
        <GlobalPulseLoader message="Initialisation sécurisée d'OnlyAdults..." />
      ) : !token ? (
        /* ─── LANDING / AUTH ───────────────────────── */
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12">
          {/* Panneau de Présentation Premium à gauche */}
          <div className="lg:col-span-7 bg-black text-white p-8 md:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-neutral-900 relative overflow-hidden">
            {/* Arrière-plan décoratif premium */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="z-10">
              <Logo size="lg" showText={true} />
            </div>

            <div className="my-auto py-12 md:py-24 space-y-6 z-10">
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-amber-200 to-amber-500 bg-clip-text text-transparent">
                VOTRE ESPACE PRIVÉ PREMIUM
              </h1>
              <p className="text-base md:text-lg text-neutral-400 max-w-xl leading-relaxed">
                Rejoignez OnlyAdults, le réseau exclusif conçu pour échanger, publier et communiquer en toute discrétion. Une expérience épurée, sécurisée et totalement confidentielle.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
                <div className="space-y-2 border-l-2 border-amber-500 pl-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400">Médias Éphémères</h3>
                  <p className="text-xs text-neutral-400">
                    Partagez des photos et des vidéos temporaires avec compte à rebours de destruction automatique et filigrane dynamique anti-capture.
                  </p>
                </div>
                <div className="space-y-2 border-l-2 border-amber-500 pl-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400">Messagerie Sécurisée</h3>
                  <p className="text-xs text-neutral-400">
                    Communiquez en temps réel avec un chiffrement des sessions, un indicateur de saisie discret et un contrôle total sur vos blocages.
                  </p>
                </div>
                <div className="space-y-2 border-l-2 border-amber-500 pl-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400">Zéro Publicité</h3>
                  <p className="text-xs text-neutral-400">
                    Aucun algorithme de recommandation invasif, aucun traqueur publicitaire. Juste vous et votre communauté en toute intimité.
                  </p>
                </div>
                <div className="space-y-2 border-l-2 border-amber-500 pl-4">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400">Zéro Censure Externe</h3>
                  <p className="text-xs text-neutral-400">
                    Un espace autonome réservé aux adultes consentants avec modération interne pour garantir le respect de chacun.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-neutral-500 tracking-wider z-10">
              © 2026 ONLYADULTS. TOUS DROITS RÉSERVÉS. ESPACE RÉSERVÉ AUX ADULTES.
            </div>
          </div>

          {/* Panneau de Connexion/Inscription à droite */}
          <div className="lg:col-span-5 bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-center p-6 md:p-12">
            <div className="max-w-md w-full mx-auto space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Accéder au club</h2>
                <p className="text-xs text-neutral-500">
                  Entrez vos identifiants ou inscrivez-vous en quelques clics pour débloquer votre accès.
                </p>
              </div>
              <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-900 rounded-3xl p-6 shadow-sm">
                <AuthPanel />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─── HUB PRINCIPAL CONNECTÉ ─── WhatsApp-style ─── */
        <>
          {/* Story Tray – Bande de stories éphémères en haut */}
          <StoryTray />

          {/* Section Rapide – Accès messages */}
          <div className="mx-4 mt-4">
            <Link
              href="/messages"
              className="flex items-center justify-between p-4 rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[var(--app-accent,#25D366)]/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[var(--app-accent,#25D366)]" />
                </div>
                <div>
                  <div className="font-bold text-sm">Messagerie Privée</div>
                  <div className="text-[11px] text-neutral-500">Chiffrée · Photos éphémères · Temps réel</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-[var(--app-accent,#25D366)] transition-colors" />
            </Link>
          </div>

          {/* Section Communauté – Membres */}
          <div className="mx-4 mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-bold">Communauté</div>
                <h2 className="text-lg font-black tracking-tight">Membres</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-1.5">
                  <span className="text-xs font-black">{members.length}</span>
                  <span className="text-[10px] text-neutral-500 ml-1">contacts</span>
                </div>
              </div>
            </div>

            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un membre..."
                className="w-full pl-10 pr-4 py-2.5 border border-[var(--app-border)] rounded-2xl text-sm bg-[var(--app-surface)] outline-none focus:border-[var(--app-accent,#25D366)] transition-colors"
              />
            </div>

            {/* Liste des membres */}
            <div className="space-y-1.5">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm">
                  <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
                  <div>Aucun membre trouvé</div>
                  <div className="text-[11px] text-neutral-400 mt-1">Commencez par suivre d&apos;autres profils</div>
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => router.push(`/profile/${member.id}`)}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-[var(--app-surface-soft)] cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {member.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-sm truncate">
                          <span className="truncate">{member.displayName}</span>
                          {member.verificationStatus === "APPROVED" && (
                            <CheckCircle2 className="h-3.5 w-3.5 fill-[var(--app-accent,#25D366)] text-white dark:text-black flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {member.verificationStatus === "APPROVED" ? "Vérifié" : "Membre"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/messages");
                      }}
                      className="p-2 rounded-full hover:bg-[var(--app-accent,#25D366)]/10 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <MessageSquare className="w-4 h-4 text-[var(--app-accent,#25D366)]" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section Sécurité & Confiance */}
          <div className="mx-4 mt-6 mb-6">
            <div className="rounded-[20px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 space-y-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-bold">Sécurité & Confidentialité</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[var(--app-surface-raised)]">
                  <Shield className="w-5 h-5 text-[var(--app-accent,#25D366)]" />
                  <span className="text-[10px] font-bold text-center leading-tight">Chiffrement E2E</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[var(--app-surface-raised)]">
                  <Eye className="w-5 h-5 text-[var(--app-accent,#25D366)]" />
                  <span className="text-[10px] font-bold text-center leading-tight">Anti-capture</span>
                </div>
                <Link
                  href="/settings"
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-soft)] transition"
                >
                  <Users className="w-5 h-5 text-[var(--app-accent,#25D366)]" />
                  <span className="text-[10px] font-bold text-center leading-tight">Paramètres</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
