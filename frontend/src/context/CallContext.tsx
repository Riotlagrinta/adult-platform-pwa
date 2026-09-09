"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSocket } from "@/lib/socket";
import { RTC_CONFIG, playRingtone, stopRingtone, playEndCallTone } from "@/lib/webrtc";
import { haptics } from "@/lib/haptics";

export type CallStatus = "idle" | "calling" | "incoming" | "connected" | "ended";

export interface CallPartner {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface CallContextType {
  callStatus: CallStatus;
  partner: CallPartner | null;
  isVideo: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callDuration: number;
  endReason: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (target: CallPartner, isVideo?: boolean) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  isSpeakerOn: boolean;
  toggleSpeaker: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();

  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [partner, setPartner] = useState<CallPartner | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [endReason, setEndReason] = useState<string | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const partnerRef = useRef<CallPartner | null>(null);
  const callStatusRef = useRef<CallStatus>("idle");
  const isVideoRef = useRef(false);

  const callDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ringingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronisation des refs pour éviter toute closure obsolète
  useEffect(() => {
    partnerRef.current = partner;
  }, [partner]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    isVideoRef.current = isVideo;
  }, [isVideo]);

  // Nettoyage complet et retour à l'état inactif
  const cleanupCall = useCallback(() => {
    stopRingtone();

    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }

    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }

