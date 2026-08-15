"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Image as ImageIcon,
  Edit3,
  Users,
  Heart,
  Eye,
  Settings,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AuthPanel from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest, toPublicUrl } from "@/lib/api";

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
  const [city, setCity] = useState("");
  const [headline, setHeadline] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Nouveaux états pour la gestion des relations
  const [followers, setFollowers] = useState<{ id: string; displayName: string; avatarUrl?: string | null }[]>([]);
  const [following, setFollowing] = useState<{ id: string; displayName: string; avatarUrl?: string | null }[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "social">("posts");

  const loadProfile = async () => {
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
  };

  useEffect(() => {
    if (token) loadProfile();
  }, [token]);

  const saveProfile = async () => {
    if (!token) return;

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
  };

  const copyInviteLink = () => {
    if (!me) return;
    const url = `${window.location.origin}/profile/${me.id}`;
    navigator.clipboard.writeText(url);
    alert("Votre lien d'invitation de contact direct a été copié !");
  };

  if (!ready) return <div className="p-6 text-sm text-neutral-500">Chargement...</div>;

  if (!token) {
    return (
      <div className="p-4 md:p-6">
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-background)] min-h-screen pb-12">
      <div className="w-full h-48 md:h-64 bg-gradient-to-r from-[var(--app-surface-soft)] via-[var(--app-surface-raised)] to-[var(--app-surface)] relative" />

      <div className="px-4 md:px-6 -mt-16 md:-mt-20 relative space-y-4">
        <div className="rounded-[32px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-4 md:p-6 space-y-5">
          <div className="flex items-end justify-between">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-3xl md:text-5xl border-4 border-[var(--app-background)] shadow-lg overflow-hidden">
            {me?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="avatar" src={toPublicUrl(me.avatarUrl) ?? undefined} className="w-full h-full object-cover" />
            ) : (
              <span>{me?.displayName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

            <div className="flex gap-2">
              <button
                onClick={copyInviteLink}
                className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-full font-bold text-xs hover:opacity-85 transition shadow-sm flex items-center"
              >
                <Share2 className="w-3.5 h-3.5 mr-2" />
                Inviter
              </button>
              <button
                onClick={saveProfile}
                className="px-4 py-2 border border-[var(--app-border)] rounded-full font-bold text-xs hover:bg-[var(--app-surface-soft)] transition flex items-center"
              >
                <Edit3 className="w-3.5 h-3.5 mr-2" />
                Enregistrer
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

        <label className="inline-flex items-center gap-2 text-sm font-bold cursor-pointer">
          <ImageIcon className="w-4 h-4" />
          <span>Changer l'avatar</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
        </label>

        <div className="flex items-center gap-6 text-sm py-1 border-y border-[var(--app-border)]">
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
