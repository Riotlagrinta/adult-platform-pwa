"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  Reply,
  Palette,
  Settings2,
  ShieldCheck,
  CheckCircle2,
  Volume2,
  User,
  Mic,
  Trash2,
  Square,
  Phone,
  Video,
} from "lucide-react";
import { useCall } from "@/context/CallContext";
import { dismissActivePushNotifications } from "@/lib/push";
import { ConversationListSkeleton, GlobalPulseLoader } from "@/components/SkeletonLoader";
import { useAuth } from "@/components/AuthProvider";
import AuthPanel from "@/components/AuthPanel";
import { apiRequest, toPublicUrl } from "@/lib/api";
import { parseSticker, encodeSticker, Sticker } from "@/lib/stickers";
import StickerPicker from "@/components/StickerPicker";
import StoryTray, { StoryGroup, StoryItem } from "@/components/StoryTray";
import VoicePlayer from "@/components/VoicePlayer";
import ChatWallpaperSelector from "@/components/ChatWallpaperSelector";
import {
  getSavedWallpaper,
  getSavedCustomWallpaper,
  getSavedCustomDimming,
  getWallpaperContainerStyle,
  getSavedBubbleColor,
  getSavedCustomBubbleHex,
  getBubbleStyle,
} from "@/lib/wallpaper";

type Conversation = {
  id: string;
  userAId: string;
  userBId: string;
  messages: Message[];
  unreadCount: number;
};

type Message = {
  id: string;
  senderId: string;
  text?: string | null;
  createdAt: string;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    senderId: string;
    text?: string | null;
    sender?: { id: string; displayName: string };
    media?: {
      id: string;
      url: string;
      kind: "IMAGE" | "VIDEO" | "AUDIO";
    }[];
  } | null;
  media?: {
    id: string;
    url: string;
    kind: "IMAGE" | "VIDEO" | "AUDIO";
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
  isMutual?: boolean;
  isOnline?: boolean | null;
  lastSeenAt?: string | null;
};

