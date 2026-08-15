"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Send,
  Image as ImageIcon,
  Clock,
  Unlock,
  Lock,
  ChevronLeft,
  Info,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import AuthPanel from "@/components/AuthPanel";
import { apiRequest, toPublicUrl } from "@/lib/api";

type Conversation = {
  id: string;
  userAId: string;
  userBId: string;
  messages: Message[];
};

type Message = {
  id: string;
  senderId: string;
  text?: string | null;
  createdAt: string;
  media?: {
    id: string;
    url: string;
    kind: "IMAGE" | "VIDEO";
    mimeType: string;
    durationSeconds?: number | null;
    allowDownload: boolean;
    expiresAt?: string | null;
  }[];
};

type UserLookup = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  profile?: {
    city?: string | null;
    country?: string | null;
    headline?: string | null;
  } | null;
};

export default function MessagesPage() {
  const { token, user, ready, socket } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usersById, setUsersById] = useState<Record<string, UserLookup>>({});
  const [inputText, setInputText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [allowDownload, setAllowDownload] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [ephemeralMode, setEphemeralMode] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserLookup[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Nouveaux états pour le temps réel et les médias temporaires
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [typingTimeoutRef, setTypingTimeoutRef] = useState<NodeJS.Timeout | null>(null);
  const [viewingMedia, setViewingMedia] = useState<{
    id: string;
    url: string;
    kind: "IMAGE" | "VIDEO";
    durationSeconds?: number | null;
    expiresAt?: string | null;
    openedAt?: string | null;
    allowDownload: boolean;
  } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Gestion de la réception temps réel des messages et écriture
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { message: Message; conversationId: string }) => {
      setConversations((prevConvs) => {
        return prevConvs.map((conv) => {
          if (conv.id === data.conversationId) {
            const alreadyExists = conv.messages.some((msg) => msg.id === data.message.id);
            const updatedMessages = alreadyExists
              ? conv.messages
              : [data.message, ...conv.messages];
            return {
              ...conv,
              messages: updatedMessages,
            };
          }
          return conv;
        });
      });
    };

    const handleTypingUpdate = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (selectedConvId === data.conversationId) {
        setIsPartnerTyping(data.isTyping);
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:update", handleTypingUpdate);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:update", handleTypingUpdate);
    };
  }, [socket, selectedConvId]);

  // Gestion du compte à rebours de la modale sécurisée
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setViewingMedia(null);
      setCountdown(null);
      loadConversations();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const openSecureMedia = async (media: any) => {
    if (!token) return;

    if (media.expiresAt && new Date(media.expiresAt) < new Date()) {
      alert("Ce média a déjà expiré et a été supprimé.");
      return;
    }

    try {
      const payload = await apiRequest<{ success: boolean; media: any }>(`/messages/media/${media.id}/open`, {
        method: "POST",
        token,
      });

      const updatedMedia = payload.media;
      setViewingMedia(updatedMedia);

      if (updatedMedia.durationSeconds) {
        setCountdown(updatedMedia.durationSeconds);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'ouverture du média");
    }
  };

  const triggerBlock = async (blockedId: string) => {
    if (!token || !confirm("Voulez-vous vraiment bloquer cet utilisateur ?")) return;

    try {
      await apiRequest("/blocks", {
        method: "POST",
        token,
        body: JSON.stringify({ blockedId }),
      });
      alert("Utilisateur bloqué.");
      setSelectedConvId(null);
      await loadConversations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors du blocage");
    }
  };

  const triggerReport = async (userId: string) => {
    const reason = prompt("Indiquez la raison de votre signalement :");
    if (!reason?.trim() || !token) return;

    try {
      await apiRequest("/reports", {
        method: "POST",
        token,
        body: JSON.stringify({ reason, targetUserId: userId }),
      });
      alert("Signalement enregistré.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors du signalement");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!socket || !selectedConversation || !activePartner) return;

    socket.emit("typing:start", {
      conversationId: selectedConversation.id,
      recipientId: activePartner.id,
    });

    if (typingTimeoutRef) {
      clearTimeout(typingTimeoutRef);
    }

    const timeout = setTimeout(() => {
      socket.emit("typing:stop", {
        conversationId: selectedConversation.id,
        recipientId: activePartner.id,
      });
    }, 3000);

    setTypingTimeoutRef(timeout);
  };

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConvId) ?? null;
  const activeMessages = selectedConversation?.messages ?? [];

  const loadConversations = async (preferredPartnerId?: string) => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = await apiRequest<{ conversations: Conversation[] }>("/messages/conversations", { token });
      setConversations(payload.conversations);

      const partnerIds = Array.from(
        new Set(
          payload.conversations.map((conversation) =>
            conversation.userAId === user?.id ? conversation.userBId : conversation.userAId,
          ),
        ),
      );

      const entries = await Promise.all(
        partnerIds.map(async (partnerId) => {
          const response = await apiRequest<{ user: UserLookup }>(`/users/${partnerId}`, { token });
          return [partnerId, response.user] as const;
        }),
      );

      setUsersById(Object.fromEntries(entries));
      if (preferredPartnerId) {
        const matchedConversation = payload.conversations.find(
          (conversation) =>
            (conversation.userAId === user?.id && conversation.userBId === preferredPartnerId) ||
            (conversation.userBId === user?.id && conversation.userAId === preferredPartnerId),
        );
        setSelectedConvId(matchedConversation?.id ?? payload.conversations[0]?.id ?? null);
      } else if (!selectedConvId && payload.conversations.length > 0) {
        setSelectedConvId(payload.conversations[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les conversations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadConversations();
    }
  }, [token]);

  useEffect(() => {
    if (!token || !showNewConversation) {
      return;
    }

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const handle = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);

      try {
        const payload = await apiRequest<{ users: UserLookup[] }>(
          `/users/search?q=${encodeURIComponent(query)}`,
          { token },
        );
        setSearchResults(payload.users.filter((candidate) => candidate.id !== user?.id));
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : "Recherche indisponible");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchQuery, showNewConversation, token, user?.id]);

  const activePartner = useMemo(() => {
    if (!selectedConversation || !user) {
      return null;
    }

    const partnerId = selectedConversation.userAId === user.id ? selectedConversation.userBId : selectedConversation.userAId;
    return usersById[partnerId] ?? null;
  }, [selectedConversation, user, usersById]);

  const openConversation = async (partnerId: string) => {
    if (!token) {
      return;
    }

    await apiRequest(`/messages/conversations/${partnerId}`, {
      method: "POST",
      token,
    });
    await loadConversations(partnerId);
    setShowNewConversation(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const sendMessage = async () => {
    if (!token || !selectedConversation) {
      return;
    }

    if (!inputText.trim() && !mediaFile) {
      return;
    }

    let mediaPayload:
      | {
          kind: "IMAGE" | "VIDEO";
          url: string;
          mimeType: string;
          durationSeconds?: number;
          allowDownload: boolean;
          expiresAt?: string;
        }
      | undefined;

    if (mediaFile) {
      const formData = new FormData();
      formData.append("file", mediaFile);
      const upload = await apiRequest<{ file: { url: string; mimeType: string } }>("/files/media", {
        method: "POST",
        token,
        body: formData,
      });

      mediaPayload = {
        kind: mediaFile.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        url: upload.file.url,
        mimeType: upload.file.mimeType,
        durationSeconds: ephemeralMode ? durationSeconds : undefined,
        allowDownload,
        expiresAt: ephemeralMode ? new Date(Date.now() + durationSeconds * 1000).toISOString() : undefined,
      };
    }

    await apiRequest(`/messages/conversations/${selectedConversation.id}/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({
        text: inputText.trim() || undefined,
        media: mediaPayload,
      }),
    });

    // Signaler typing:stop lors de l'envoi
    if (socket && activePartner) {
      socket.emit("typing:stop", {
        conversationId: selectedConversation.id,
        recipientId: activePartner.id,
      });
    }

    setInputText("");
    setMediaFile(null);
    setEphemeralMode(false);
    await loadConversations();
  };

  if (!ready) {
    return <div className="p-6 text-sm text-neutral-500">Chargement...</div>;
  }

  if (!token) {
    return (
      <div className="p-4 md:p-6">
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--app-background)] overflow-hidden relative p-3 md:p-4 gap-3 md:gap-4">
      <div className={`w-full md:w-80 flex-shrink-0 border border-[var(--app-border)] rounded-[28px] overflow-hidden bg-[var(--app-surface)] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.08)] ${selectedConvId ? "hidden md:flex" : ""}`}>
        <div className="p-4 border-b border-[var(--app-border)] flex items-start justify-between gap-3 bg-[var(--app-surface-raised)]">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Messagerie</div>
            <h2 className="font-black text-xl tracking-tight">Conversations</h2>
          </div>
          <button
            onClick={() => setShowNewConversation((value) => !value)}
            className="text-xs font-bold px-3 py-2 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)]"
          >
            Nouveau
          </button>
        </div>

        {showNewConversation && (
          <div className="p-4 border-b border-[var(--app-border)] space-y-3 bg-[var(--app-surface-raised)]">
            <div className="flex items-center gap-2">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher un profil à contacter"
                className="flex-1 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm outline-none focus:border-[var(--app-foreground)]"
              />
              <button
                onClick={() => setShowNewConversation(false)}
                className="text-xs font-bold text-neutral-500 hover:text-black dark:hover:text-white"
              >
                Fermer
              </button>
            </div>
            <p className="text-xs text-neutral-500">Tape au moins 2 caractères pour trouver un utilisateur vérifié.</p>
            {searchLoading && <div className="text-xs text-neutral-500">Recherche...</div>}
            {searchError && <div className="text-xs text-red-500">{searchError}</div>}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => openConversation(result.id)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-left hover:border-[var(--app-foreground)] transition"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {result.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate">{result.displayName}</div>
                    <div className="text-xs text-neutral-500 truncate">
                      {result.profile?.headline ?? result.bio ?? "Profil vérifié"}
                    </div>
                  </div>
                </button>
              ))}
              {searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && !searchError && (
                <div className="text-xs text-neutral-500">Aucun profil trouvé.</div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--app-border)]">
          {loading && <div className="p-4 text-sm text-neutral-500">Chargement...</div>}
          {error && <div className="p-4 text-sm text-red-500">{error}</div>}
          {conversations.map((conversation) => {
            const partnerId = conversation.userAId === user?.id ? conversation.userBId : conversation.userAId;
            const partner = usersById[partnerId];
            const lastMessage = conversation.messages[0];
            return (
              <div
                key={conversation.id}
                onClick={() => setSelectedConvId(conversation.id)}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-[var(--app-surface-soft)] transition ${selectedConvId === conversation.id ? "bg-[var(--app-surface-raised)]" : ""}`}
              >
                <div className="w-12 h-12 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm">
                  {(partner?.displayName ?? "??").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold truncate text-sm">{partner?.displayName ?? partnerId}</span>
                    <span className="text-xs text-neutral-400">
                      {lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <p className="text-xs truncate text-neutral-500">
                    {lastMessage?.text ?? (lastMessage?.media?.length ? "Média envoyé" : "Conversation ouverte")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`flex-1 flex flex-col h-full bg-[var(--app-background)] rounded-[28px] border border-[var(--app-border)] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)] ${!selectedConvId ? "hidden md:flex justify-center items-center text-neutral-500" : ""}`}>
        {selectedConversation && activePartner ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-[var(--app-border)] bg-[var(--app-surface)]">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedConvId(null)} className="md:hidden p-1 rounded-full hover:bg-[var(--app-surface-soft)]">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm">
                  {activePartner.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-1.5">
                    <span>{activePartner.displayName}</span>
                    {isPartnerTyping && (
                      <span className="text-[10px] text-green-500 font-medium animate-pulse">(écrit...)</span>
                    )}
                  </h4>
                  <span className="text-xs text-neutral-500">Discussion privée</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerBlock(activePartner.id)}
                  className="px-3 py-1.5 border border-red-200 dark:border-red-900/40 text-[10px] font-bold rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                >
                  Bloquer
                </button>
                <button
                  onClick={() => triggerReport(activePartner.id)}
                  className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-900 text-[10px] font-bold rounded-full hover:opacity-80 transition"
                >
                  Signaler
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[linear-gradient(to_bottom,var(--app-surface),var(--app-background))]">
              {selectedConversation.messages.slice().reverse().map((message) => {
                const isMe = message.senderId === user?.id;
                const media = message.media?.[0];
                return (
                  <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${isMe ? "bg-[var(--app-foreground)] text-[var(--app-background)]" : "bg-[var(--app-surface)] text-[var(--app-foreground)]"}`}>
                      {message.text && <p>{message.text}</p>}
                      {media && (
                        <div className="space-y-2 select-none">
                          <div className="flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--app-foreground)_15%,transparent)] pb-2 mb-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-bold text-xs">
                              Média {media.kind === "VIDEO" ? "vidéo" : "image"} éphémère
                            </span>
                          </div>
                          
                          {/* Affichage conditionnel selon expiration */}
                          {media.expiresAt && new Date(media.expiresAt) < new Date() ? (
                            <span className="text-neutral-500 text-xs italic">Média expiré et autodétruit</span>
                          ) : (
                            <button
                              onClick={() => openSecureMedia(media)}
                              className="px-4 py-2 bg-[var(--app-surface-soft)] hover:opacity-85 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                            >
                              <span>👁️ Révéler le média</span>
                              {media.durationSeconds && (
                                <span className="text-[10px] opacity-70">({media.durationSeconds}s)</span>
                              )}
                            </button>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                            <span>{media.allowDownload ? "Enregistrement autorisé" : "Enregistrement interdit"}</span>
                          </div>
                        </div>
                      )}
                      <div className="text-[10px] text-right mt-1.5 opacity-60">
                        {new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {ephemeralMode && (
              <div className="bg-[var(--app-surface-raised)] border-t border-[var(--app-border)] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                  <Clock className="h-4 w-4 text-[var(--app-foreground)]" />
                  <span className="font-bold">Mode média temporaire</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span>Durée :</span>
                    <select value={durationSeconds} onChange={(e) => setDurationSeconds(Number(e.target.value))} className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded px-1.5 py-0.5 text-xs font-bold">
                      <option value="5">5s</option>
                      <option value="10">10s</option>
                      <option value="15">15s</option>
                      <option value="30">30s</option>
                    </select>
                  </div>
                  <button onClick={() => setAllowDownload(!allowDownload)} className="flex items-center gap-1.5 font-bold hover:underline">
                    {allowDownload ? (
                      <>
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Enregistrable</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-red-500">Privé</span>
                      </>
                    )}
                  </button>
                  <button onClick={() => setEphemeralMode(false)} className="text-neutral-500 hover:text-red-500 font-bold">
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-[var(--app-border)] bg-[var(--app-surface)]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEphemeralMode(!ephemeralMode)}
                  className={`p-2 rounded-full transition ${ephemeralMode ? "bg-[var(--app-foreground)] text-[var(--app-background)]" : "text-neutral-500 hover:bg-[var(--app-surface-soft)]"}`}
                  title="Média temporaire"
                >
                  <Clock className="h-5 w-5" />
                </button>

                <label className="p-2 text-neutral-500 hover:bg-[var(--app-surface-soft)] rounded-full transition cursor-pointer">
                  <ImageIcon className="h-5 w-5" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)}
                  />
                </label>

                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={ephemeralMode ? "Ajouter une description..." : "Écrire un message privé..."}
                  className="flex-1 px-4 py-2 bg-[var(--app-surface-raised)] rounded-full text-sm outline-none border border-transparent focus:border-[var(--app-border)]"
                />

                <button onClick={sendMessage} className="p-2.5 bg-[var(--app-foreground)] text-[var(--app-background)] rounded-full hover:opacity-80 transition flex-shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-500 max-w-sm">
            <Info className="h-8 w-8 mb-2" />
            <h4 className="font-bold text-base mb-1">Sélectionnez une discussion</h4>
            <p className="text-xs text-neutral-400">
              Choisis un contact pour commencer à échanger ou envoyer un média temporaire.
            </p>
          </div>
        )}
      </div>

      {/* Modale de visionnage sécurisé de média temporaire */}
      {viewingMedia && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 select-none"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          {countdown !== null && (
            <div className="absolute top-6 right-6 bg-white/10 text-white rounded-full px-4 py-2 text-xs font-black flex items-center gap-2 border border-white/20">
              <Clock className="w-4 h-4 animate-pulse text-red-500" />
              <span>Ce média s'autodétruit dans {countdown}s</span>
            </div>
          )}

          <div className="max-w-4xl max-h-[80vh] w-full flex items-center justify-center relative overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl border border-white/10">
            {viewingMedia.kind === "VIDEO" ? (
              <video
                autoPlay
                controls={viewingMedia.allowDownload}
                controlsList={viewingMedia.allowDownload ? undefined : "nodownload noremoteplayback"}
                disablePictureInPicture={!viewingMedia.allowDownload}
                className="max-w-full max-h-[80vh] object-contain"
                src={toPublicUrl(viewingMedia.url) ?? undefined}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Média éphémère sécurisé"
                src={toPublicUrl(viewingMedia.url) ?? undefined}
                className="max-w-full max-h-[80vh] object-contain pointer-events-none select-none"
              />
            )}

            {/* Filigrane dynamique */}
            <div className="absolute inset-0 pointer-events-none flex flex-wrap gap-12 p-8 justify-center items-center opacity-[0.06] select-none text-white font-black uppercase text-xs tracking-widest rotate-12">
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={i}>{user?.displayName} • OnlyAdults</span>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setViewingMedia(null);
              setCountdown(null);
              loadConversations();
            }}
            className="mt-6 px-6 py-2.5 bg-[var(--app-surface)] text-[var(--app-foreground)] font-black rounded-full text-xs hover:bg-[var(--app-surface-soft)] transition"
          >
            Fermer la visionneuse
          </button>
        </div>
      )}
    </div>
  );
}
