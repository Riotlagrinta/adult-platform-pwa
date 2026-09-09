"use client";

import React, { useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { useCall } from "@/context/CallContext";
import { toPublicUrl } from "@/lib/api";

export default function CallModal() {
  const {
    callStatus,
    partner,
    isVideo,
    isMuted,
    isVideoEnabled,
    callDuration,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Attachement du flux local (caméra utilisateur)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus, isVideo]);

  // Attachement du flux distant (caméra / audio partenaire)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus, isVideo]);

  if (callStatus === "idle") {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const partnerInitials = (partner?.displayName ?? "??").slice(0, 2).toUpperCase();
  const avatarUrl = partner?.avatarUrl ? toPublicUrl(partner.avatarUrl) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      {/* Audio distant pour garantir le son en toutes circonstances */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* CAS 1 : Appel Entrant (Incoming) */}
      {callStatus === "incoming" && (
        <div className="w-full max-w-sm mx-4 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 text-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-scaleUp">
          {/* Avatar avec halo pulsant */}
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
            Connexion directe sécurisée de bout en bout. Votre numéro reste strictement privé.
          </p>

          {/* Boutons Décrocher / Raccrocher */}
          <div className="flex items-center justify-center gap-8 mt-8 w-full">
            {/* Bouton Refuser */}
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

            {/* Bouton Accepter */}
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

      {/* CAS 2 : Appel Sortant (Calling - en attente de réponse) */}
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
          <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1.5">
            {isVideo ? <Video className="w-4 h-4 text-cyan-400" /> : <Phone className="w-4 h-4 text-cyan-400" />}
            <span>Appel en cours... Sonnerie</span>
          </p>

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
          {/* Header de l'appel : Statut et Durée */}
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
                <span className="text-xs text-emerald-400 font-mono font-medium drop-shadow">
                  {formatDuration(callDuration)}
                </span>
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

                {/* Si pas encore de vidéo distante ou caméra coupée par le partenaire */}
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

          {/* Barre d'outils inférieure : Mute, Vidéo, Raccrocher */}
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
        <div className="w-full max-w-xs mx-4 bg-neutral-900 border border-neutral-800 text-white rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center animate-scaleUp">
          <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
            <PhoneOff className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-base">Appel terminé</h4>
          <p className="text-xs text-neutral-400 mt-1">
            {callDuration > 0 ? `Durée : ${formatDuration(callDuration)}` : "L'appel a pris fin"}
          </p>
        </div>
      )}
    </div>
  );
}