function formatLastSeen(dateStr?: string | null): string {
  if (!dateStr) return "Hors ligne";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "Vu(e) à l'instant";
    if (diffMinutes < 60) return `Vu(e) il y a ${diffMinutes} min`;

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    if (isToday) {
      return `Vu(e) aujourd'hui à ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `Vu(e) hier à ${timeStr}`;
    }

    const dateStrShort = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    return `Vu(e) le ${dateStrShort} à ${timeStr}`;
  } catch {
    return "Hors ligne";
  }
}

export default function MessagesPage() {
  const router = useRouter();
  const { token, user, ready, socket } = useAuth();
  const { startCall } = useCall();
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
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserLookup[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const selectedConvIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);

  // État des stories par utilisateur
  const [storiesByUserId, setStoriesByUserId] = useState<Record<string, StoryItem[]>>({});

  // Paramètres de discussion & Wallpapers & Couleurs de bulles
  const [chatWallpaper, setChatWallpaper] = useState<string>("default");
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [wallpaperDimming, setWallpaperDimming] = useState<number>(40);
  const [chatFontSize, setChatFontSize] = useState<"small" | "medium" | "large">("medium");
  const [bubbleColor, setBubbleColorState] = useState<string>("default");
  const [customBubbleHex, setCustomBubbleHex] = useState<string>("#059669");
  const [showChatSettingsModal, setShowChatSettingsModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const syncWallpaper = () => {
        setChatWallpaper(getSavedWallpaper());
        setCustomPhotoUrl(getSavedCustomWallpaper());
        setWallpaperDimming(getSavedCustomDimming());
      };
      const syncFontSize = () => {
        const savedFs = localStorage.getItem("chat_font_size") as "small" | "medium" | "large";
        if (savedFs) setChatFontSize(savedFs);
      };
      const syncBubbleColor = (e?: any) => {
        if (e?.detail) {
          setBubbleColorState(e.detail.colorId);
          if (e.detail.customHex) setCustomBubbleHex(e.detail.customHex);
        } else {
          setBubbleColorState(getSavedBubbleColor());
          setCustomBubbleHex(getSavedCustomBubbleHex());
        }
      };

      syncWallpaper();
      syncFontSize();
      syncBubbleColor();

      window.addEventListener("chatwallpaperchange", syncWallpaper);
      window.addEventListener("chatfontsizechange", syncFontSize);
      window.addEventListener("chatbubblecolorchange", syncBubbleColor);
      return () => {
        window.removeEventListener("chatwallpaperchange", syncWallpaper);
        window.removeEventListener("chatfontsizechange", syncFontSize);
        window.removeEventListener("chatbubblecolorchange", syncBubbleColor);
      };
    }
  }, []);

  const handleStoriesLoaded = useCallback((groups: StoryGroup[]) => {
    const map: Record<string, StoryItem[]> = {};
    groups.forEach((g) => {
      map[g.userId] = g.items;
    });
    setStoriesByUserId(map);
  }, []);

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

  // ── Enregistreur Vocal WhatsApp (MediaRecorder 1m30 max) ──
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sélection du MIME type audio le plus stable selon le navigateur
  const getOptimalAudioMimeType = () => {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
      return "";
    }
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/aac",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }
    return "";
  };

  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("L'enregistrement vocal n'est pas supporté sur ce navigateur.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const optimalMime = getOptimalAudioMimeType();
      const recorder = optimalMime
        ? new MediaRecorder(stream, { mimeType: optimalMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(100);
      setIsRecordingVoice(true);
      setVoiceDuration(0);

      // Limite stricte de 1m30 (90 secondes)
      const MAX_VOICE_SECONDS = 90;
      const interval = setInterval(() => {
        setVoiceDuration((prev) => {
          if (prev + 1 >= MAX_VOICE_SECONDS) {
            clearInterval(interval);
            finishAndSendVoiceRecording();
            return MAX_VOICE_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
      voiceIntervalRef.current = interval;
    } catch (err: any) {
      console.error("Erreur micro:", err);
      alert("Impossible d'accéder au microphone. Veuillez autoriser l'accès micro.");
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current);
      voiceIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Recorder stop error:", e);
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecordingVoice(false);
    setVoiceDuration(0);
  };

  const finishAndSendVoiceRecording = async () => {
    if (!mediaRecorderRef.current || !selectedConvId) return;

    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current);
      voiceIntervalRef.current = null;
    }

    const recordedDuration = Math.max(1, voiceDuration);
    const recorder = mediaRecorderRef.current;

    // Attendre la fin d'émission de tous les chunks lors du stop avec timeout de secours
    const stopPromise = new Promise<Blob[]>((resolve) => {
      let isResolved = false;
      const safeResolve = () => {
        if (isResolved) return;
        isResolved = true;
        if (streamRef.current) {
          try {
            streamRef.current.getTracks().forEach((track) => track.stop());
          } catch (err) {
            console.warn("Track stop error:", err);
          }
          streamRef.current = null;
        }
        resolve([...audioChunksRef.current]);
      };

      recorder.onstop = () => {
        safeResolve();
      };

      // Garde-fou 800ms pour garantir que l'interface ne reste JAMAIS bloquée
      const fallbackTimer = setTimeout(() => {
        safeResolve();
      }, 800);

      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch (e) {
          console.warn("Recorder stop error:", e);
          clearTimeout(fallbackTimer);
          safeResolve();
        }
      } else {
        clearTimeout(fallbackTimer);
        safeResolve();
      }
    });

    setIsRecordingVoice(false);
    setVoiceDuration(0);
    setIsSending(true);
    setSendError(null);

    try {
      const chunks = await stopPromise;
      if (!chunks || chunks.length === 0) {
        throw new Error("Aucun audio n'a été enregistré.");
      }

      const recorderMime = recorder.mimeType || getOptimalAudioMimeType() || "audio/webm";
      const cleanMime = recorderMime.split(";")[0].trim().toLowerCase() || "audio/webm";
      
      let ext = "webm";
      if (cleanMime.includes("mp4") || cleanMime.includes("m4a")) {
        ext = "mp4";
      } else if (cleanMime.includes("aac")) {
        ext = "aac";
      } else if (cleanMime.includes("ogg")) {
        ext = "ogg";
      } else if (cleanMime.includes("wav")) {
        ext = "wav";
      }

      const audioBlob = new Blob(chunks, { type: cleanMime });
      const audioFile = new File([audioBlob], `voice_${Date.now()}.${ext}`, { type: cleanMime });

      // 1. Upload audio sur Backblaze B2 / stockage local via /files/media
      const uploadForm = new FormData();
      uploadForm.append("file", audioFile);

      const uploadRes = await apiRequest<{ file: { url: string; mimeType: string } }>("/files/media", {
        method: "POST",
        token: token!,
        body: uploadForm,
      });

      // 2. Envoi du message avec kind AUDIO et durationSeconds
      const payload = {
        replyToId: replyingToMessage?.id || undefined,
        media: {
          kind: "AUDIO" as const,
          url: uploadRes.file.url,
          mimeType: uploadRes.file.mimeType || cleanMime,
          durationSeconds: Math.round(recordedDuration),
          allowDownload: true,
        },
      };

      const res = await apiRequest<{ message: Message }>(`/messages/conversations/${selectedConvId}/messages`, {
        method: "POST",
        token: token!,
        body: JSON.stringify(payload),
      });

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === selectedConvId) {
            const exists = c.messages.some((m) => m.id === res.message.id);
            return {
              ...c,
              messages: exists ? c.messages : [...c.messages, res.message],
            };
          }
          return c;
        })
      );

      if (selectedConvId) {
        void dismissActivePushNotifications({ conversationId: selectedConvId });
      }

      cancelReplying();
      setTimeout(() => scrollToBottom(true), 150);
    } catch (err: any) {
      console.error("Erreur envoi vocal:", err);
      setSendError(err?.message || "Échec de l'envoi du message vocal.");
      alert(`Erreur d'envoi du vocal : ${err?.message || "Échec de transmission"}`);
    } finally {
      setIsSending(false);
    }
  };

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

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!token) return;

    setConversations((previous) => previous.map((conversation) => (
      conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
    )));

    try {
      await apiRequest(`/messages/conversations/${conversationId}/read`, {
        method: "POST",
        token,
      });
    } catch (readError) {
      console.error("Impossible de marquer la conversation comme lue:", readError);
    }
  }, [token]);

  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  useEffect(() => {
    if (selectedConvId) {
      void markConversationAsRead(selectedConvId);
      void dismissActivePushNotifications({ conversationId: selectedConvId });
    }
  }, [markConversationAsRead, selectedConvId]);

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
            const isIncomingMessage = data.message.senderId !== user?.id;
            const isActiveConversation = selectedConvIdRef.current === data.conversationId;
            return {
              ...conv,
              messages: updatedMessages,
              unreadCount: alreadyExists || !isIncomingMessage || isActiveConversation
                ? conv.unreadCount
                : conv.unreadCount + 1,
            };
          }
          return conv;
        });
      });
      // Scroll en douceur dès qu'un nouveau message arrive
      if (selectedConvIdRef.current === data.conversationId) {
        void markConversationAsRead(data.conversationId);
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

    const handleUserOnline = (data: { userId: string }) => {
      setUsersById((prev) => {
        const u = prev[data.userId];
        if (!u) return prev;
        return {
          ...prev,
          [data.userId]: { ...u, isOnline: true, isMutual: true },
        };
      });
    };

    const handleUserOffline = (data: { userId: string; lastSeenAt?: string }) => {
      setUsersById((prev) => {
        const u = prev[data.userId];
        if (!u) return prev;
        return {
          ...prev,
          [data.userId]: { ...u, isOnline: false, lastSeenAt: data.lastSeenAt || new Date().toISOString() },
        };
      });
    };

    const handlePresenceUpdate = (data: { userId: string; isOnline: boolean; lastSeenAt: string | null; isMutual: boolean }) => {
      setUsersById((prev) => {
        const u = prev[data.userId];
        if (!u) return prev;
        return {
          ...prev,
          [data.userId]: {
            ...u,
            isOnline: data.isOnline,
            lastSeenAt: data.lastSeenAt,
            isMutual: data.isMutual,
          },
        };
      });
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);
    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [socket, selectedConvId, user?.id, markConversationAsRead, scrollToBottom]);

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

  const startReplying = (msg: Message) => {
    setReplyingToMessage(msg);
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 50);
  };

  const cancelReplying = () => {
    setReplyingToMessage(null);
  };

  const scrollToQuotedMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const getSnippetFromMessage = (msg: Message | null | undefined) => {
    if (!msg) return "";
    const sticker = parseSticker(msg.text);
    if (sticker) return `${sticker.emoji} Sticker ${sticker.name}`;
    if (msg.text) return msg.text;
    if (msg.media && msg.media.length > 0) {
      return msg.media[0].kind === "VIDEO" ? "🎥 Vidéo" : "📷 Photo";
    }
    return "Message";
  };

  const getAuthorNameFromMessage = (msg: Message | null | undefined) => {
    if (!msg) return "";
    if (msg.senderId === user?.id) return "Vous";
    if (activePartner && msg.senderId === activePartner.id) return activePartner.displayName;
    if (msg.replyTo?.sender?.displayName) return msg.replyTo.sender.displayName;
    return "Utilisateur";
  };

  const activePartner = useMemo(() => {
    if (!selectedConversation || !user) {
      return null;
    }

    const partnerId = selectedConversation.userAId === user.id ? selectedConversation.userBId : selectedConversation.userAId;
    return usersById[partnerId] ?? null;
  }, [selectedConversation, user, usersById]);

  useEffect(() => {
    if (socket && activePartner?.id) {
      socket.emit("presence:request", { targetUserId: activePartner.id });
    }
  }, [socket, activePartner?.id]);

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
          replyToId: replyingToMessage?.id || undefined,
          media: mediaPayload,
        }),
      });

      void dismissActivePushNotifications({ conversationId: selectedConversation.id });

      if (socket && activePartner) {
        socket.emit("typing:stop", {
          conversationId: selectedConversation.id,
          recipientId: activePartner.id,
        });
      }

      setInputText("");
      setMediaFile(null);
      setEphemeralMode(false);
      setReplyingToMessage(null);
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
          replyToId: replyingToMessage?.id || undefined,
        }),
      });

      void dismissActivePushNotifications({ conversationId: selectedConversation.id });

      setReplyingToMessage(null);
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
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 min-h-0 bg-[var(--app-surface)] flex flex-col ${selectedConvId ? "hidden md:flex" : "flex"} pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0`}>
        <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-4 border-b border-[var(--app-border)] flex items-start justify-between gap-3 bg-[var(--app-surface-raised)]">
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

        {/* Story Tray WhatsApp / Instagram style au-dessus des conversations */}
        <div className="border-b border-[var(--app-border)]">
          <StoryTray onStoriesLoaded={handleStoriesLoaded} />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 p-2">
          {loading && <ConversationListSkeleton />}
          {error && <div className="p-4 text-sm text-red-500">{error}</div>}
          {!loading && conversations.length === 0 && (
            <div className="p-8 text-center text-neutral-500 space-y-2">
              <Info className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs font-bold">Aucune discussion pour l&apos;instant.</p>
              <p className="text-[11px] text-neutral-400">Cliquez sur « Nouveau » pour commencer une conversation.</p>
            </div>
          )}
          {conversations.map((conversation) => {
            const partnerId = conversation.userAId === user?.id ? conversation.userBId : conversation.userAId;
            const partner = usersById[partnerId];
            const lastMessage = conversation.messages[0];
            const sticker = parseSticker(lastMessage?.text);
            const hasStory = Boolean(partnerId && storiesByUserId[partnerId]?.length);

            return (
              <div
                key={conversation.id}
                onClick={() => setSelectedConvId(conversation.id)}
                className={`flex items-center gap-3 rounded-[1.65rem] p-3.5 cursor-pointer border transition-all duration-200 ${
                  selectedConvId === conversation.id
                    ? "bg-[var(--app-surface-raised)] border-[var(--app-border)] shadow-sm"
                    : "border-transparent hover:bg-[var(--app-surface-soft)] hover:border-[var(--app-border)]"
                }`}
              >
                {/* Avatar avec cercle dégradé Story Instagram / WhatsApp si story active */}
                <div
                  onClick={(e) => {
                    if (hasStory) {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent("open-user-story", { detail: { userId: partnerId } }));
                    }
                  }}
                  className={`flex-shrink-0 relative rounded-full ${
                    hasStory
                      ? "p-[2.5px] bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 cursor-pointer hover:scale-105 transition shadow-sm"
                      : ""
                  }`}
                  title={hasStory ? "Voir la story active de ce membre" : ""}
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm overflow-hidden border-2 border-[var(--app-surface)]">
                    {partner?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={toPublicUrl(partner.avatarUrl) ?? undefined}
                        alt={partner.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (partner?.displayName ?? "??").slice(0, 2).toUpperCase()
                    )}
                  </div>
                  {partner?.isMutual && partner?.isOnline && (
                    <span
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--app-surface)] shadow-sm"
                      title="En ligne"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-bold truncate text-sm flex items-center gap-1.5 ${conversation.unreadCount > 0 ? "text-[var(--app-foreground)]" : ""}`}>
                      <span>{partner?.displayName ?? partnerId}</span>
                      {hasStory && (
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse flex-shrink-0" title="Story active" />
                      )}
                    </span>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-[11px] ${conversation.unreadCount > 0 ? "font-bold text-[var(--app-accent)]" : "text-neutral-400"}`}>
                        {lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-[var(--app-accent)] text-white text-[10px] leading-5 text-center font-black shadow-sm">
                          {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs truncate ${conversation.unreadCount > 0 ? "font-semibold text-[var(--app-foreground)]" : "text-neutral-500"}`}>
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
      <div className={`flex-1 flex flex-col min-h-0 h-full bg-[var(--app-background)] overflow-hidden ${!selectedConvId ? "hidden md:flex justify-center items-center text-neutral-500" : "flex fixed inset-0 z-40 md:relative md:z-auto md:inset-auto"}`}>
        {selectedConversation && activePartner ? (
          <>
            {/* Header de Discussion WhatsApp */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-4 md:p-4 border-b border-[var(--app-border)] bg-[var(--app-surface)] flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-[var(--app-surface-soft)] transition"
                  title="Retour aux conversations"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                {/* Avatar du contact dans le header avec Story Ring */}
                {(() => {
                  const partnerHasStory = Boolean(activePartner && storiesByUserId[activePartner.id]?.length);
                  return (
                    <div
                      onClick={() => {
                        if (partnerHasStory) {
                          window.dispatchEvent(new CustomEvent("open-user-story", { detail: { userId: activePartner.id } }));
                        }
                      }}
                      className={`flex-shrink-0 relative rounded-full ${
                        partnerHasStory
                          ? "p-[2.5px] bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 cursor-pointer hover:scale-105 transition"
                          : ""
                      }`}
                      title={partnerHasStory ? "Regarder la story de ce membre" : ""}
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm overflow-hidden border border-[var(--app-surface)]">
                        {activePartner.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={toPublicUrl(activePartner.avatarUrl) ?? undefined}
                            alt={activePartner.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          activePartner.displayName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      {activePartner.isMutual && activePartner.isOnline && (
                        <span
                          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--app-surface)] shadow-sm"
                          title="En ligne"
                        />
                      )}
                    </div>
                  );
                })()}

                <div>
                  <h4 className="font-bold text-sm flex items-center gap-1.5">
                    <span>{activePartner.displayName}</span>
                    {isPartnerTyping && (
                      <span className="text-[10px] text-green-500 font-medium animate-pulse">(écrit...)</span>
                    )}
                  </h4>
                  {isPartnerTyping ? (
                    <span className="text-[11px] text-emerald-500 font-bold animate-pulse">en train d&apos;écrire...</span>
                  ) : activePartner.isMutual ? (
                    activePartner.isOnline ? (
                      <span className="text-[11px] text-emerald-500 font-black flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>En ligne</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400 font-medium">
                        {formatLastSeen(activePartner.lastSeenAt)}
                      </span>
                    )
                  ) : (
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span>Discussion chiffrée</span>
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Bouton Appel Audio WebRTC */}
                <button
                  type="button"
                  onClick={() =>
                    startCall(
                      {
                        id: activePartner.id,
                        displayName: activePartner.displayName,
                        avatarUrl: activePartner.avatarUrl,
                      },
                      false,
                    )
                  }
                  className="p-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:bg-emerald-500/15 text-emerald-500 hover:text-emerald-400 active:scale-95 transition shadow-sm"
                  title="Lancer un appel vocal sécurisé"
                >
                  <Phone className="w-4 h-4" />
                </button>

                {/* Bouton Appel Vidéo WebRTC */}
                <button
                  type="button"
                  onClick={() =>
                    startCall(
                      {
                        id: activePartner.id,
                        displayName: activePartner.displayName,
                        avatarUrl: activePartner.avatarUrl,
                      },
                      true,
                    )
                  }
                  className="p-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:bg-cyan-500/15 text-cyan-500 hover:text-cyan-400 active:scale-95 transition shadow-sm"
                  title="Lancer un appel vidéo sécurisé"
                >
                  <Video className="w-4 h-4" />
                </button>

                {/* Bouton Paramètres & Options de discussion WhatsApp */}
                <button
                  onClick={() => setShowChatSettingsModal(true)}
                  className="p-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-[var(--app-foreground)] transition flex items-center gap-1.5 px-3"
                  title="Paramètres de discussion"
                >
                  <Settings2 className="w-4 h-4 text-[var(--app-accent,#25D366)]" />
                  <span className="text-xs font-bold hidden sm:inline">Options</span>
                </button>
              </div>
            </div>

            {/* Corps des Messages avec Défilement Fluide et Fond d'écran */}
            <div
              ref={messagesContainerRef}
              style={getWallpaperContainerStyle(chatWallpaper, customPhotoUrl, wallpaperDimming)}
              className={`flex-1 overflow-y-auto p-4 space-y-4 transition-all duration-300 ${
                chatFontSize === "small" ? "text-xs" : chatFontSize === "large" ? "text-base" : "text-sm"
              }`}
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
                const isHighlighted = highlightedMessageId === message.id;

                // Rendu spécial WhatsApp Sticker (sans bulle de fond épaisse)
                if (sticker) {
                  return (
                    <div
                      key={message.id}
                      id={`msg-${message.id}`}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fadeIn transition-all duration-300 ${isHighlighted ? "p-2 rounded-3xl bg-[var(--app-accent)]/20 ring-2 ring-[var(--app-accent)]" : ""}`}
                    >
                      <div className="flex flex-col items-center select-none group max-w-[80%]">
                        {/* Encart de Citation pour Sticker */}
                        {message.replyTo && (
                          <div
                            onClick={() => scrollToQuotedMessage(message.replyTo!.id)}
                            className="cursor-pointer mb-2 w-full max-w-xs rounded-xl p-2 text-xs bg-[var(--app-surface)] text-[var(--app-foreground)] border border-[var(--app-border)] border-l-4 border-l-[var(--app-accent)] shadow-sm hover:opacity-90 transition flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-[10px] text-[var(--app-accent)] block truncate">
                                {message.replyTo.senderId === user?.id
                                  ? "Vous"
                                  : (message.replyTo.sender?.displayName || activePartner?.displayName || "Utilisateur")}
                              </span>
                              <p className="truncate text-[11px] opacity-80 mt-0.5">
                                {getSnippetFromMessage(message.replyTo as Message)}
                              </p>
                            </div>
                            {message.replyTo.media?.[0] && (
                              <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0 bg-black/20">
                                <img
                                  src={toPublicUrl(message.replyTo.media[0].url) ?? undefined}
                                  alt="Média cité"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {sticker.isCustom && sticker.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={toPublicUrl(sticker.url) ?? undefined}
                            alt={sticker.name}
                            className="w-28 h-28 sm:w-36 sm:h-36 object-contain filter drop-shadow-xl transform transition-transform hover:scale-105 active:scale-95 duration-200 cursor-pointer rounded-2xl"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-6xl sm:text-7xl filter drop-shadow-lg transform transition-transform hover:scale-110 active:scale-95 duration-200 cursor-pointer">
                            {sticker.emoji}
                          </span>
                        )}
                        <div className="text-[10px] text-neutral-400 opacity-70 mt-1 flex items-center gap-1.5">
                          <span>{new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                          <button
                            onClick={() => startReplying(message)}
                            className="p-1 hover:bg-[var(--app-surface-soft)] rounded-full text-neutral-400 hover:text-[var(--app-foreground)] transition"
                            title="Répondre à ce sticker"
                          >
                            <Reply className="w-3 h-3" />
                          </button>
                          {isMe && (
                            <button
                              onClick={() => deleteMessage(message.id)}
                              className="text-red-400 hover:text-red-500 ml-0.5 hover:underline opacity-0 group-hover:opacity-100 transition"
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

                const bubbleStyle = isMe ? getBubbleStyle(bubbleColor, customBubbleHex) : undefined;

                return (
                  <div
                    key={message.id}
                    id={`msg-${message.id}`}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} transition-all duration-300 group`}
                  >
                    <div
                      style={bubbleStyle}
                      className={`max-w-[85%] sm:max-w-[72%] rounded-3xl p-3.5 text-sm leading-relaxed shadow-sm space-y-2 transition-all duration-300 ${
                        isHighlighted ? "ring-4 ring-[var(--app-accent)] scale-[1.01]" : ""
                      } ${
                        isMe
                          ? !bubbleStyle
                            ? "bg-[var(--app-foreground)] text-[var(--app-background)] rounded-br-sm"
                            : "rounded-br-sm"
                          : "bg-[var(--app-surface)] text-[var(--app-foreground)] border border-[var(--app-border)] rounded-bl-sm"
                      }`}
                    >
                      {/* Encart de Citation style WhatsApp dans la bulle */}
                      {message.replyTo && (
                        <div
                          onClick={() => scrollToQuotedMessage(message.replyTo!.id)}
                          className={`cursor-pointer rounded-2xl p-2.5 text-xs select-none transition hover:opacity-90 flex items-center justify-between gap-2 border-l-4 mb-2 ${
                            isMe
                              ? "bg-black/25 text-neutral-100 border-l-[var(--app-accent,#25D366)]"
                              : "bg-[var(--app-surface-soft)] text-[var(--app-foreground)] border-l-[var(--app-accent,#25D366)]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className={`font-black text-[10px] block truncate ${isMe ? "text-neutral-200" : "text-[var(--app-accent)]"}`}>
                              {message.replyTo.senderId === user?.id
                                ? "Vous"
                                : (message.replyTo.sender?.displayName || activePartner?.displayName || "Utilisateur")}
                            </span>
                            <p className="truncate opacity-85 mt-0.5 text-[11px]">
                              {getSnippetFromMessage(message.replyTo as Message)}
                            </p>
                          </div>
                          {message.replyTo.media?.[0] && (
                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
                              <img
                                src={toPublicUrl(message.replyTo.media[0].url) ?? undefined}
                                alt="Média cité"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Affichage des Médias */}
                      {media && (
                        <div>
                          {media.kind === "AUDIO" ? (
                            /* Message Vocal Interactif Waveform WhatsApp */
                            <VoicePlayer
                              url={media.url}
                              durationSeconds={media.durationSeconds}
                              isMe={isMe}
                            />
                          ) : isEphemeral ? (
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

                      {/* Horodatage, Réponse et Suppression */}
                      <div className="text-[10px] text-right mt-1 opacity-70 flex items-center justify-end gap-2 select-none">
                        <span>{new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        
                        {/* Bouton de Réponse WhatsApp */}
                        <button
                          onClick={() => startReplying(message)}
                          className="hover:opacity-100 p-0.5 rounded transition flex items-center gap-0.5 font-bold"
                          title="Répondre à ce message"
                        >
                          <Reply className="w-3 h-3" />
                          <span>Répondre</span>
                        </button>

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
                  token={token}
                  onSelectSticker={handleSendSticker}
                  onClose={() => setShowStickerPicker(false)}
                />
              </div>
            )}

            {/* Bannière de Citation Active (Style WhatsApp au-dessus de l'input) */}
            {replyingToMessage && (
              <div className="p-2.5 px-3 bg-[var(--app-surface-raised)] border-t border-[var(--app-border)] flex items-center justify-between gap-3 animate-fadeIn flex-shrink-0 shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-1 self-stretch rounded-full bg-[var(--app-foreground)] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--app-foreground)]">
                      <Reply className="w-3.5 h-3.5" />
                      <span>Réponse à {getAuthorNameFromMessage(replyingToMessage)}</span>
                    </div>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {getSnippetFromMessage(replyingToMessage)}
                    </p>
                  </div>
                  {replyingToMessage.media?.[0] && (
                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-[var(--app-border)] flex-shrink-0 bg-black/20">
                      <img
                        src={toPublicUrl(replyingToMessage.media[0].url) ?? undefined}
                        alt="Aperçu réponse"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={cancelReplying}
                  className="p-1.5 rounded-full hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-[var(--app-foreground)] transition flex-shrink-0"
                  title="Annuler la réponse"
                >
                  <X className="w-4 h-4" />
                </button>
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
              {isRecordingVoice ? (
                /* UI d'enregistrement vocal direct (1m30 max) */
                <div className="flex items-center gap-2 w-full animate-fadeIn bg-[var(--app-surface-raised)] px-3 py-2 rounded-full border border-red-500/30">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    <span className="text-xs font-mono font-bold text-red-500 flex-shrink-0">
                      {Math.floor(voiceDuration / 60)}:{(voiceDuration % 60).toString().padStart(2, "0")} / 1:30
                    </span>
                    <div className="flex-1 flex items-center gap-1 h-3 overflow-hidden opacity-75">
                      {Array.from({ length: 14 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-red-500 rounded-full animate-pulse"
                          style={{
                            height: `${((i * 7 + (voiceDuration * 13)) % 80) + 20}%`,
                            animationDuration: "0.8s",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="p-2 rounded-full hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition flex-shrink-0"
                    title="Annuler l'enregistrement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={finishAndSendVoiceRecording}
                    disabled={isSending}
                    className="px-3.5 py-1.5 bg-[var(--app-accent,#25D366)] text-white rounded-full hover:brightness-110 shadow-md transition flex items-center gap-1.5 font-bold text-xs flex-shrink-0 active:scale-95 disabled:opacity-50"
                    title="Arrêter l'enregistrement et envoyer"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>Arrêter</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
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

                  {/* Input de Message avec focus auto-scroll et ref */}
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={inputText}
                    disabled={isSending}
                    onChange={handleInputChange}
                    onFocus={() => {
                      setShowStickerPicker(false);
                      setTimeout(() => scrollToBottom(true), 250);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && !isSending && sendMessage()}
                    placeholder={
                      replyingToMessage
                        ? `Répondre à ${getAuthorNameFromMessage(replyingToMessage)}...`
                        : mediaFile
                        ? "Légende de la photo..."
                        : "Message privé..."
                    }
                    className="flex-1 min-w-0 px-4 py-2 bg-[var(--app-surface-raised)] rounded-full text-sm outline-none border border-transparent focus:border-[var(--app-border)]"
                  />

                  {/* Bouton Micro WhatsApp si champ vide, sinon bouton Envoi classique */}
                  {!inputText.trim() && !mediaFile ? (
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      disabled={isSending}
                      className="p-2.5 bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-soft)] text-[var(--app-foreground)] rounded-full transition flex-shrink-0 flex items-center justify-center border border-[var(--app-border)] active:scale-95 shadow-sm"
                      title="Enregistrer un message vocal (1m30 max)"
                    >
                      <Mic className="h-4 w-4 text-[var(--app-accent,#25D366)]" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={isSending || (!inputText.trim() && !mediaFile)}
                      className="p-2.5 bg-[var(--app-foreground)] text-[var(--app-background)] rounded-full hover:opacity-85 disabled:opacity-40 transition flex-shrink-0 flex items-center justify-center"
                      title="Envoyer"
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              )}
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

      {/* ── MODALE PARAMÈTRES DE DISCUSSION STYLE WHATSAPP ── */}
      {showChatSettingsModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 select-none animate-fadeIn"
          onClick={() => setShowChatSettingsModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header des Réglages */}
            <div className="px-5 py-4 border-b border-[var(--app-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl bg-[var(--app-accent,#25D366)]/15 text-[var(--app-accent,#25D366)] flex items-center justify-center">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight">Paramètres de discussion</h3>
                  <p className="text-[11px] text-neutral-400">Personnalisation style WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => setShowChatSettingsModal(false)}
                className="p-1.5 rounded-full hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-[var(--app-foreground)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenu Déroulant */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* 1. Personnalisation du Fond d'écran & Texte */}
              <ChatWallpaperSelector />

              {/* 3. Sécurité & Chiffrement E2E */}
              <div className="p-3.5 rounded-2xl bg-[var(--app-surface-raised)] border border-[var(--app-border)] space-y-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold">Chiffrement de bout en bout actif</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Les messages et appels sont chiffrés. Personne en dehors de cette discussion ne peut les lire.
                </p>
              </div>

              {/* 4. Raccourcis de Confidentialité & Profil */}
              {activePartner && (
                <div className="pt-2 border-t border-[var(--app-border)] space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatSettingsModal(false);
                      router.push(`/profile/${activePartner.id}`);
                    }}
                    className="w-full py-2.5 px-3 rounded-2xl bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-soft)] text-[var(--app-foreground)] font-bold text-xs transition flex items-center justify-center gap-1.5 border border-[var(--app-border)]"
                  >
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Afficher le profil de {activePartner.displayName}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatSettingsModal(false);
                      triggerBlock(activePartner.id);
                    }}
                    className="w-full py-2.5 px-3 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Bloquer ce contact ({activePartner.displayName})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatSettingsModal(false);
                      triggerReport(activePartner.id);
                    }}
                    className="w-full py-2.5 px-3 rounded-2xl bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-[var(--app-foreground)] font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Signaler ce compte</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bouton Fermer */}
            <div className="p-4 border-t border-[var(--app-border)] bg-[var(--app-surface-raised)] flex justify-end">
              <button
                type="button"
                onClick={() => setShowChatSettingsModal(false)}
                className="px-6 py-2.5 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] text-xs font-bold hover:opacity-90 transition"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
