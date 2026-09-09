"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, RefreshCw, Mic, Loader2 } from "lucide-react";
import { toPublicUrl } from "@/lib/api";
import { haptics } from "@/lib/haptics";

type VoicePlayerProps = {
  url: string;
  durationSeconds?: number | null;
  isMe?: boolean;
};

// Global audio singleton to ensure only ONE voice note plays at any time across the entire application
let globalPlayingAudio: HTMLAudioElement | null = null;
let globalStopCallback: (() => void) | null = null;

export default function VoicePlayer({ url, durationSeconds = 0, isMe = false }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(() => {
    return durationSeconds && isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;
  });
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolvedUrl = useMemo(() => {
    if (!url) return "";
    return toPublicUrl(url) || url;
  }, [url]);

  // Durée effective robuste (résout le problème Infinity/NaN des enregistrements MediaRecorder WebM/Opus)
  const effectiveDuration = useMemo(() => {
    if (totalDuration && isFinite(totalDuration) && totalDuration > 0) {
      return totalDuration;
    }
    if (durationSeconds && isFinite(durationSeconds) && durationSeconds > 0) {
      return durationSeconds;
    }
    if (currentTime && isFinite(currentTime) && currentTime > 0) {
      return currentTime;
    }
    return 1;
  }, [totalDuration, durationSeconds, currentTime]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || !isFinite(secs) || secs < 0) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Generate 26 deterministic bars for WhatsApp-like visual waveform
  const waveformBars = useMemo(() => {
    let hash = 0;
    const cleanSeed = url ? url.split("?")[0] : "voice";
    for (let i = 0; i < cleanSeed.length; i++) {
      hash = (hash << 5) - hash + cleanSeed.charCodeAt(i);
      hash |= 0;
    }
    const bars: number[] = [];
    const barCount = 26;
    for (let i = 0; i < barCount; i++) {
      const pseudo = Math.abs(Math.sin(hash + i * 1.8) * 0.65 + Math.cos(hash * 0.4 + i * 2.2) * 0.35);
      bars.push(Math.max(18, Math.round(pseudo * 100)));
    }
    return bars;
  }, [url]);

  // Réinitialiser en cas de changement d'URL
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    setIsLoading(false);
    setHasError(false);
    setErrorMessage(null);
    if (durationSeconds && isFinite(durationSeconds) && durationSeconds > 0) {
      setTotalDuration(durationSeconds);
    }
  }, [resolvedUrl, durationSeconds]);

  // Cleanup singleton au démontage
  useEffect(() => {
    return () => {
      if (globalPlayingAudio === audioRef.current) {
        globalPlayingAudio = null;
        globalStopCallback = null;
      }
    };
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const togglePlayPause = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;

    setHasError(false);
    setErrorMessage(null);

    if (isPlaying) {
      haptics.light();
      audio.pause();
      setIsPlaying(false);
      setIsLoading(false);
    } else {
      haptics.light();
      // Mettre en pause tout autre audio en cours de lecture
      if (globalPlayingAudio && globalPlayingAudio !== audio) {
        globalPlayingAudio.pause();
        if (globalStopCallback) {
          globalStopCallback();
        }
      }

      globalPlayingAudio = audio;
      globalStopCallback = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };

      try {
        setIsLoading(true);
        audio.playbackRate = playbackRate;
        if (audio.error || audio.readyState === 0 || !audio.currentSrc) {
          audio.load();
        }
        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
      } catch (err: any) {
        console.error("Audio playback error:", err);
        // Ne pas afficher d'erreur si la lecture a simplement été annulée par une pause volontaire
        if (err?.name !== "AbortError") {
          setHasError(true);
          setErrorMessage("Impossible de lire ce message vocal");
        }
        setIsPlaying(false);
        setIsLoading(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    if (isFinite(current) && current >= 0) {
      setCurrentTime(current);
    }

    const dur = audioRef.current.duration;
    if (dur && isFinite(dur) && dur > 0 && dur > totalDuration) {
      setTotalDuration(dur);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    if (dur && isFinite(dur) && dur > 0) {
      setTotalDuration(dur);
    }
    setHasError(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audio = audioRef.current;
    console.warn("Erreur de chargement audio:", resolvedUrl, audio?.error);
    // Marquer l'erreur seulement si l'audio était en tentative de lecture
    if (isPlaying || isLoading) {
      setHasError(true);
      setErrorMessage("Échec de chargement audio");
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.selection();
    const rates = [1, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const seekToPosition = (clientX: number) => {
    if (!waveformContainerRef.current || !audioRef.current) return;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    const clickRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = clickRatio * effectiveDuration;

    if (isFinite(targetTime) && targetTime >= 0) {
      try {
        audioRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
      } catch (err) {
        console.warn("Seek error:", err);
      }
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    seekToPosition(e.clientX);
  };

  const progressPercent = effectiveDuration > 0
    ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100))
    : 0;

  return (
    <div className={`flex items-center gap-2.5 py-1 select-none min-w-[220px] sm:min-w-[270px] max-w-full ${isMe ? "text-inherit" : "text-inherit"}`}>
      <audio
        ref={audioRef}
        src={resolvedUrl}
        preload="metadata"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
      />

      {/* Bouton Lecture / Pause / Retry */}
      <button
        type="button"
        onClick={togglePlayPause}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-sm ${
          hasError
            ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
            : isMe
            ? "bg-[color-mix(in_srgb,var(--app-foreground)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--app-foreground)_28%,transparent)] text-current"
            : "bg-[var(--app-accent,#25D366)] text-white hover:brightness-110"
        }`}
        title={hasError ? "Réessayer la lecture" : isPlaying ? "Mettre en pause" : "Écouter le message vocal"}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : hasError ? (
          <RefreshCw className="w-4 h-4" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform & Scrubber Interactif */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div
          ref={waveformContainerRef}
          onClick={handleWaveformClick}
          className="h-7 flex items-center gap-[2.5px] cursor-pointer relative group py-1"
          title="Naviguer dans le vocal"
        >
          {waveformBars.map((barHeight, idx) => {
            const barProgress = ((idx + 0.5) / waveformBars.length) * 100;
            const isPlayed = barProgress <= progressPercent;

            return (
              <div
                key={idx}
                className="flex-1 rounded-full transition-all duration-75 min-w-[2px]"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: isPlayed
                    ? isMe
                      ? "currentColor"
                      : "var(--app-accent, #25D366)"
                    : isMe
                    ? "color-mix(in srgb, currentColor 30%, transparent)"
                    : "color-mix(in srgb, var(--app-foreground) 25%, transparent)",
                }}
              />
            );
          })}
        </div>

        {/* Minuteur & Sélecteur de Vitesse */}
        <div className="flex items-center justify-between text-[10px] font-mono opacity-80 leading-none">
          <span>{isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(effectiveDuration)}</span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={cyclePlaybackRate}
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition ${
                playbackRate > 1
                  ? "bg-[var(--app-accent,#25D366)] text-white"
                  : "bg-[color-mix(in_srgb,currentColor_15%,transparent)] hover:bg-[color-mix(in_srgb,currentColor_25%,transparent)]"
              }`}
              title="Vitesse de lecture (1x, 1.5x, 2x)"
            >
              {playbackRate}x
            </button>
            <Mic className="w-3 h-3 opacity-60 flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
