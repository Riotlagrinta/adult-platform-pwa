"use client";

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
  iceCandidatePoolSize: 10,
};

// ── Synthétiseur de Sonnerie Web Audio Autonome (Zero Fichier Manquant) ──
let audioCtx: AudioContext | null = null;
let ringInterval: NodeJS.Timeout | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Joue un double bip d'appel style téléphone / WhatsApp */
export function playRingtone() {
  stopRingtone();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playTonePair = () => {
    try {
      if (!ctx || ctx.state === "closed") return;
      const now = ctx.currentTime;

      // Premier ton (440Hz - La standard)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.setValueAtTime(480, now + 0.1);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Deuxième ton après courte pause (0.55s)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(440, now + 0.55);
      osc2.frequency.setValueAtTime(480, now + 0.65);

      gain2.gain.setValueAtTime(0.001, now + 0.55);
      gain2.gain.exponentialRampToValueAtTime(0.18, now + 0.6);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.55);
      osc2.stop(now + 0.95);
    } catch (e) {
      console.warn("Ringtone synth error:", e);
    }
  };

  playTonePair();
  ringInterval = setInterval(playTonePair, 3000);
}

/** Arrête la sonnerie */
export function stopRingtone() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
}

/** Joue un son de fin d'appel bref */
export function playEndCallTone() {
  stopRingtone();
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn("End call tone error:", e);
  }
}
