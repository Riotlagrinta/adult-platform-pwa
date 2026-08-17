"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";
import { toPublicUrl } from "@/lib/api";
import {
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
  ArrowLeft,
  Send,
  CheckCircle2,
} from "lucide-react";
import { ReelSkeleton } from "@/components/SkeletonLoader";

interface Media {
  id: string;
  kind: "IMAGE" | "VIDEO";
  url: string;
  mimeType: string;
}

interface Author {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  verificationStatus: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface PostLike {
  userId: string;
}

interface ReelPost {
  id: string;
  caption: string | null;
  createdAt: string;
  author: Author;
  media: Media[];
  likes: PostLike[];
  comments: Comment[];
}

export default function ReelsPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [reels, setReels] = useState<ReelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const fetchReels = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await apiRequest<{ posts: ReelPost[] }>("/posts/reels", { token });
      setReels(data.posts);
    } catch (err) {
      console.error("Erreur lors de la récupération des réels :", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void fetchReels();
    }
  }, [fetchReels, token]);

  // Observer pour lire/mettre en pause les vidéos lorsqu'elles glissent à l'écran
  useEffect(() => {
    if (reels.length === 0) return;

    const observerOptions = {
      root: null, // viewport entier
      rootMargin: "0px",
      threshold: 0.6, // la vidéo doit être visible à 60%
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const postId = entry.target.getAttribute("data-post-id");
        const video = videoRefs.current[postId || ""];
        if (!video) return;

        if (entry.isIntersecting) {
          video.play().catch((err) => console.log("Lecture automatique bloquée :", err));
        } else {
          video.pause();
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    reels.forEach((reel) => {
      const el = document.getElementById(`reel-card-${reel.id}`);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [reels]);

  const handleLike = async (post: ReelPost) => {
    if (!token || !user) return;

    const isLiked = post.likes.some((l) => l.userId === user.id);
    const method = isLiked ? "DELETE" : "POST";
    const endpoint = `/posts/${post.id}/like`;

    try {
      // Mise à jour optimiste locale
      setReels((prev) =>
        prev.map((r) => {
          if (r.id === post.id) {
            return {
              ...r,
              likes: isLiked
                ? r.likes.filter((l) => l.userId !== user.id)
                : [...r.likes, { userId: user.id }],
            };
          }
          return r;
        })
      );

      await apiRequest(endpoint, { method, token });
    } catch (err) {
      console.error("Erreur lors du like :", err);
      // Rollback en cas d'erreur
      fetchReels();
    }
  };

  const handleSendComment = async (postId: string) => {
    if (!token || !newCommentText.trim()) return;
    try {
      setSendingComment(true);
      const res = await apiRequest<{ comment: Comment }>(`/posts/${postId}/comments`, {
        method: "POST",
        token,
        body: JSON.stringify({ content: newCommentText }),
      });

      // Ajouter le commentaire localement
      setReels((prev) =>
        prev.map((r) => {
          if (r.id === postId) {
            return {
              ...r,
              comments: [...r.comments, {
                ...res.comment,
                author: {
                  id: user!.id,
                  displayName: user!.displayName,
                  avatarUrl: user!.avatarUrl ?? null,
                }
              }],
            };
          }
          return r;
        })
      );
      setNewCommentText("");
    } catch (err) {
      console.error("Erreur d'envoi du commentaire :", err);
    } finally {
      setSendingComment(false);
    }
  };

  const toggleMuteAll = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    Object.values(videoRefs.current).forEach((video) => {
      if (video) video.muted = newMutedState;
    });
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <p className="text-sm text-neutral-500 mb-4">Veuillez vous connecter pour voir les réels.</p>
        <button onClick={() => router.push("/")} className="px-5 py-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-bold text-xs">
          Se connecter
        </button>
      </div>
    );
  }

  if (loading) {
    return <ReelSkeleton />;
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-black text-white min-h-[80dvh] p-6 text-center">
        <p className="text-sm text-neutral-400 mb-2">Aucun réel vidéo disponible pour le moment.</p>
        <p className="text-xs text-neutral-600">Publiez une vidéo courte verticale pour créer le premier réel !</p>
      </div>
    );
  }

  const activeCommentsPost = reels.find((r) => r.id === activeCommentsPostId);

  return (
    <div className="relative h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] md:h-[100dvh] w-full bg-black overflow-hidden select-none">
      {/* Bouton retour optionnel sur ordinateur */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-50 p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-neutral-800 text-white hover:bg-neutral-900 transition flex items-center justify-center shadow-md"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Bouton global pour activer/désactiver le son */}
      <button
        onClick={toggleMuteAll}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-neutral-800 text-white hover:bg-neutral-900 transition flex items-center justify-center shadow-md"
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* Conteneur avec scroll-snap vertical */}
      <div className="w-full h-full overflow-y-auto scroll-snap-y-mandatory hide-scrollbar">
        {reels.map((reel) => {
          const videoMedia = reel.media.find((m) => m.kind === "VIDEO");
          const isLiked = reel.likes.some((l) => l.userId === user?.id);

          return (
            <div
              key={reel.id}
              id={`reel-card-${reel.id}`}
              data-post-id={reel.id}
              className="w-full h-full flex items-center justify-center bg-neutral-950 relative scroll-snap-align-start flex-shrink-0"
            >
              {videoMedia ? (
                <video
                  ref={(el) => {
                    videoRefs.current[reel.id] = el;
                  }}
                  src={toPublicUrl(videoMedia.url) ?? undefined}
                  className="w-full h-full object-cover max-w-md"
                  loop
                  playsInline
                  muted={isMuted}
                  onClick={toggleMuteAll}
                />
              ) : (
                <div className="text-xs text-neutral-500">Média indisponible</div>
              )}

              {/* Gradient de contraste en bas */}
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-10" />

              {/* Overlay gauche : Infos sur l'auteur et légende */}
              <div className="absolute bottom-6 left-4 right-20 z-20 text-white space-y-3 pointer-events-auto">
                <div
                  onClick={() => router.push(`/profile/${reel.author.id}`)}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                <div className="w-10 h-10 rounded-full border border-neutral-700 bg-neutral-800 text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                  {reel.author.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={toPublicUrl(reel.author.avatarUrl) ?? undefined} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{reel.author.displayName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 font-bold text-sm hover:underline">
                      <span>{reel.author.displayName}</span>
                      {reel.author.verificationStatus === "APPROVED" && (
                        <CheckCircle2 className="w-3.5 h-3.5 fill-white text-black" />
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400">Créateur validé</span>
                  </div>
                </div>

                {reel.caption && (
                  <p className="text-xs font-medium leading-relaxed max-w-sm line-clamp-3">
                    {reel.caption}
                  </p>
                )}
              </div>

              {/* Overlay droit : Actions (Like, Comment, etc.) */}
              <div className="absolute bottom-6 right-4 z-20 flex flex-col items-center gap-4 text-white">
                {/* Like */}
                <button
                  onClick={() => handleLike(reel)}
                  className="flex flex-col items-center gap-1 cursor-pointer focus:outline-none group"
                >
                  <div className="p-3 rounded-full bg-black/50 border border-neutral-800/50 backdrop-blur-md transition group-hover:scale-105">
                    <Heart className={`w-5 h-5 ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
                  </div>
                  <span className="text-[10px] font-bold shadow-sm">{reel.likes.length}</span>
                </button>

                {/* Commentaire */}
                <button
                  onClick={() => setActiveCommentsPostId(reel.id)}
                  className="flex flex-col items-center gap-1 cursor-pointer focus:outline-none group"
                >
                  <div className="p-3 rounded-full bg-black/50 border border-neutral-800/50 backdrop-blur-md transition group-hover:scale-105">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold shadow-sm">{reel.comments.length}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Tiroir des commentaires du bas */}
      {activeCommentsPostId && activeCommentsPost && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end transition-opacity duration-300">
          <div className="absolute inset-0" onClick={() => setActiveCommentsPostId(null)} />
          <div className="w-full max-h-[70%] bg-neutral-900 rounded-t-[32px] border-t border-neutral-800 p-5 flex flex-col z-10 shadow-2xl animate-[slideUp_0.3s_ease-out_forwards]">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4 flex-shrink-0">
              <span className="font-black text-sm text-white">Commentaires ({activeCommentsPost.comments.length})</span>
              <button
                onClick={() => setActiveCommentsPostId(null)}
                className="text-xs font-bold text-neutral-400 hover:text-white px-2 py-1"
              >
                Fermer
              </button>
            </div>

            {/* Liste des commentaires */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 min-h-0">
              {activeCommentsPost.comments.length === 0 ? (
                <p className="text-xs text-neutral-500 italic text-center py-8">Aucun commentaire. Soyez le premier !</p>
              ) : (
                activeCommentsPost.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 text-white flex items-center justify-center font-bold text-[10px] overflow-hidden flex-shrink-0">
                      {comment.author.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={toPublicUrl(comment.author.avatarUrl) ?? undefined} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{comment.author.displayName.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="bg-neutral-800/40 border border-neutral-800/20 rounded-2xl p-3 flex-1">
                      <span className="font-bold text-[11px] text-white block mb-0.5">{comment.author.displayName}</span>
                      <p className="text-xs text-neutral-300 leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input d'envoi de commentaire */}
            <div className="flex gap-2 items-center border-t border-neutral-800 pt-3 flex-shrink-0">
              <input
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="flex-1 rounded-2xl bg-neutral-800 border border-neutral-700 px-4 py-3 text-xs text-white outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendComment(activeCommentsPost.id);
                }}
              />
              <button
                disabled={sendingComment || !newCommentText.trim()}
                onClick={() => handleSendComment(activeCommentsPost.id)}
                className="p-3 bg-white text-black rounded-full font-bold text-xs disabled:opacity-40 transition flex items-center justify-center flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
