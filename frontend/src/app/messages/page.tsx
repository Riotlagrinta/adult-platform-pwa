"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Image as ImageIcon,
  Clock,
  Unlock,
  Lock,
  ChevronLeft,
  Info,
  X,
  Loader2,
  Maximize2,
  AlertCircle,
  Smile,
} from "lucide-react";
import { ConversationListSkeleton, GlobalPulseLoader } from "@/components/SkeletonLoader";
import { useAuth } from "@/components/AuthProvider";
import AuthPanel from "@/components/AuthPanel";
import { apiRequest, toPublicUrl } from "@/lib/api";
import { parseSticker, encodeSticker, Sticker } from "@/lib/stickers";
import StickerPicker from "@/components/StickerPicker";

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
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [allowDownload, setAllowDownload] = useState(true);
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [ephemeralMode, setEphemeralMode] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserLookup[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const selectedConvIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Nouveaux états pour le temps réel et les médias
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [typingTimeoutRef, setTypingTimeoutRef] = useState<NodeJS.Timeout | null>(null);
  
  // Visionneuse sécurisée pour médias temporaires éphémères
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

  // Lightbox HD pour photos et vidéos normales
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    kind: "IMAGE" | "VIDEO";
  } | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  // Défilement automatique vers le bas à l'ouverture d'une conversation
  useEffect(() => {
    if (selectedConvId) {
      setTimeout(() => scrollToBottom(false), 50);
      setTimeout(() => scrollToBottom(true), 250);
    }
  }, [selectedConvId, scrollToBottom]);

  // Génération de preview locale quand un fichier est choisi
  useEffect(() => {
    if (!mediaFile) {
      setMediaPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(mediaFile);
    setMediaPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [mediaFile]);

  const loadConversations = useCallback(async (preferredPartnerId?: string) => {
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
      } else if (!selectedConvIdRef.current && payload.conversations.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
        // Sélection automatique uniquement sur Desktop / Grands écrans
        setSelectedConvId(payload.conversations[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les conversations");
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

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
      // Scroll en douceur dès qu'un nouveau message arrive
      if (selectedConvIdRef.current === data.conversationId) {
        setTimeout(() => scrollToBottom(true), 100);
      }
    };

    const handleTypingUpdate = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (selectedConvId === data.conversationId) {
        setIsPartnerTyping(data.isTyping);
      }
    };

    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      setConversations((prevConvs) => {
        return prevConvs.map((conv) => {
          if (conv.id === data.conversationId) {
            return {
              ...conv,
              messages: conv.messages.filter((msg) => msg.id !== data.messageId),
            };
          }
          return conv;
        });
      });
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("message:deleted", handleMessageDeleted);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("message:deleted", handleMessageDeleted);
    };
  }, [socket, selectedConvId, scrollToBottom]);

  // Gestion du compte à rebours de la modale sécurisée pour médias éphémères
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setViewingMedia(null);
      setCountdown(null);
      void loadConversations();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, loadConversations]);

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

  useEffect(() => {
    if (token) {
      void loadConversations();
    }
  }, [loadConversations, token]);

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
    if (!token || !selectedConversation || isSending) {
      return;
    }

    if (!inputText.trim() && !mediaFile) {
      return;
    }

    setIsSending(true);
    setSendError(null);
    setShowStickerPicker(false);

    try {
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
          allowDownload: ephemeralMode ? allowDownload : true,
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
      setTimeout(() => scrollToBottom(true), 150);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erreur lors de l'envoi du message");
    } finally {
      setIsSending(false);
    }
  };

  // Envoi direct et instantané d'un Sticker WhatsApp
  const handleSendSticker = async (sticker: Sticker) => {
    if (!token || !selectedConversation || isSending) return;

    setIsSending(true);
    setShowStickerPicker(false);

    try {
      await apiRequest(`/messages/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        token,
        body: JSON.stringify({
          text: encodeSticker(sticker),
        }),
      });

      await loadConversations();
      setTimeout(() => scrollToBottom(true), 100);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erreur lors de l'envoi du sticker");
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!token || !selectedConvId || !confirm("Voulez-vous vraiment supprimer ce message ?")) return;

    try {
      await apiRequest(`/messages/conversations/${selectedConvId}/messages/${messageId}`, {
        method: "DELETE",
        token,
      });

      setConversations((prevConvs) => {
        return prevConvs.map((conv) => {
          if (conv.id === selectedConvId) {
            return {
              ...conv,
              messages: conv.messages.filter((msg) => msg.id !== messageId),
            };
          }
          return conv;
        });
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression du message");
    }
  };

  if (!ready) {
    return <GlobalPulseLoader message="Connexion à la messagerie privée..." />;
  }

  if (!token) {
    return (
      <div className="p-4 md:p-6">
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-h-0 bg-[var(--app-background)] overflow-hidden relative divide-x divide-[var(--app-border)]">
      {/* Colonne de Gauche : Liste des Conversations */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 min-h-0 bg-[var(--app-surface)] flex flex-col ${selectedConvId ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-[var(--app-border)] flex items-start justify-between gap-3 bg-[var(--app-surface-raised)]">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">Messagerie</div>
            <h2 className="font-black text-xl tracking-tight">Conversations</h2>
          </div>
          <button
            onClick={() => setShowNewConversation((value) => !value)}
            className="text-xs font-bold px-3 py-2 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] hover:opacity-85 transition"
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
          {loading && <ConversationListSkeleton />}
          {error && <div className="p-4 text-sm text-red-500">{error}</div>}
          {!loading && conversations.length === 0 && (
            <div className="p-8 text-center text-neutral-500 space-y-2">
              <Info className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs font-bold">Aucune discussion pour l'instant.</p>
              <p className="text-[11px] text-neutral-400">Cliquez sur « Nouveau » pour commencer une conversation.</p>
            </div>
          )}
          {conversations.map((conversation) => {
            const partnerId = conversation.userAId === user?.id ? conversation.userBId : conversation.userAId;
            const partner = usersById[partnerId];
            const lastMessage = conversation.messages[0];
            const sticker = parseSticker(lastMessage?.text);
            return (
              <div
                key={conversation.id}
                onClick={() => setSelectedConvId(conversation.id)}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-[var(--app-surface-soft)] transition ${selectedConvId === conversation.id ? "bg-[var(--app-surface-raised)]" : ""}`}
              >
                <div className="w-12 h-12 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm flex-shrink-0">
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
                    {sticker
                      ? `${sticker.emoji} Sticker ${sticker.name}`
                      : (lastMessage?.text ?? (lastMessage?.media?.length ? "📷 Photo envoyée" : "Conversation ouverte"))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Colonne de Droite : Fil de Discussion Actif */}
      <div className={`flex-1 flex flex-col min-h-0 h-full bg-[var(--app-background)] overflow-hidden ${!selectedConvId ? "hidden md:flex justify-center items-center text-neutral-500" : "flex"}`}>
        {selectedConversation && activePartner ? (
          <>
            {/* Header de Discussion */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 md:p-4 border-b border-[var(--app-border)] bg-[var(--app-surface)] flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-[var(--app-surface-soft)] transition"
                  title="Retour aux conversations"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="w-10 h-10 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {activePartner.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-1.5">
                    <span>{activePartner.displayName}</span>
                    {isPartnerTyping && (
                      <span className="text-[10px] text-green-500 font-medium animate-pulse">(écrit...)</span>
                    )}
                  </h4>
                  <span className="text-[11px] text-neutral-500">Discussion chiffrée</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap justify-end">
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

            {/* Corps des Messages avec Défilement Fluide */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-[linear-gradient(to_bottom,var(--app-surface),var(--app-background))]"
            >
              {selectedConversation.messages.length === 0 && (
                <div className="text-center py-12 text-neutral-500 text-xs">
                  Aucun message échangé. Dites bonjour ! 👋
                </div>
              )}
              {selectedConversation.messages.slice().reverse().map((message) => {
                const isMe = message.senderId === user?.id;
                const media = message.media?.[0];
                const isEphemeral = Boolean(media?.durationSeconds || media?.expiresAt);
                const sticker = parseSticker(message.text);

                // Rendu spécial WhatsApp Sticker (sans bulle de fond épaisse)
                if (sticker) {
                  return (
                    <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fadeIn`}>
                      <div className="flex flex-col items-center select-none group">
                        <span className="text-6xl sm:text-7xl filter drop-shadow-lg transform transition-transform hover:scale-110 active:scale-95 duration-200 cursor-pointer">
                          {sticker.emoji}
                        </span>
                        <div className="text-[10px] text-neutral-400 opacity-60 mt-1 flex items-center gap-1">
                          <span>{new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                          {isMe && (
                            <button
                              onClick={() => deleteMessage(message.id)}
                              className="text-red-400 hover:text-red-500 ml-1 hover:underline opacity-0 group-hover:opacity-100 transition"
                              title="Supprimer le sticker"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] sm:max-w-[70%] rounded-3xl p-3.5 text-sm leading-relaxed shadow-sm space-y-2 ${isMe ? "bg-[var(--app-foreground)] text-[var(--app-background)]" : "bg-[var(--app-surface)] text-[var(--app-foreground)] border border-[var(--app-border)]"}`}>
                      
                      {/* Affichage des Médias */}
                      {media && (
                        <div>
                          {isEphemeral ? (
                            /* Média Éphémère / Temporaire sécurisé */
                            <div className="space-y-2 select-none bg-[var(--app-surface-soft)] p-3 rounded-2xl">
                              <div className="flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--app-foreground)_15%,transparent)] pb-1.5 mb-1.5">
                                <Clock className="h-4 w-4 text-[var(--app-accent)]" />
                                <span className="font-bold text-xs">
                                  Photo temporaire ({media.durationSeconds}s)
                                </span>
                              </div>
                              
                              {media.expiresAt && new Date(media.expiresAt) < new Date() ? (
                                <span className="text-neutral-500 text-xs italic">Média expiré et autodétruit</span>
                              ) : (
                                <button
                                  onClick={() => openSecureMedia(media)}
                                  className="w-full px-4 py-2.5 bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-xs rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
                                >
                                  <span>👁️ Révéler le média privé</span>
                                  {media.durationSeconds && (
                                    <span className="text-[10px] opacity-80">({media.durationSeconds}s)</span>
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            /* Média Standard Direct (Visible immédiatement) */
                            <div className="relative group overflow-hidden rounded-2xl border border-[var(--app-border)] max-h-80 bg-black/20">
                              {media.kind === "VIDEO" ? (
                                <video
                                  src={toPublicUrl(media.url) ?? undefined}
                                  controls
                                  playsInline
                                  className="w-full max-h-72 object-cover rounded-2xl"
                                />
                              ) : (
                                <div
                                  onClick={() => setLightboxMedia({ url: media.url, kind: "IMAGE" })}
                                  className="cursor-pointer relative group"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={toPublicUrl(media.url) ?? undefined}
                                    alt="Photo envoyée"
                                    className="w-full max-h-72 object-cover rounded-2xl transition group-hover:scale-[1.02]"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white rounded-2xl">
                                    <Maximize2 className="w-6 h-6 drop-shadow" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Texte du message */}
                      {message.text && <p className="break-words">{message.text}</p>}

                      {/* Horodatage et suppression */}
                      <div className="text-[10px] text-right mt-1 opacity-65 flex items-center justify-end gap-2 select-none">
                        <span>{new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        {isMe && (
                          <button
                            onClick={() => deleteMessage(message.id)}
                            className="text-red-400 hover:text-red-500 font-bold transition hover:underline ml-1"
                            title="Supprimer le message"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Ancre de scroll automatique */}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Sélecteur de Stickers WhatsApp Flottant */}
            {showStickerPicker && (
              <div className="p-3 bg-[var(--app-surface-raised)] border-t border-[var(--app-border)] flex justify-center animate-slideUp">
                <StickerPicker
                  onSelectSticker={handleSendSticker}
                  onClose={() => setShowStickerPicker(false)}
                />
              </div>
            )}

            {/* Aperçu du Fichier Sélectionné avant envoi */}
            {mediaFile && (
              <div className="p-3 bg-[var(--app-surface-raised)] border-t border-[var(--app-border)] flex items-center justify-between gap-3 animate-fadeIn flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {mediaPreviewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaPreviewUrl}
                      alt="Aperçu"
                      className="w-12 h-12 object-cover rounded-xl border border-[var(--app-border)]"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{mediaFile.name}</p>
                    <p className="text-[10px] text-neutral-400">
                      {(mediaFile.size / (1024 * 1024)).toFixed(2)} Mo · {ephemeralMode ? `Mode éphémère (${durationSeconds}s)` : "Envoi standard direct"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEphemeralMode(!ephemeralMode)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${ephemeralMode ? "bg-[var(--app-foreground)] text-[var(--app-background)]" : "bg-[var(--app-surface)] border border-[var(--app-border)] text-neutral-400"}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{ephemeralMode ? `${durationSeconds}s` : "Éphémère ?"}</span>
                  </button>
                  <button
                    onClick={() => setMediaFile(null)}
                    className="p-1.5 rounded-full hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-red-500 transition"
                    title="Supprimer la photo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Barre de Mode Éphémère Détaillé */}
            {ephemeralMode && !mediaFile && (
              <div className="bg-[var(--app-surface-raised)] border-t border-[var(--app-border)] p-3 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn flex-shrink-0">
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

            {sendError && (
              <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs flex items-center gap-2 flex-shrink-0">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            {/* Barre de Saisie et Boutons d'Action (Compacte & Optimisée Clavier Mobile) */}
            <div className="p-2 sm:p-3 border-t border-[var(--app-border)] bg-[var(--app-surface)] pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Bouton Sticker WhatsApp */}
                <button
                  onClick={() => setShowStickerPicker((v) => !v)}
                  className={`p-2 rounded-full transition flex-shrink-0 ${showStickerPicker ? "bg-[var(--app-foreground)] text-[var(--app-background)]" : "text-neutral-400 hover:text-white hover:bg-[var(--app-surface-soft)]"}`}
                  title="Stickers WhatsApp"
                >
                  <Smile className="h-5 w-5" />
                </button>

                {/* Bouton Média Éphémère */}
                <button
                  onClick={() => setEphemeralMode(!ephemeralMode)}
                  className={`p-2 rounded-full transition flex-shrink-0 ${ephemeralMode ? "bg-[var(--app-foreground)] text-[var(--app-background)]" : "text-neutral-400 hover:text-white hover:bg-[var(--app-surface-soft)]"}`}
                  title="Activer/Désactiver média temporaire éphémère"
                >
                  <Clock className="h-5 w-5" />
                </button>

                {/* Bouton Joindre une photo */}
                <label className="p-2 text-neutral-400 hover:text-white hover:bg-[var(--app-surface-soft)] rounded-full transition cursor-pointer flex-shrink-0">
                  <ImageIcon className="h-5 w-5" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    disabled={isSending}
                    onChange={(event) => {
                      if (event.target.files?.[0]) {
                        setMediaFile(event.target.files[0]);
                      }
                    }}
                  />
                </label>

                {/* Input de Message avec focus auto-scroll */}
                <input
                  type="text"
                  value={inputText}
                  disabled={isSending}
                  onChange={handleInputChange}
                  onFocus={() => {
                    setShowStickerPicker(false);
                    setTimeout(() => scrollToBottom(true), 250);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !isSending && sendMessage()}
                  placeholder={mediaFile ? "Légende de la photo..." : "Message privé..."}
                  className="flex-1 min-w-0 px-4 py-2 bg-[var(--app-surface-raised)] rounded-full text-sm outline-none border border-transparent focus:border-[var(--app-border)]"
                />

                {/* Bouton d'Envoi */}
                <button
                  onClick={sendMessage}
                  disabled={isSending || (!inputText.trim() && !mediaFile)}
                  className="p-2.5 bg-[var(--app-foreground)] text-[var(--app-background)] rounded-full hover:opacity-85 disabled:opacity-40 transition flex-shrink-0 flex items-center justify-center"
                  title="Envoyer"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-500 max-w-sm">
            <Info className="h-8 w-8 mb-2" />
            <h4 className="font-bold text-base mb-1">Sélectionnez une discussion</h4>
            <p className="text-xs text-neutral-400">
              Choisissez un contact pour commencer à échanger ou envoyer des photos et stickers.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox HD pour Photos et Vidéos Directes */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 select-none"
          onClick={() => setLightboxMedia(null)}
        >
          <button
            onClick={() => setLightboxMedia(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center relative overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.kind === "VIDEO" ? (
              <video
                autoPlay
                controls
                playsInline
                className="max-w-full max-h-[85vh] object-contain rounded-2xl"
                src={toPublicUrl(lightboxMedia.url) ?? undefined}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Photo plein écran"
                src={toPublicUrl(lightboxMedia.url) ?? undefined}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}

      {/* Modale de visionnage sécurisé pour média éphémère */}
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
