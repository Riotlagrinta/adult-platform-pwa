"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Headphones,
  Bell,
  X,
} from "lucide-react";
import { useCall } from "@/context/CallContext";
import { toPublicUrl } from "@/lib/api";
import { dismissActivePushNotifications } from "@/lib/push";

export default function CallModal() {
  const {
    callStatus,
    partner,
    isVideo,
    isMuted,
    isVideoEnabled,
    callDuration,
    endReason,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    isSpeakerOn,
    toggleSpeaker,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const earpieceAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakerVideoRef = useRef<HTMLVideoElement | null>(null);

  // Nom de l'appareil Bluetooth / AirPods connecté si détecté
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState<string | null>(null);

  // 1. Détection des périphériques Bluetooth / AirPods / Casques
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;

    const checkAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const bt = devices.find(
          (d) =>
            d.kind === "audiooutput" &&
            (d.label.toLowerCase().includes("bluetooth") ||
              d.label.toLowerCase().includes("airpod") ||
              d.label.toLowerCase().includes("buds") ||
              d.label.toLowerCase().includes("headset") ||
              d.label.toLowerCase().includes("casque") ||
              d.label.toLowerCase().includes("écouteur"))
        );
        if (bt && bt.label) {
          setBluetoothDeviceName(bt.label);
        } else {
          setBluetoothDeviceName(null);
        }
      } catch (e) {
        console.warn("Échec détection périphériques audio:", e);
      }
    };

    checkAudioDevices();
    navigator.mediaDevices.addEventListener("devicechange", checkAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", checkAudioDevices);
    };
  }, []);

  // 2. Attachement du flux local (caméra utilisateur)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus, isVideo]);

  // 3. Routage Physique Audio Mobile (Haut-Parleur vs Écouteur vs AirPods)
  useEffect(() => {
    if (!remoteStream) {
      if (earpieceAudioRef.current) earpieceAudioRef.current.srcObject = null;
      if (speakerVideoRef.current) speakerVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      return;
    }

    if (isVideo) {
      // En appel vidéo : affichage sur le remoteVideoRef
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        // Si haut-parleur désactivé, couper le son de la vidéo et router vers l'écouteur d'oreille
        if (!isSpeakerOn) {
          remoteVideoRef.current.muted = true;
          if (earpieceAudioRef.current) {
            earpieceAudioRef.current.srcObject = remoteStream;
            earpieceAudioRef.current.muted = false;
          }
        } else {
          remoteVideoRef.current.muted = false;
          if (earpieceAudioRef.current) {
            earpieceAudioRef.current.srcObject = null;
          }
        }
      }
    } else {
      // En appel audio pur :
      if (isSpeakerOn) {
        // En mode Haut-parleur : jouer sur l'élément vidéo caché force Android/iOS en mode Multimédia Haut-Parleur !
        if (speakerVideoRef.current) {
          speakerVideoRef.current.srcObject = remoteStream;
          speakerVideoRef.current.muted = false;
        }
        if (earpieceAudioRef.current) {
          earpieceAudioRef.current.srcObject = null;
        }
      } else {
        // En mode Écouteur : jouer sur l'élément audio force Android/iOS en mode Téléphonie Écouteur d'oreille !
        if (earpieceAudioRef.current) {
          earpieceAudioRef.current.srcObject = remoteStream;
          earpieceAudioRef.current.muted = false;
        }
        if (speakerVideoRef.current) {
          speakerVideoRef.current.srcObject = null;
        }
      }
    }
  }, [remoteStream, isSpeakerOn, isVideo, callStatus]);

  // 4. Fermer les notifications push associées à l'appel dès qu'on décroche ou raccroche
  useEffect(() => {
    if (callStatus === "connected" || callStatus === "ended") {
      if (partner?.id) {
        void dismissActivePushNotifications({ tag: `call-${partner.id}` });
      }
    }
  }, [callStatus, partner?.id]);

  if (callStatus === "idle") {
    return null;
  }

  // 5. Gestionnaire de bascule audio avec support natif selectAudioOutput() (AirPods/Bluetooth)
  const handleAudioRoutingClick = async () => {
    // Si l'API W3C selectAudioOutput est disponible (Chromium Android / Edge / Chrome)
    if (
      typeof navigator !== "undefined" &&
      "mediaDevices" in navigator &&
      "selectAudioOutput" in navigator.mediaDevices
    ) {
      try {
        const selected = await (navigator.mediaDevices as any).selectAudioOutput();
        if (selected?.deviceId) {
          const activeEl = isVideo ? remoteVideoRef.current : (isSpeakerOn ? speakerVideoRef.current : earpieceAudioRef.current);
          if (activeEl && typeof (activeEl as any).setSinkId === "function") {
            await (activeEl as any).setSinkId(selected.deviceId);
          }
          const isLoudspeaker =
            selected.label.toLowerCase().includes("speaker") ||
            selected.label.toLowerCase().includes("haut-parleur") ||
            selected.label.toLowerCase().includes("loudspeaker");
          if (isLoudspeaker !== isSpeakerOn) {
            toggleSpeaker();
          }
          return;
        }
      } catch (err: any) {
        // Si l'utilisateur annule le sélecteur, ne rien faire
        if (err.name === "AbortError" || err.name === "NotAllowedError") return;
      }
    }

    // Bascule classique Haut-parleur <-> Écouteur
    toggleSpeaker();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const partnerInitials = (partner?.displayName ?? "??").slice(0, 2).toUpperCase();
  const avatarUrl = partner?.avatarUrl ? toPublicUrl(partner.avatarUrl) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      {/* Élément audio pour mode Écouteur d'oreille / Téléphonie discrète */}
      <audio ref={earpieceAudioRef} autoPlay playsInline />

      {/* Élément vidéo invisible forçant la sortie Haut-Parleur sur mobile en appel vocal */}
      <video ref={speakerVideoRef} autoPlay playsInline className="hidden" />

      {/* CAS 1 : Appel Entrant (Incoming) */}
      {callStatus === "incoming" && (
        <div className="w-full max-w-sm mx-4 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 text-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-scaleUp">
          <div className="relative my-6">
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <span className="absolute -inset-3 rounded-full bg-emerald-500/10 animate-pulse" />
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-500 shadow-xl bg-neutral-800 flex items-center justify-center text-2xl font-bold">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={partner?.displayName} className="w-full h-full object-cover" />
              ) : (
                partnerInitials
              )}
            </div>
          </div>

          <h3 className="text-xl font-black tracking-tight">{partner?.displayName ?? "Membre OnlyAdults"}</h3>
          <p className="text-sm text-emerald-400 font-medium mt-1 flex items-center gap-1.5 animate-pulse">
            {isVideo ? <Video className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isVideo ? "Appel vidéo entrant..." : "Appel vocal entrant..."}</span>
          </p>

          <p className="text-xs text-neutral-400 mt-4 px-4">
            Connexion directe chiffrée P2P. Votre numéro reste strictement confidentiel.
          </p>

          {/* Boutons Décrocher / Raccrocher */}
          <div className="flex items-center justify-center gap-8 mt-8 w-full">
            <button
              type="button"
              onClick={rejectCall}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-rose-600 group-hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-rose-600/30">
                <PhoneOff className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs text-neutral-300 font-medium">Refuser</span>
            </button>

            <button
              type="button"
              onClick={acceptCall}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500 group-hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-bounce">
                <Phone className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs text-emerald-400 font-bold">Décrocher</span>
            </button>
          </div>
        </div>
      )}

      {/* CAS 2 : Appel Sortant (Calling - en cours de sonnerie) */}
      {callStatus === "calling" && (
        <div className="w-full max-w-sm mx-4 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 text-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-scaleUp">
          <div className="relative my-6">
            <span className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
            <span className="absolute -inset-4 rounded-full bg-cyan-500/10 animate-pulse" />
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-cyan-500 shadow-xl bg-neutral-800 flex items-center justify-center text-2xl font-bold">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={partner?.displayName} className="w-full h-full object-cover" />
              ) : (
                partnerInitials
              )}
            </div>
          </div>

          <h3 className="text-xl font-black tracking-tight">{partner?.displayName ?? "Membre OnlyAdults"}</h3>
          <p className="text-sm text-cyan-400 font-semibold mt-1 flex items-center gap-1.5 animate-pulse">
            {isVideo ? <Video className="w-4 h-4 text-cyan-400" /> : <Phone className="w-4 h-4 text-cyan-400" />}
            <span>Appel en cours... Sonnerie</span>
          </p>

          <div className="mt-3 px-4 py-2 rounded-xl bg-neutral-800/60 border border-neutral-700/50 text-[11px] text-neutral-300 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>Notification envoyée à votre interlocuteur</span>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={endCall}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-rose-600 group-hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-rose-600/30">
                <PhoneOff className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs text-neutral-300 font-medium">Annuler</span>
            </button>
          </div>
        </div>
      )}

      {/* CAS 3 : Appel Connecté (Connected) */}
      {callStatus === "connected" && (
        <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-neutral-950 text-white">
          {/* Header de l'appel : Statut, Durée et Périphérique Audio */}
          <div className="absolute top-0 inset-x-0 z-30 p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-neutral-800 flex items-center justify-center text-sm font-bold">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={partner?.displayName} className="w-full h-full object-cover" />
                ) : (
                  partnerInitials
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm leading-none drop-shadow">{partner?.displayName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-emerald-400 font-mono font-medium drop-shadow">
                    {formatDuration(callDuration)}
                  </span>
                  {bluetoothDeviceName && (
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Headphones className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{bluetoothDeviceName}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Chiffré P2P</span>
            </div>
          </div>

          {/* Zone Centrale : Vidéo ou Visuel Audio */}
          <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
            {isVideo ? (
              <>
                {/* Vidéo Distante (Plein écran) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 backdrop-blur-sm">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-neutral-700 bg-neutral-800 flex items-center justify-center text-2xl font-bold mb-3 shadow-xl">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={partner?.displayName} className="w-full h-full object-cover" />
                      ) : (
                        partnerInitials
                      )}
                    </div>
                    <p className="text-sm text-neutral-400">Caméra du correspondant désactivée</p>
                  </div>
                )}

                {/* Vidéo Locale (Incrustation PiP en bas à droite) */}
                <div className="absolute bottom-28 right-4 z-20 w-28 sm:w-36 h-40 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-neutral-900 group">
                  {isVideoEnabled ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-800 text-neutral-400 text-xs gap-1">
                      <VideoOff className="w-5 h-5" />
                      <span>Caméra coupée</span>
                    </div>
                  )}
                  <span className="absolute bottom-1 left-2 text-[10px] font-bold text-white/80 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur">
                    Moi
                  </span>
                </div>
              </>
            ) : (
              /* Interface Appel Audio pur */
              <div className="flex flex-col items-center justify-center gap-6 p-6">
                <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                  <span className="absolute -inset-6 rounded-full bg-emerald-500/10 animate-pulse" />
                  <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-emerald-500 shadow-2xl bg-neutral-800 flex items-center justify-center text-4xl font-bold">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={partner?.displayName} className="w-full h-full object-cover" />
                    ) : (
                      partnerInitials
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-2xl font-black">{partner?.displayName}</h3>
                  <p className="text-emerald-400 text-sm font-mono mt-1">{formatDuration(callDuration)}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {isSpeakerOn ? "📢 Haut-parleur actif" : "📱 Écouteur discret actif"}
                  </p>
                </div>

                {/* Ondes sonores visuelles */}
                <div className="flex items-center gap-1.5 h-8">
                  {[40, 70, 30, 90, 60, 100, 45, 80, 50, 65].map((height, idx) => (
                    <span
                      key={idx}
                      className="w-1 bg-emerald-500 rounded-full animate-pulse"
                      style={{
                        height: `${height}%`,
                        animationDelay: `${idx * 0.1}s`,
                        animationDuration: "1s",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Barre d'outils inférieure : Mute, Haut-Parleur, Vidéo, Raccrocher */}
          <div className="relative z-30 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-center gap-4 sm:gap-6">
            {/* Bouton Mute Micro */}
            <button
              type="button"
              onClick={toggleMute}
              className={`p-4 rounded-full transition active:scale-95 cursor-pointer ${
                isMuted
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
              }`}
              title={isMuted ? "Réactiver le micro" : "Couper le micro"}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* Bouton Haut-Parleur / Sortie Audio (AirPods, Bluetooth, Haut-parleur) */}
            <button
              type="button"
              onClick={handleAudioRoutingClick}
              className={`p-4 rounded-full transition active:scale-95 cursor-pointer flex items-center justify-center ${
                isSpeakerOn
                  ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/50 shadow-lg shadow-emerald-500/30"
                  : "bg-white/10 hover:bg-white/20 text-white/70 border border-white/10"
              }`}
              title={
                isSpeakerOn
                  ? "Haut-parleur actif (toucher pour écouteur ou Bluetooth)"
                  : "Écouteur actif (toucher pour haut-parleur)"
              }
            >
              {bluetoothDeviceName ? (
                <Headphones className="w-6 h-6 text-cyan-400" />
              ) : isSpeakerOn ? (
                <Volume2 className="w-6 h-6" />
              ) : (
                <VolumeX className="w-6 h-6" />
              )}
            </button>

            {/* Bouton Couper/Activer la Caméra (disponible en mode vidéo) */}
            {isVideo && (
              <button
                type="button"
                onClick={toggleVideo}
                className={`p-4 rounded-full transition active:scale-95 cursor-pointer ${
                  !isVideoEnabled
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                }`}
                title={isVideoEnabled ? "Couper la caméra" : "Activer la caméra"}
              >
                {!isVideoEnabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}

            {/* Bouton Raccrocher */}
            <button
              type="button"
              onClick={endCall}
              className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-xl shadow-rose-600/40 transition cursor-pointer"
              title="Terminer l'appel"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      {/* CAS 4 : Fin d'appel (Ended) */}
      {callStatus === "ended" && (
        <div className="relative w-full max-w-xs mx-4 bg-neutral-900 border border-neutral-800 text-white rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center animate-scaleUp">
          <button
            type="button"
            onClick={endCall}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
            <PhoneOff className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-base">Appel terminé</h4>
          <p className="text-xs text-neutral-300 mt-1.5 font-medium">
            {endReason || (callDuration > 0 ? `Durée : ${formatDuration(callDuration)}` : "L'appel a pris fin")}
          </p>
        </div>
      )}
    </div>
  );
}
