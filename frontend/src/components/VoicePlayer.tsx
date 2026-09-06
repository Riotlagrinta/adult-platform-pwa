"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, Mic, AlertCircle, RefreshCw } from "lucide-react";
import { toPublicUrl } from "@/lib/api";

type VoicePlayerProps = {
  url: string;
  durationSeconds?: number | null;
  isMe?: boolean;
};

// Global audio singleton to ensure only ONE voice note plays at any time
let currentlyPlayingAudio: HTMLAudioElement | null = null;
let stopCurrentPlayerCallback: (() => void) | null = null;

export default function VoicePlayer({ url, durationSeconds = 0, isMe = false }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);

  const resolvedUrl = toPublicUrl(url) || url;

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Generate 28 deterministic bars for WhatsApp-like visual waveform
  const waveformBars = React.useMemo(() => {
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

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  const togglePlayPause = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!audioRef.current) return;

    setHasError(false);
    setErrorMessage(null);

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Pause any previously playing voice note in the whole app
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audio) {
        currentlyPlayingAudio.pause();
        if (stopCurrentPlayerCallback) {
          stopCurrentPlayerCallback();
        }
      }

      currentlyPlayingAudio = audio;
      stopCurrentPlayerCallback = () => setIsPlaying(false);

      try {
        // Débloquer l'audio si nécessaire
        if (audio.readyState === 0) {
          audio.load();
        }
        await audio.play();
        setIsPlaying(true);
      } catch (err: any) {
        console.error("Audio playback error:", err);
        setHasError(true);
        setErrorMessage("Lecture impossible");
        setIsPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!totalDuration && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setTotalDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
        setTotalDuration(dur);
      }
      setIsLoaded(true);
      setHasError(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleError = (e: any) => {
    console.warn("Erreur de chargement audio:", resolvedUrl, e);
    // Ne marquer comme erreur critique que si la lecture échoue
    if (isPlaying) {
      setHasError(true);
      setIsPlaying(false);
    }
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    const clickRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = clickRatio * (totalDuration || audioRef.current.duration || durationSeconds || 1);
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    seekToPosition(e.clientX);
  };

  const effectiveDuration = totalDuration || durationSeconds || 0;
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  useEffect(() => {
    return () => {
      if (currentlyPlayingAudio === audioRef.current) {
        currentlyPlayingAudio = null;
        stopCurrentPlayerCallback = null;
      }
    };
  }, []);

  return (
    <div className={`flex items-center gap-2.5 py-1 select-none min-w-[210px] sm:min-w-[260px] max-w-full ${isMe ? "text-inherit" : "text-inherit"}`}>
      <audio
        ref={audioRef}
        src={resolvedUrl}
        preload="metadata"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
      />

      {/* Play / Pause button */}
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
        {hasError ? (
          <RefreshCw className="w-4 h-4" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform & Scrubber */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div
          ref={waveformContainerRef}
          onClick={handleWaveformClick}
          className="h-7 flex items-center gap-[2.5px] cursor-pointer relative group py-1"
          title="Naviguer dans le vocal"
        >
          {waveformBars.map((barHeight, idx) => {
            const barProgress = (idx / waveformBars.length) * 100;
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

        {/* Duration / Elapsed Timer and Speed Controller */}
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
              title="Vitesse de lecture"
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
