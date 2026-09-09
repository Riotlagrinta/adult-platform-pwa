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
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (target: CallPartner, isVideo?: boolean) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();

  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [partner, setPartner] = useState<CallPartner | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const partnerRef = useRef<CallPartner | null>(null);
  const callDurationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronisation des refs
  useEffect(() => {
    partnerRef.current = partner;
  }, [partner]);

  const cleanupCall = useCallback(() => {
    stopRingtone();
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

    setRemoteStream(null);
    setCallStatus("idle");
    setPartner(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoEnabled(true);
  }, []);

  // Décrocher et acquérir les flux micro / caméra
  const acquireMedia = async (video: boolean): Promise<MediaStream | null> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Les appels audio/vidéo ne sont pas supportés sur ce navigateur.");
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
      console.error("Erreur accès micro/caméra:", err);
      alert(
        video
          ? "Impossible d'accéder à la caméra ou au micro. Veuillez autoriser les permissions."
          : "Impossible d'accéder au microphone. Veuillez autoriser les permissions."
      );
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
        setCallStatus("connected");
        // Démarrage du chronomètre
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
        playEndCallTone();
        cleanupCall();
      }
    };

    return pc;
  };

  // ── Démarrer un Appel Sortant ─────────────────────────────────────────
  const startCall = async (target: CallPartner, video = false) => {
    if (!token || !user) return;
    haptics.medium();
    setIsVideo(video);
    setPartner(target);
    setCallStatus("calling");
    playRingtone();

    const stream = await acquireMedia(video);
    if (!stream) {
      cleanupCall();
      return;
    }

    const socket = getSocket(token);
    socket.emit("call:initiate", {
      targetUserId: target.id,
      isVideo: video,
    }, (res: { ok: boolean; error?: string }) => {
      if (!res?.ok) {
        alert(res?.error || "Impossible de joindre cet utilisateur.");
        playEndCallTone();
        cleanupCall();
      }
    });
  };

  // ── Accepter un Appel Entrant ─────────────────────────────────────────
  const acceptCall = async () => {
    const currentPartner = partnerRef.current;
    if (!currentPartner || !token) return;
    haptics.success();
    stopRingtone();

    const stream = await acquireMedia(isVideo);
    if (!stream) {
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
    playEndCallTone();
    cleanupCall();
  };

  // ── Raccrocher / Mettre fin à l'Appel ──────────────────────────────────
  const endCall = () => {
    const currentPartner = partnerRef.current;
    if (currentPartner && token) {
      haptics.medium();
      const socket = getSocket(token);
      socket.emit("call:end", { targetUserId: currentPartner.id });
    }
    playEndCallTone();
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
      // Si déjà en appel, ignorer ou occuper
      if (callStatus !== "idle") {
        socket.emit("call:reject", { callerId: data.callerId, reason: "busy" });
        return;
      }

      setPartner({
        id: data.callerId,
        displayName: data.callerName,
        avatarUrl: data.callerAvatar,
      });
      setIsVideo(data.isVideo);
      setCallStatus("incoming");
      playRingtone();
      haptics.heavy();
    };

    // 2. L'appelé a accepté l'appel -> L'appelant génère l'offre WebRTC
    const handleCallAccepted = async (data: { recipientId: string }) => {
      stopRingtone();
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
        console.error("Erreur création offre WebRTC:", err);
      }
    };

    // 3. L'appel a été refusé
    const handleCallRejected = () => {
      alert("L'appel a été refusé ou l'utilisateur est occupé.");
      playEndCallTone();
      cleanupCall();
    };

    // 4. L'utilisateur est indisponible / hors ligne
    const handleCallUnavailable = () => {
      alert("L'utilisateur est actuellement indisponible ou hors ligne.");
      playEndCallTone();
      cleanupCall();
    };

    // 5. L'interlocuteur a raccroché
    const handleCallEnded = () => {
      playEndCallTone();
      cleanupCall();
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
        console.error("Erreur signal WebRTC:", err);
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
  }, [token, callStatus, isVideo, cleanupCall]);

  return (
    <CallContext.Provider
      value={{
        callStatus,
        partner,
        isVideo,
        isMuted,
        isVideoEnabled,
        callDuration,
        localStream,
        remoteStream,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
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
