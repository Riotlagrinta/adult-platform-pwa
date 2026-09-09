"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Users,
  Plus,
  MessageSquare,
  Sparkles,
  Send,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  Check,
  ShieldCheck,
  Info,
  Smile,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest, toPublicUrl } from "@/lib/api";
import { soundManager } from "@/lib/sound";
import {
  getSavedWallpaper,
  getSavedCustomWallpaper,
  getSavedCustomDimming,
  getWallpaperContainerStyle,
  getSavedBubbleColor,
  getSavedCustomBubbleHex,
  getBubbleStyle,
} from "@/lib/wallpaper";

type GroupItem = {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  creatorId: string;
  createdAt: string;
  creator: { id: string; displayName: string; avatarUrl?: string | null };
  members: { user: { id: string; displayName: string; avatarUrl?: string | null; verificationStatus?: string } }[];
  messages: { text?: string | null; createdAt: string; sender: { id: string; displayName: string } }[];
};

type GroupMessage = {
  id: string;
  groupId: string;
  senderId: string;
  text?: string | null;
  mediaUrl?: string | null;
  createdAt: string;
  sender: { id: string; displayName: string; avatarUrl?: string | null };
};

type ContactUser = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
};

export default function CommunityPage() {
  const router = useRouter();
  const { token, user, ready, socket } = useAuth();

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // Modal de création de groupe
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [availableContacts, setAvailableContacts] = useState<ContactUser[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [chatWallpaper, setChatWallpaper] = useState<string>("default");
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [wallpaperDimming, setWallpaperDimming] = useState<number>(40);
  const [bubbleColor, setBubbleColorState] = useState<string>("default");
  const [customBubbleHex, setCustomBubbleHex] = useState<string>("#059669");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const syncWallpaper = () => {
        setChatWallpaper(getSavedWallpaper());
        setCustomPhotoUrl(getSavedCustomWallpaper());
        setWallpaperDimming(getSavedCustomDimming());
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
      syncBubbleColor();

      window.addEventListener("chatwallpaperchange", syncWallpaper);
      window.addEventListener("chatbubblecolorchange", syncBubbleColor);
      return () => {
        window.removeEventListener("chatwallpaperchange", syncWallpaper);
        window.removeEventListener("chatbubblecolorchange", syncBubbleColor);
      };
    }
  }, []);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadGroups = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ groups: GroupItem[] }>("/groups", { token });
      setGroups(res.groups || []);
    } catch (err) {
      console.error("Erreur chargement groupes:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadContacts = useCallback(async () => {
    if (!token) return;
    try {
      const followingRes = await apiRequest<{ following: ContactUser[] }>("/social/following", { token });
      const followersRes = await apiRequest<{ followers: ContactUser[] }>("/social/followers", { token });
      const seen = new Map<string, ContactUser>();
      [...followingRes.following, ...followersRes.followers].forEach((c) => {
        if (c.id !== user?.id && !seen.has(c.id)) {
          seen.set(c.id, c);
        }
      });
      setAvailableContacts(Array.from(seen.values()));
    } catch {}
  }, [token, user?.id]);

  useEffect(() => {
    if (token) {
      void loadGroups();
      void loadContacts();
    }
  }, [loadGroups, loadContacts, token]);

  const loadGroupDetails = useCallback(
    async (groupId: string) => {
      if (!token) return;
      try {
        const res = await apiRequest<{ group: GroupItem & { messages: GroupMessage[] } }>(`/groups/${groupId}`, {
          token,
        });
        setSelectedGroup(res.group);
        setGroupMessages(res.group.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } catch (err) {
        console.error("Erreur chargement détail groupe:", err);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!socket) return;

    const handleGroupMessage = (data: { groupId: string; message: GroupMessage }) => {
      if (selectedGroup && data.groupId === selectedGroup.id) {
        setGroupMessages((prev) => [...prev, data.message]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
      if (user && data.message.senderId !== user.id) {
        soundManager.playMessageSound();
      }
      void loadGroups();
    };

    socket.on("group:message:new", handleGroupMessage);
    return () => {
      socket.off("group:message:new", handleGroupMessage);
    };
  }, [socket, selectedGroup, user, loadGroups]);

  const handleCreateGroup = async () => {
    if (!token || !newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const res = await apiRequest<{ group: GroupItem }>("/groups", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || undefined,
          memberIds: selectedMemberIds,
        }),
      });

      setShowCreateModal(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setSelectedMemberIds([]);
      await loadGroups();
      if (res.group) {
        void loadGroupDetails(res.group.id);
      }
      alert("🎉 Groupe créé avec succès !");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur de création du groupe");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleSendMessage = async () => {
    if (!token || !selectedGroup || !messageText.trim() || sending) return;
    setSending(true);
    try {
      const text = messageText.trim();
      setMessageText("");
      await apiRequest(`/groups/${selectedGroup.id}/messages`, {
        method: "POST",
        token,
        body: JSON.stringify({ text }),
      });
      await loadGroupDetails(selectedGroup.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--app-background)] text-neutral-500 text-sm">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--app-accent,#25D366)] mr-2" />
        <span>Chargement de la communauté...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-h-0 bg-[var(--app-background)] overflow-hidden relative divide-x divide-[var(--app-border)] select-none">
      {/* ── COLONNE DE GAUCHE : LISTE DES GROUPES & COMMUNAUTÉS ── */}
      <div
        className={`w-full md:w-80 lg:w-96 flex-shrink-0 min-h-0 bg-[var(--app-surface)] flex flex-col ${
          selectedGroup ? "hidden md:flex" : "flex"
        } pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0`}
      >
        {/* Header Communauté */}
        <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-4 border-b border-[var(--app-border)] flex items-center justify-between bg-[var(--app-surface-raised)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[var(--app-accent,#25D366)]/15 text-[var(--app-accent,#25D366)] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">WhatsApp Style</div>
              <h2 className="font-black text-lg tracking-tight">Communauté & Groupes</h2>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[var(--app-accent,#25D366)] text-white text-xs font-bold hover:opacity-90 transition shadow-sm"
            title="Créer un groupe de discussion"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau</span>
          </button>
        </div>

        {/* Liste des Groupes */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--app-border)]">
          {loading && groups.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--app-accent,#25D366)]" />
              <span>Chargement de vos groupes...</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--app-surface-raised)] mx-auto flex items-center justify-center">
                <Users className="w-6 h-6 text-neutral-400" />
              </div>
              <div className="font-bold text-sm">Aucun groupe pour l'instant</div>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                Créez votre propre groupe de discussion privée ou rejoignez une communauté pour échanger à plusieurs.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[var(--app-accent,#25D366)] text-white text-xs font-bold hover:opacity-90 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Créer mon premier groupe</span>
              </button>
            </div>
          ) : (
            groups.map((group) => {
              const isSelected = selectedGroup?.id === group.id;
              const lastMsg = group.messages?.[0];
              return (
                <div
                  key={group.id}
                  onClick={() => loadGroupDetails(group.id)}
                  className={`flex items-center gap-3.5 p-4 cursor-pointer hover:bg-[var(--app-surface-soft)] transition ${
                    isSelected ? "bg-[var(--app-surface-raised)] border-l-4 border-l-[var(--app-accent,#25D366)]" : ""
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm">
                    <Hash className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm truncate">{group.name}</span>
                      <span className="text-[10px] text-neutral-400">
                        {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {lastMsg ? (
                        <span>
                          <strong className="text-[var(--app-foreground)]">{lastMsg.sender.displayName}: </strong>
                          {lastMsg.text || "Message"}
                        </span>
                      ) : (
                        group.description || `${group.members?.length || 1} membre(s)`
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── COLONNE DE DROITE : FIL DE DISCUSSION DU GROUPE ── */}
      <div
        className={`flex-1 flex flex-col min-h-0 h-full bg-[var(--app-background)] overflow-hidden ${
          !selectedGroup ? "hidden md:flex justify-center items-center text-neutral-500" : "flex fixed inset-0 z-40 md:relative md:z-auto md:inset-auto"
        }`}
      >
        {selectedGroup ? (
          <>
            {/* Header du Groupe */}
            <div className="flex items-center justify-between p-3.5 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3.5 border-b border-[var(--app-border)] bg-[var(--app-surface)] flex-shrink-0 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-[var(--app-surface-soft)] transition"
                  title="Retour aux groupes"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  <Hash className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{selectedGroup.name}</h4>
                  <p className="text-[11px] text-neutral-400 truncate">
                    {selectedGroup.members?.length || 1} membres • Groupe privé chiffré
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--app-accent,#25D366)]/10 text-[var(--app-accent,#25D366)] border border-[var(--app-accent,#25D366)]/20">
                  Groupe
                </span>
              </div>
            </div>

            {/* Corps des Messages du Groupe avec Fond d'écran */}
            <div
              style={getWallpaperContainerStyle(chatWallpaper, customPhotoUrl, wallpaperDimming)}
              className="flex-1 overflow-y-auto p-4 space-y-3.5 transition-all duration-300"
            >
              {groupMessages.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs">
                  Aucun message pour l&apos;instant dans ce groupe. Envoyez le premier message ! 👋
                </div>
              ) : (
                groupMessages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  const bubbleStyle = isMe ? getBubbleStyle(bubbleColor, customBubbleHex) : undefined;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-fadeIn`}
                    >
                      {!isMe && (
                        <span className="text-[10px] font-bold text-neutral-400 mb-0.5 px-2">
                          {msg.sender.displayName}
                        </span>
                      )}
                      <div
                        style={bubbleStyle}
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all duration-300 ${
                          isMe
                            ? !bubbleStyle
                              ? "bg-[var(--app-accent,#25D366)] text-white rounded-br-none"
                              : "rounded-br-none"
                            : "bg-[var(--app-surface-raised)] border border-[var(--app-border)] text-[var(--app-foreground)] rounded-bl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                        <span className="text-[9px] opacity-70 block text-right mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Barre de Saisie du Groupe */}
            <div className="p-3 border-t border-[var(--app-border)] bg-[var(--app-surface)] pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Écrire dans le groupe..."
                  className="flex-1 px-4 py-3 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-sm outline-none focus:border-[var(--app-accent,#25D366)] transition shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="w-11 h-11 rounded-full bg-[var(--app-accent,#25D366)] text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition shadow-md disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="p-8 text-center space-y-3">
            <Users className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-700" />
            <div className="font-bold text-base">Sélectionnez ou créez un groupe</div>
            <p className="text-xs text-neutral-400 max-w-sm">
              Communiquez avec plusieurs personnes simultanément dans un salon de discussion sécurisé.
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL CRÉATION DE GROUPE ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[32px] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--app-accent,#25D366)]" />
                <h3 className="font-black text-base">Nouveau groupe de discussion</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-[var(--app-foreground)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1">Nom du groupe *</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ex: Club Privé, Salon VIP..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-sm outline-none focus:border-[var(--app-accent,#25D366)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1">Description (optionnelle)</label>
                <input
                  type="text"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Sujet ou règles du groupe..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-sm outline-none focus:border-[var(--app-accent,#25D366)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1">
                  Ajouter des membres ({selectedMemberIds.length} sélectionné(s))
                </label>
                {availableContacts.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic p-3 bg-[var(--app-surface-raised)] rounded-2xl">
                    Suivez d'autres membres pour pouvoir les ajouter à votre groupe.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto p-1">
                    {availableContacts.map((contact) => {
                      const isSelected = selectedMemberIds.includes(contact.id);
                      return (
                        <div
                          key={contact.id}
                          onClick={() => toggleMemberSelection(contact.id)}
                          className={`flex items-center justify-between p-2.5 rounded-2xl border border-[var(--app-border)] cursor-pointer transition ${
                            isSelected
                              ? "bg-[var(--app-accent,#25D366)]/15 border-[var(--app-accent,#25D366)]"
                              : "bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-soft)]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-xs">
                              {contact.displayName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-xs truncate">{contact.displayName}</span>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                              isSelected
                                ? "bg-[var(--app-accent,#25D366)] border-[var(--app-accent,#25D366)] text-white"
                                : "border-neutral-400"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[var(--app-border)]">
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || creatingGroup}
                className="flex-1 py-3 rounded-2xl bg-[var(--app-accent,#25D366)] hover:opacity-90 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {creatingGroup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <span>Créer le groupe</span>
                )}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-xs font-bold hover:bg-[var(--app-surface-soft)] transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