    if (callDurationTimerRef.current) {
      clearInterval(callDurationTimerRef.current);
      callDurationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus("idle");
    setPartner(null);
    setCallDuration(0);
    setEndReason(null);
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIsSpeakerOn(true);
  }, []);

  // Affichage d'une fin d'appel propre avec raison sans jamais bloquer l'UI
  const closeWithFeedback = useCallback((reason: string, playTone = true) => {
    stopRingtone();

    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }

    if (callDurationTimerRef.current) {
      clearInterval(callDurationTimerRef.current);
      callDurationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setEndReason(reason);
    setCallStatus("ended");

    if (playTone) {
      playEndCallTone();
    }

    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
    }
    autoCloseTimeoutRef.current = setTimeout(() => {
      cleanupCall();
    }, 2000);
  }, [cleanupCall]);

  // Décrocher et acquérir les flux micro / caméra
  const acquireMedia = async (video: boolean): Promise<MediaStream | null> => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        return null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: video
          ? {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.warn("Erreur accès micro/caméra:", err);
      return null;
    }
  };

  // Création de l'instance RTCPeerConnection avec négociation P2P
  const createPeerConnection = (targetUserId: string): RTCPeerConnection => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const socket = token ? getSocket(token) : null;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Ajout des pistes locales
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Réception des pistes distantes
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        setRemoteStream(stream);
      }
    };

    // Échange des candidats ICE
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("call:signal", {
          targetUserId,
          signal: { candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        stopRingtone();
        if (ringingTimeoutRef.current) {
          clearTimeout(ringingTimeoutRef.current);
          ringingTimeoutRef.current = null;
        }
        setCallStatus("connected");
        if (!callDurationTimerRef.current) {
          callDurationTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        closeWithFeedback("Connexion interrompue");
      }
    };

    return pc;
  };

  // ── Démarrer un Appel Sortant ─────────────────────────────────────────
  const startCall = async (target: CallPartner, video = false) => {
    if (!token || !user) return;
    if (callStatusRef.current !== "idle") return;

    haptics.medium();
    setIsVideo(video);
    setPartner(target);
    setCallStatus("calling");
    setEndReason(null);
    playRingtone();

    // Délai d'attente de sonnerie de 45 secondes (si l'interlocuteur ne décroche pas)
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
    }
    ringingTimeoutRef.current = setTimeout(() => {
      closeWithFeedback("Pas de réponse");
    }, 45000);

    // Initialisation des périphériques audio/vidéo
    const stream = await acquireMedia(video);
    if (!stream) {
      closeWithFeedback(video ? "Accès à la caméra ou au microphone refusé." : "Accès au microphone refusé.");
      return;
    }

    // Émission du signal d'appel
    const socket = getSocket(token);
    socket.emit(
      "call:initiate",
      {
        targetUserId: target.id,
        isVideo: video,
      },
      (res: { ok: boolean; error?: string }) => {
        if (!res?.ok) {
          closeWithFeedback(res?.error || "Impossible d'établir la communication.");
        }
      }
    );
  };

  // ── Accepter un Appel Entrant ─────────────────────────────────────────
  const acceptCall = async () => {
    const currentPartner = partnerRef.current;
    if (!currentPartner || !token) return;

    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }

    haptics.success();
    stopRingtone();

    const stream = await acquireMedia(isVideoRef.current);
    if (!stream) {
      closeWithFeedback("Accès au microphone requis pour décrocher.");
      rejectCall();
      return;
    }

    const pc = createPeerConnection(currentPartner.id);
    const socket = getSocket(token);

    socket.emit("call:accept", { callerId: currentPartner.id });
    setCallStatus("connected");

    if (!callDurationTimerRef.current) {
      callDurationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  // ── Refuser un Appel Entrant ──────────────────────────────────────────
  const rejectCall = () => {
    const currentPartner = partnerRef.current;
    if (currentPartner && token) {
      haptics.light();
      const socket = getSocket(token);
      socket.emit("call:reject", { callerId: currentPartner.id });
    }
    closeWithFeedback("Appel refusé");
  };

  // ── Raccrocher / Mettre fin à l'Appel (Annuler) ────────────────────────
  const endCall = () => {
    const currentPartner = partnerRef.current;
    if (currentPartner && token) {
      haptics.medium();
      const socket = getSocket(token);
      socket.emit("call:end", { targetUserId: currentPartner.id });
    }
    // Nettoyage immédiat sans blocage pour une réactivité instantanée
    cleanupCall();
  };

  // ── Contrôle Micro (Mute / Unmute) ────────────────────────────────────
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        haptics.light();
      }
    }
  };

  // ── Contrôle Caméra (Enable / Disable) ─────────────────────────────────
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        haptics.light();
      }
    }
  };

  // ── Contrôle Haut-Parleur (Speakerphone) ──────────────────────────────
  const toggleSpeaker = () => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      haptics.light();
      return next;
    });
  };

  // ── Écoute des événements Socket.io Signaling ─────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    // 1. Appel entrant
    const handleIncomingCall = (data: {
      callerId: string;
      callerName: string;
      callerAvatar?: string | null;
      isVideo: boolean;
    }) => {
      // Si déjà en communication, renvoyer occupé
      if (callStatusRef.current !== "idle") {
        socket.emit("call:reject", { callerId: data.callerId, reason: "busy" });
        return;
      }

      setPartner({
        id: data.callerId,
        displayName: data.callerName,
        avatarUrl: data.callerAvatar,
      });
      setIsVideo(Boolean(data.isVideo));
      setCallStatus("incoming");
      playRingtone();
      haptics.heavy();
    };

    // 2. L'appelé a accepté l'appel -> L'appelant génère l'offre WebRTC
    const handleCallAccepted = async (data: { recipientId: string }) => {
      stopRingtone();
      if (ringingTimeoutRef.current) {
        clearTimeout(ringingTimeoutRef.current);
        ringingTimeoutRef.current = null;
      }
      setCallStatus("connected");

      const pc = createPeerConnection(data.recipientId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:signal", {
          targetUserId: data.recipientId,
          signal: { sdp: pc.localDescription },
        });
      } catch (err) {
        console.warn("Erreur création offre WebRTC:", err);
      }
    };

    // 3. L'appel a été refusé
    const handleCallRejected = (data: { reason?: string }) => {
      const reasonText = data?.reason === "busy" ? "L'interlocuteur est déjà en ligne" : "L'appel a été refusé";
      closeWithFeedback(reasonText);
    };

    // 4. L'utilisateur est indisponible
    const handleCallUnavailable = () => {
      closeWithFeedback("L'interlocuteur est indisponible");
    };

    // 5. L'interlocuteur a raccroché
    const handleCallEnded = () => {
      closeWithFeedback("L'interlocuteur a raccroché");
    };

    // 6. Échange de signalisation WebRTC (Offer / Answer / ICE)
    const handleCallSignal = async (data: { senderId: string; signal: any }) => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (data.signal?.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
          // Si c'est une offre reçue par l'appelé, il génère une réponse (Answer)
          if (data.signal.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("call:signal", {
              targetUserId: data.senderId,
              signal: { sdp: pc.localDescription },
            });
          }
        } else if (data.signal?.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        }
      } catch (err) {
        console.warn("Erreur signal WebRTC:", err);
      }
    };

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:unavailable", handleCallUnavailable);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:signal", handleCallSignal);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:unavailable", handleCallUnavailable);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:signal", handleCallSignal);
    };
  }, [token, closeWithFeedback]);

  return (
    <CallContext.Provider
      value={{
        callStatus,
        partner,
        isVideo,
        isMuted,
        isVideoEnabled,
        callDuration,
        endReason,
        localStream,
        remoteStream,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        isSpeakerOn,
        toggleSpeaker,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
