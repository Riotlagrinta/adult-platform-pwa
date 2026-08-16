"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import Logo from "@/components/Logo";
import AuthPanel from "@/components/AuthPanel";
import StoryTray from "@/components/StoryTray";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest, toPublicUrl } from "@/lib/api";

type FeedPost = {
  id: string;
  authorId: string;
  caption?: string | null;
  createdAt: string;
  visibility: "PUBLIC" | "FOLLOWERS" | "VERIFIED_ONLY";
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    verificationStatus: string;
  };
  likes: { id: string; userId: string }[];
  comments: { id: string }[];
  media: {
    id: string;
    url: string;
    kind: "IMAGE" | "VIDEO";
    mimeType: string;
  }[];
};

export default function Home() {
  const { token, user, ready } = useAuth();
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const loadFeed = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = await apiRequest<{ feed: FeedPost[] }>("/social/feed", { token });
      setFeed(payload.feed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le fil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadFeed();
    }
  }, [token]);

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!token) {
      return;
    }

    await apiRequest(`/posts/${postId}/like`, {
      method: liked ? "DELETE" : "POST",
      token,
    });
    await loadFeed();
  };

  const submitComment = async (postId: string) => {
    if (!token) {
      return;
    }

    const content = commentDraft.trim();
    if (!content) {
      return;
    }

    setCommentSubmitting(true);
    try {
      await apiRequest(`/posts/${postId}/comments`, {
        method: "POST",
        token,
        body: JSON.stringify({ content }),
      });
      setCommentDraft("");
      setActiveCommentPostId(null);
      await loadFeed();
    } finally {
      setCommentSubmitting(false);
    }
  };

  const reportPost = async (postId: string) => {
    const reason = prompt("Indiquez la raison du signalement de cette publication :");
    if (!reason?.trim() || !token) {
      return;
    }

    try {
      await apiRequest("/reports", {
        method: "POST",
        token,
        body: JSON.stringify({
          reason,
          targetPostId: postId,
        }),
      });
      alert("La publication a été signalée avec succès.");
    } catch (err) {
      alert("Erreur lors de l'envoi du signalement.");
    }
  };

  const recentProfiles = useMemo(() => {
    const seen = new Map<string, { id: string; displayName: string; avatarUrl?: string | null }>();
    if (user) {
      seen.set(user.id, {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });
    }

    feed.forEach((post) => {
      if (!seen.has(post.author.id)) {
        seen.set(post.author.id, {
          id: post.author.id,
          displayName: post.author.displayName,
          avatarUrl: post.author.avatarUrl,
        });
      }
    });

    return Array.from(seen.values()).slice(0, 5);
  }, [feed, user]);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--app-background)]">
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)] sticky top-0 bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] backdrop-blur-md z-20">
        <Logo size="sm" showText={true} />
        {user ? (
          <div className="w-8 h-8 rounded-full bg-[var(--app-surface-soft)] flex items-center justify-center font-bold text-xs">
            {user.displayName.slice(0, 2).toUpperCase()}
          </div>
        ) : (
          <div className="text-xs text-neutral-500">Connexion</div>
        )}
      </header>

      {!ready ? (
        <div className="p-6 text-sm text-neutral-500">Chargement de la session...</div>
      ) : !token ? (
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
        <>
          <div className="mx-4 mt-4 rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 md:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Fil social</div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                  Bonjour {user?.displayName?.split(" ")[0] ?? "membre"}
                </h2>
                <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
                  Découvrez les dernières publications, répondez aux commentaires et gardez un espace visuel propre sur tous les thèmes.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Profils</div>
                  <div className="text-lg font-black">{recentProfiles.length}</div>
                </div>
                <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Médias</div>
                  <div className="text-lg font-black">{feed.filter((post) => post.media.length > 0).length}</div>
                </div>
              </div>
            </div>
          </div>

          <StoryTray />

          <div className="p-4 flex items-center justify-between border-b border-[var(--app-border)]">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">Fil social</div>
              <h2 className="text-xl font-black">Publications récentes</h2>
            </div>
            <button
              onClick={loadFeed}
              className="text-xs font-bold px-4 py-2 rounded-full bg-[var(--app-surface-soft)]"
            >
              Rafraîchir
            </button>
          </div>

          {loading && <div className="p-6 text-sm text-neutral-500">Chargement du fil...</div>}
          {error && <div className="p-6 text-sm text-red-500">{error}</div>}

          <div className="divide-y divide-[var(--app-border)]">
            {feed.length === 0 && !loading ? (
              <div className="py-20 text-center text-neutral-500">
                Aucune publication disponible.
              </div>
            ) : (
              feed.map((post) => {
                const firstMedia = post.media[0];
                const mediaUrl = toPublicUrl(firstMedia?.url);
                const liked = post.likes.some((like) => like.userId === user?.id);
                return (
                  <article key={post.id} className="p-4 md:p-6 space-y-4 bg-[var(--app-surface)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-base">
                          {(post.author.avatarUrl ? post.author.displayName : post.author.displayName).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>{post.author.displayName}</span>
                            {post.author.verificationStatus === "APPROVED" && (
                              <CheckCircle2 className="h-4 w-4 fill-black text-white dark:fill-white dark:text-black" />
                            )}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {post.visibility} · {new Date(post.createdAt).toLocaleString("fr-FR")}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => reportPost(post.id)}
                        className="text-neutral-500 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
                        title="Signaler la publication"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>

                    {post.caption && (
                      <p className="text-sm md:text-base leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-line">
                        {post.caption}
                      </p>
                    )}

                    {mediaUrl && (
                      <div className="rounded-2xl overflow-hidden aspect-video border border-[var(--app-border)] bg-[var(--app-surface-soft)]">
                        {firstMedia?.kind === "VIDEO" ? (
                          <video controls className="h-full w-full object-cover" src={mediaUrl} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="Média" src={mediaUrl} className="h-full w-full object-cover" />
                        )}
                      </div>
                    )}

                    {!mediaUrl && (
                      <div className="rounded-2xl border border-dashed border-[var(--app-border)] p-6 text-center text-neutral-400">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                        Aucun média joint
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-6">
                        <button
                          onClick={() => toggleLike(post.id, liked)}
                          className="flex items-center gap-2 p-1 hover:text-red-500"
                        >
                          <Heart className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                          <span className="text-xs font-bold">{post.likes.length}</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveCommentPostId(post.id);
                            setCommentDraft("");
                          }}
                          className="flex items-center gap-2 p-1 hover:text-black dark:hover:text-white"
                        >
                          <MessageCircle className="h-5 w-5" />
                          <span className="text-xs font-bold">{post.comments.length}</span>
                        </button>
                      </div>
                    </div>

                    {activeCommentPostId === post.id && (
                      <div className="space-y-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-950">
                        <div className="flex items-start gap-3">
                          <textarea
                            value={commentDraft}
                            onChange={(event) => setCommentDraft(event.target.value)}
                            placeholder="Écrire un commentaire public..."
                            className="min-h-[88px] flex-1 resize-none rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black px-4 py-3 text-sm outline-none focus:border-black dark:focus:border-white"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <button
                            onClick={() => {
                              setActiveCommentPostId(null);
                              setCommentDraft("");
                            }}
                            className="text-xs font-bold text-neutral-500 hover:text-black dark:hover:text-white"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => submitComment(post.id)}
                            disabled={commentSubmitting || !commentDraft.trim()}
                            className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
                          >
                            Publier
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
