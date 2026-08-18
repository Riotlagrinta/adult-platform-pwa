"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Image as ImageIcon,
  Camera,
  Edit3,
  Share2,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthPanel from "@/components/AuthPanel";
import { ProfileSkeleton, GlobalPulseLoader } from "@/components/SkeletonLoader";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest, toPublicUrl } from "@/lib/api";
import { useIsStandalone } from "@/lib/use-standalone";

type MyUser = {
  id: string;
  email: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  verificationStatus: string;
  profile?: { city?: string | null; country?: string | null; headline?: string | null } | null;
};

type Post = {
  id: string;
  caption?: string | null;
  authorId: string;
  media: { id: string; url: string; kind: "IMAGE" | "VIDEO"; mimeType: string }[];
  likes: { id: string }[];
  comments: { id: string }[];
};

export default function ProfilePage() {
  const router = useRouter();
  const { token, ready, refreshUser } = useAuth();
  const [me, setMe] = useState<MyUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const isStandalone = useIsStandalone();
  const [city, setCity] = useState("");
  const [headline, setHeadline] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Nouveaux états pour la gestion des relations
  const [followers, setFollowers] = useState<{ id: string; displayName: string; avatarUrl?: string | null }[]>([]);
  const [following, setFollowing] = useState<{ id: string; displayName: string; avatarUrl?: string | null }[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "social">("posts");

  const loadProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const mePayload = await apiRequest<{ user: MyUser }>("/auth/me", { token });
      const postsPayload = await apiRequest<{ posts: Post[] }>(`/posts?authorId=${mePayload.user.id}`, { token });
      const followersPayload = await apiRequest<{ followers: any[] }>("/social/followers", { token });
      const followingPayload = await apiRequest<{ following: any[] }>("/social/following", { token });
      
      setMe(mePayload.user);
      setPosts(postsPayload.posts);
      setDisplayName(mePayload.user.displayName);
      setBio(mePayload.user.bio ?? "");
      setCity(mePayload.user.profile?.city ?? "");
      setHeadline(mePayload.user.profile?.headline ?? "");
      setFollowers(followersPayload.followers);
      setFollowing(followingPayload.following);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadProfile();
    }
  }, [loadProfile, token]);

  const saveProfile = async () => {
    if (!token) return;
    setLoading(true);
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
      await loadProfile();
      setAvatarFile(null);
      alert("Votre profil a été mis à jour avec succès !");
    } catch (err) {
      console.error("Erreur d'enregistrement du profil:", err);
      alert(err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (!me) return;
    const url = `${window.location.origin}/profile/${me.id}`;
    navigator.clipboard.writeText(url);
    alert("Votre lien d'invitation de contact direct a été copié !");
  };

  if (!ready) return <GlobalPulseLoader message="Chargement de votre profil sécurisé..." />;

  if (!token) {
    return (
      <div className="p-4 md:p-6">
        <AuthPanel />
      </div>
    );
  }

  if (loading && !me) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="bg-[var(--app-background)] min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="w-full h-48 md:h-64 bg-gradient-to-r from-[var(--app-surface-soft)] via-[var(--app-surface-raised)] to-[var(--app-surface)] relative" />

      <div className="px-4 md:px-6 -mt-16 md:-mt-20 relative space-y-4">
        <div className="rounded-[32px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-4 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            {/* Avatar interactif avec déclencheur de photo de profil */}
            <label className="relative w-28 h-28 md:w-36 md:h-36 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-3xl md:text-5xl border-4 border-[var(--app-background)] shadow-lg overflow-hidden cursor-pointer group flex-shrink-0">
              {avatarFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="aperçu" src={URL.createObjectURL(avatarFile)} className="w-full h-full object-cover" />
              ) : me?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="photo de profil" src={toPublicUrl(me.avatarUrl) ?? undefined} className="w-full h-full object-cover" />
              ) : (
                <span>{me?.displayName.slice(0, 2).toUpperCase()}</span>
              )}
              {/* Badge caméra au survol */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-7 h-7" />
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <button
                onClick={copyInviteLink}
                className="px-4 py-2 bg-[var(--app-surface-raised)] border border-[var(--app-border)] rounded-full font-bold text-xs hover:bg-[var(--app-surface-soft)] transition shadow-sm flex items-center justify-center"
              >
                <Share2 className="w-3.5 h-3.5 mr-2" />
                Inviter
              </button>
              {!isStandalone && (
                <Link
                  href="/download"
                  className="px-4 py-2 bg-[var(--app-surface-raised)] border border-[var(--app-border)] rounded-full font-bold text-xs hover:bg-[var(--app-surface-soft)] transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--app-accent)]" />
                  <span>APK</span>
                </Link>
              )}
              <button
                onClick={saveProfile}
                disabled={loading}
                className="px-5 py-2.5 bg-[var(--app-foreground)] text-[var(--app-background)] rounded-full font-black text-xs hover:opacity-90 transition shadow-sm flex items-center justify-center disabled:opacity-50"
              >
                <Edit3 className="w-3.5 h-3.5 mr-2" />
                {loading ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xl md:text-2xl font-black">
            <span>{me?.displayName ?? "Profil"}</span>
            {me?.verificationStatus === "APPROVED" && (
              <CheckCircle2 className="h-5 w-5 fill-[var(--app-foreground)] text-[var(--app-background)] dark:fill-[var(--app-background)] dark:text-[var(--app-foreground)]" />
            )}
          </div>
          <div className="text-sm text-neutral-500">{me?.email}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-4 py-3 text-sm outline-none" placeholder="Nom affiché" />
          <input value={city} onChange={(e) => setCity(e.target.value)} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-4 py-3 text-sm outline-none" placeholder="Ville" />
        </div>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full max-w-3xl rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-4 py-3 text-sm outline-none min-h-28" placeholder="Bio" />
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} className="w-full max-w-3xl rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-4 py-3 text-sm outline-none" placeholder="Titre du profil" />

        {/* Bouton Changer la photo de profil */}
        <div className="pt-1">
          <label className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-soft)] text-xs font-bold cursor-pointer transition shadow-sm">
            <Camera className="w-4 h-4 text-[var(--app-foreground)]" />
            <span>{avatarFile ? `Photo choisie : ${avatarFile.name}` : "Changer la photo de profil"}</span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm py-1 border-y border-[var(--app-border)]">
          <button onClick={() => setActiveTab("posts")} className={`flex items-center gap-1.5 transition ${activeTab === "posts" ? "font-black text-[var(--app-foreground)]" : "text-neutral-500"}`}>
            <span className="font-black">{posts.length}</span>
            <span>Publications</span>
          </button>
          <button onClick={() => setActiveTab("social")} className={`flex items-center gap-1.5 transition ${activeTab === "social" ? "font-black text-[var(--app-foreground)]" : "text-neutral-500"}`}>
            <span className="font-black">{followers.length}</span>
            <span>Abonnés</span>
          </button>
          <button onClick={() => setActiveTab("social")} className={`flex items-center gap-1.5 transition ${activeTab === "social" ? "font-black text-[var(--app-foreground)]" : "text-neutral-500"}`}>
            <span className="font-black">{following.length}</span>
            <span>Suivis</span>
          </button>
        </div>

        {loading && <div className="text-sm text-neutral-500">Chargement des données...</div>}

        {activeTab === "social" ? (
          <div className="space-y-6 pt-4 max-w-3xl">
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">Abonnés ({followers.length})</h4>
              {followers.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">Aucun abonné pour le moment.</p>
              ) : (
                <div className="space-y-2">
                  {followers.map((f) => (
                    <div key={f.id} onClick={() => router.push(`/profile/${f.id}`)} className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--app-border)] hover:border-[var(--app-foreground)] cursor-pointer bg-[var(--app-surface-raised)] transition">
                      <div className="w-10 h-10 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {f.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-xs">{f.displayName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">Comptes suivis ({following.length})</h4>
              {following.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">Vous ne suivez aucun compte pour le moment.</p>
              ) : (
                <div className="space-y-2">
                  {following.map((f) => (
                    <div key={f.id} onClick={() => router.push(`/profile/${f.id}`)} className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--app-border)] hover:border-[var(--app-foreground)] cursor-pointer bg-[var(--app-surface-raised)] transition">
                      <div className="w-10 h-10 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {f.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-xs">{f.displayName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">Mes publications</div>
            {posts.length === 0 ? (
              <div className="text-sm text-neutral-500">Aucune publication pour l'instant.</div>
            ) : (
              posts.map((post) => (
                <article key={post.id} className="border border-[var(--app-border)] rounded-2xl p-4 space-y-3 bg-[var(--app-surface)]">
                  {post.caption && <p className="text-sm">{post.caption}</p>}
                  {post.media[0] && (
                    <div className="aspect-video rounded-xl overflow-hidden bg-[var(--app-surface-soft)]">
                      {post.media[0].kind === "VIDEO" ? (
                        <video controls className="h-full w-full object-cover" src={toPublicUrl(post.media[0].url) ?? undefined} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="media" src={toPublicUrl(post.media[0].url) ?? undefined} className="h-full w-full object-cover" />
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span>{post.likes.length} j'aime</span>
                    <span>{post.comments.length} commentaires</span>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
