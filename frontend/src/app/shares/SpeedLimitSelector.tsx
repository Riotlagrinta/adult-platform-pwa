"use client";

import React, { useState } from "react";
import { Gauge } from "lucide-react";

// Préréglages rapides — au-delà, "Autre" permet de taper n'importe quelle valeur :
// il n'y a pas de plafond technique côté WebTorrent, seulement celui de la ligne de
// l'utilisateur. "Illimité" laisse WebRTC utiliser tout ce que son propre contrôle
// de congestion estime disponible (voir l'explication donnée à l'utilisateur : c'est
// le vrai plafond, on ne peut pas le contourner depuis l'appli).
const PRESETS_MBPS = [0, 1, 2, 5, 10, 25, 50, 100];

type Props = {
  label: string;
  valueMBps: number;
  onChange: (mbps: number) => void;
};

export default function SpeedLimitSelector({ label, valueMBps, onChange }: Props) {
  const isCustomValue = valueMBps > 0 && !PRESETS_MBPS.includes(valueMBps);
  const [customInput, setCustomInput] = useState(isCustomValue ? String(valueMBps) : "");

  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 mb-2">
        <Gauge className="w-3.5 h-3.5" />
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS_MBPS.map((limit) => (
          <button
            key={limit}
            type="button"
            onClick={() => {
              onChange(limit);
              setCustomInput("");
            }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
              valueMBps === limit && !isCustomValue
                ? "bg-[var(--app-accent,#25D366)] text-white border-transparent"
                : "border-[var(--app-border)] bg-[var(--app-surface-raised)] text-neutral-400 hover:bg-[var(--app-surface-soft)]"
            }`}
          >
            {limit === 0 ? "Illimité" : `${limit} Mo/s`}
          </button>
        ))}
        <div
          className={`flex items-center gap-1 pl-3 pr-2.5 py-1.5 rounded-full border text-[11px] font-bold transition-colors ${
            isCustomValue
              ? "border-[var(--app-accent,#25D366)] text-[var(--app-foreground)]"
              : "border-[var(--app-border)] bg-[var(--app-surface-raised)] text-neutral-400"
          }`}
        >
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            placeholder="Autre"
            value={customInput}
            onChange={(e) => {
              const raw = e.target.value;
              setCustomInput(raw);
              const parsed = Number(raw);
              if (raw !== "" && parsed > 0) onChange(parsed);
            }}
            className="w-12 bg-transparent outline-none"
          />
          <span>Mo/s</span>
        </div>
      </div>
    </div>
  );
}
