"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

interface ModernDatePickerProps {
  value: string; // Format "YYYY-MM-DD"
  onChange: (date: string) => void;
  required?: boolean;
}

const MONTHS = [
  { value: "01", label: "Janvier" },
  { value: "02", label: "Février" },
  { value: "03", label: "Mars" },
  { value: "04", label: "Avril" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" },
  { value: "08", label: "Août" },
  { value: "09", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];

export default function ModernDatePicker({ value, onChange }: ModernDatePickerProps) {
  const currentYear = new Date().getFullYear();
  const maxAllowedYear = currentYear - 18; // Strictement 18+
  const minAllowedYear = currentYear - 90;

  // Extraire les valeurs initiales si fournies
  const initialYear = value ? value.split("-")[0] : "";
  const initialMonth = value ? value.split("-")[1] : "";
  const initialDay = value ? value.split("-")[2] : "";

  const [day, setDay] = useState(initialDay);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  // Liste des années autorisées (de l'année max - 18 ans jusqu'à 90 ans)
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxAllowedYear; y >= minAllowedYear; y--) {
      list.push(y);
    }
    return list;
  }, [maxAllowedYear, minAllowedYear]);

  // Nombre de jours dynamique selon l'année et le mois
  const maxDays = useMemo(() => {
    if (!month || !year) return 31;
    return new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
  }, [month, year]);

  const days = useMemo(() => {
    return Array.from({ length: maxDays }, (_, i) => String(i + 1).padStart(2, "0"));
  }, [maxDays]);

  // Ajuster le jour si on change de mois (ex: 31 passé à Février)
  useEffect(() => {
    if (day && parseInt(day, 10) > maxDays) {
      setDay(String(maxDays).padStart(2, "0"));
    }
  }, [maxDays, day]);

  // Propager le changement si les 3 champs sont sélectionnés
  useEffect(() => {
    if (day && month && year) {
      const formatted = `${year}-${month}-${day}`;
      if (formatted !== value) {
        onChange(formatted);
      }
    } else if (value) {
      onChange("");
    }
  }, [day, month, year, onChange, value]);

  // Calcul de l'âge exact en temps réel
  const ageInfo = useMemo(() => {
    if (!day || !month || !year) return null;
    const birth = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const today = new Date();

    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }

    const isAdult = calculatedAge >= 18;
    return { age: calculatedAge, isAdult };
  }, [day, month, year]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
          Date de naissance
        </label>
        {ageInfo && (
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all ${
              ageInfo.isAdult
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-500 border border-red-500/20"
            }`}
          >
            {ageInfo.isAdult ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                {ageInfo.age} ans (Majeur)
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-red-500" />
                {ageInfo.age} ans (Mineur non autorisé)
              </>
            )}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Sélecteur de Jour */}
        <div className="relative">
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[var(--app-foreground)] transition cursor-pointer"
            required
          >
            <option value="" disabled>
              Jour
            </option>
            {days.map((d) => (
              <option key={d} value={d}>
                {parseInt(d, 10)}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sélecteur de Mois */}
        <div className="relative">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[var(--app-foreground)] transition cursor-pointer"
            required
          >
            <option value="" disabled>
              Mois
            </option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sélecteur d'Année */}
        <div className="relative">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[var(--app-foreground)] transition cursor-pointer"
            required
          >
            <option value="" disabled>
              Année
            </option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
