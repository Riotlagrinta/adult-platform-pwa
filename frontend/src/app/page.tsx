"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  MessageSquare,
  Search,
  Users,
  CheckCircle2,
  Download,
  Loader2,
  X,
  UserCheck,
  UserPlus,
  Compass,
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
  bio?: string | null;
  verificationStatus: string;
  profile?: { city?: string | null; country?: string | null; headline?: string | null } | null;
};

export default function Home() {
  const router = useRouter();
  const { token, user, ready } = useAuth();
  const isStandalone = useIsStandalone();
  
  const [followingMembers, setFollowingMembers] = useState<CommunityMember[]>([]);
  const [searchResults, setSearchResults] = useState<CommunityMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [mode, setMode] = useState<"following" | "discover">("following");
  const [justLikedId, setJustLikedId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Charger les comptes suivis
  const loadFollowing = useCallback(async () => {
    if (!token) return;
    setLoadingMembers(true);
    try {
      const res = await apiRequest<{ following: CommunityMember[] }>("/social/following", { token });
      setFollowingMembers(res.following || []);
    } catch (err) {
      console.error("Erreur de chargement des suivis:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [token]);

  // Rechercher parmi tous les membres
  const searchCommunity = useCallback(async (query: string) => {
    if (!token) return;
    setLoadingMembers(true);
    try {
      const endpoint = query.trim()
        ? `/users/search?q=${encodeURIComponent(query.trim())}`
        : "/users/search";
      const res = await apiRequest<{ users: CommunityMember[] }>(endpoint, { token });
      setSearchResults(res.users || []);
    } catch (err) {
      console.error("Erreur de recherche:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadFollowing();
    }
  }, [loadFollowing, token]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length > 0) {
      setMode("discover");
      searchTimeoutRef.current = setTimeout(() => {
        void searchCommunity(val);
      }, 300);
    } else {
      setMode("following");
      setSearchResults([]);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setMode("following");
    setSearchResults([]);
    void loadFollowing();
  };

  // Petit rebond visuel sur le bouton "Message" au clic (l'app n'a pas de concept de "like").
  const handleMessageBounce = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJustLikedId(id);
    setTimeout(() => {
      setJustLikedId((curr) => (curr === id ? null : curr));
    }, 300);
    router.push(`/messages`);
  };

  const displayedMembers = mode === "discover" || searchQuery.trim() ? searchResults : followingMembers;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--app-background)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] selection:bg-[var(--app-accent)]/20">
      {/* Mobile Top Bar – WhatsApp style */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-[var(--app-border)] sticky top-0 bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] backdrop-blur-xl z-20">
        <Logo size="sm" showText={true} />
        <div className="flex items-center gap-2">
          {!isStandalone && (
            <Link
              href="/download"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--app-surface-soft)] border border-[var(--app-border)] text-[10px] font-black text-[var(--app-foreground)] hover:opacity-80 transition-all duration-300 ease-out shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <Download className="w-3 h-3 text-[var(--app-accent,#25D366)]" />
              <span>APK</span>
            </Link>
          )}
          {user ? (
            <Link href="/settings" title="Paramètres & Profil">
              <div className="w-9 h-9 rounded-full bg-[var(--app-accent,#25D366)]/15 text-[var(--app-accent,#25D366)] flex items-center justify-center font-black text-xs border border-[var(--app-accent,#25D366)]/25 hover:scale-105 transition-all duration-300 ease-out shadow-sm">
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
          <div className="lg:col-span-7 bg-black text-white p-8 md:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-neutral-900 relative overflow-hidden">
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
                <div className="space-y-2 border-l-2 border-amber-500 pl-4 rounded-r-2xl">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400">Stories 24h & Statut</h3>
                  <p className="text-xs text-neutral-400">
                    Partagez des stories photos et vidéos éphémères visibles 24 heures avec filigrane dynamique anti-capture.
                  </p>
                </div>
                <div className="space-y-2 border-l-2 border-amber-500 pl-4 rounded-r-2xl">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-amber-400">Messagerie Sécurisée</h3>
                  <p className="text-xs text-neutral-400">
                    Communiquez en temps réel avec un chiffrement des sessions, photos éphémères et contrôle total.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-neutral-500 tracking-wider z-10">
              © 2026 ONLYADULTS. TOUS DROITS RÉSERVÉS. ESPACE RÉSERVÉ AUX ADULTES.
            </div>
          </div>

          <div className="lg:col-span-5 bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-center p-6 md:p-12">
            <div className="max-w-md w-full mx-auto space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Accéder au club</h2>
                <p className="text-xs text-neutral-500">
                  Entrez vos identifiants ou inscrivez-vous en quelques clics pour débloquer votre accès.
                </p>
              </div>
              <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-900 rounded-[32px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <AuthPanel />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─── HUB PRINCIPAL CONNECTÉ (ACTUS) ─── */
        <>
          {/* Story Tray – Bande de stories éphémères en haut */}
          <StoryTray />

          {/* Section Membres suivis */}
          <div className="mx-4 mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-bold">Actus</div>
                <h2 className="text-xl font-black tracking-tight">
                  {mode === "following" ? "Comptes suivis" : "Découvrir des membres"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-1.5 shadow-sm">
                  <span className="text-xs font-black">{displayedMembers.length}</span>
                  <span className="text-[10px] text-neutral-500 ml-1">
                    {mode === "following" ? "suivis" : "résultats"}
                  </span>
                </div>
              </div>
            </div>

            {/* Onglets de filtre (Mes Suivis / Découvrir) */}
            <div className="flex items-center gap-2 p-1 rounded-[28px] bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] backdrop-blur-xl border border-[var(--app-border)] text-xs font-bold shadow-sm">
              <button
                onClick={() => {
                  setMode("following");
                  setSearchQuery("");
                  void loadFollowing();
                }}
                className={`flex-1 py-2.5 px-3 rounded-[22px] transition-all duration-300 ease-out flex items-center justify-center gap-1.5 ${
                  mode === "following"
                    ? "bg-[var(--app-surface)] text-[var(--app-foreground)] shadow-sm"
                    : "text-neutral-400 hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-soft)]"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-[var(--app-accent,#25D366)]" />
                <span>Mes Abonnements ({followingMembers.length})</span>
              </button>
              <button
                onClick={() => {
                  setMode("discover");
                  void searchCommunity("");
                }}
                className={`flex-1 py-2.5 px-3 rounded-[22px] transition-all duration-300 ease-out flex items-center justify-center gap-1.5 ${
                  mode === "discover"
                    ? "bg-[var(--app-surface)] text-[var(--app-foreground)] shadow-sm"
                    : "text-neutral-400 hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-soft)]"
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-blue-500" />
                <span>Découvrir</span>
              </button>
            </div>

            {/* Barre de Recherche Dynamique */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Rechercher parmi les membres..."
                className="w-full pl-10 pr-10 py-3 border border-[var(--app-border)] rounded-[24px] text-sm bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] backdrop-blur-xl outline-none focus:border-[var(--app-accent,#25D366)] focus:ring-2 focus:ring-[var(--app-accent,#25D366)]/15 transition-all duration-300 ease-out shadow-sm"
              />
              {loadingMembers ? (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 animate-spin" />
              ) : searchQuery ? (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-[var(--app-foreground)] transition-all duration-300 ease-out"
                  title="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* Liste des Membres */}
            <div className="space-y-2">
              {loadingMembers && displayedMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-500 text-sm gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--app-accent,#25D366)]" />
                  <span>Chargement...</span>
                </div>
              ) : displayedMembers.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm bg-[var(--app-surface)] rounded-[32px] border border-[var(--app-border)] p-6 space-y-3 shadow-sm card-3d">
                  <Users className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-700" />
                  <div className="font-bold">
                    {mode === "following" ? "Vous ne suivez aucun compte" : "Aucun membre trouvé"}
                  </div>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    {mode === "following"
                      ? "Recherchez et suivez d'autres membres pour voir leurs actus et leurs stories directement ici !"
                      : `Aucun membre ne correspond à « ${searchQuery} ».`}
                  </p>
                  {mode === "following" ? (
                    <button
                      onClick={() => {
                        setMode("discover");
                        void searchCommunity("");
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--app-accent,#25D366)] text-white text-xs font-bold hover:opacity-90 transition-all duration-300 ease-out shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Découvrir la communauté</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleClearSearch}
                      className="text-xs font-bold text-[var(--app-accent,#25D366)] hover:underline transition-all duration-300 ease-out"
                    >
                      Retour aux abonnements
                    </button>
                  )}
                </div>
              ) : (
                displayedMembers.map((member, index) => (
                  <div
                    key={member.id}
                    onClick={() => router.push(`/profile/${member.id}`)}
                    className="card-3d flex items-center justify-between p-3.5 rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] hover:border-[var(--app-accent,#25D366)]/50 hover:bg-[var(--app-surface-soft)] cursor-pointer transition-all duration-300 ease-out group shadow-sm animate-slideUp"
                    style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden shadow-sm ring-1 ring-black/5">
                        {member.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={toPublicUrl(member.avatarUrl) ?? undefined}
                            alt={member.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          member.displayName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-sm truncate">
                          <span className="truncate">{member.displayName}</span>
                          {member.verificationStatus === "APPROVED" && (
                            <CheckCircle2 className="h-4 w-4 fill-[var(--app-accent,#25D366)] text-white dark:text-black flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 truncate max-w-[220px] sm:max-w-md">
                          {member.profile?.headline ?? member.bio ?? (member.verificationStatus === "APPROVED" ? "Membre vérifié" : "Membre")}
                        </p>
                        {member.profile?.city && (
                          <span className="text-[10px] text-neutral-400 block truncate">
                            📍 {member.profile.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleMessageBounce(member.id, e)}
                        className={`p-2.5 rounded-full bg-[var(--app-surface-raised)] hover:bg-[var(--app-accent,#25D366)]/15 text-[var(--app-foreground)] hover:text-[var(--app-accent,#25D366)] transition-all duration-300 ease-out flex-shrink-0 border border-[var(--app-border)] hover:-translate-y-0.5 ${
                          justLikedId === member.id ? "like-pop text-[var(--app-accent,#25D366)]" : ""
                        }`}
                        title="Envoyer un message privé"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
