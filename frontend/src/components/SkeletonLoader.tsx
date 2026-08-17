"use client";

import React from "react";
import Logo from "./Logo";

/**
 * 1. Skeleton pour le fil d'actualité (Stories + Publications)
 */
export function FeedSkeleton() {
  return (
    <div className="space-y-6 max-w-xl mx-auto p-4 md:p-6 select-none animate-fadeIn">
      {/* Skeleton de la barre des stories */}
      <div className="flex items-center gap-4 overflow-hidden py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="w-16 h-16 rounded-full shimmer-skeleton border-2 border-[var(--app-border)]" />
            <div className="w-12 h-2.5 rounded-full shimmer-skeleton" />
          </div>
        ))}
      </div>

      {/* Skeletons de posts */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[32px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 md:p-6 space-y-4 shadow-sm"
        >
          {/* Header du post */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full shimmer-skeleton" />
              <div className="space-y-1.5">
                <div className="w-28 h-3.5 rounded-full shimmer-skeleton" />
                <div className="w-16 h-2.5 rounded-full shimmer-skeleton" />
              </div>
            </div>
            <div className="w-6 h-6 rounded-full shimmer-skeleton" />
          </div>

          {/* Corps de texte */}
          <div className="space-y-2 pt-1">
            <div className="w-full h-3 rounded-full shimmer-skeleton" />
            <div className="w-3/4 h-3 rounded-full shimmer-skeleton" />
          </div>

          {/* Image / Média Placeholder */}
          <div className="w-full h-64 md:h-80 rounded-2xl shimmer-skeleton" />

          {/* Boutons d'interaction */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <div className="w-16 h-8 rounded-full shimmer-skeleton" />
              <div className="w-16 h-8 rounded-full shimmer-skeleton" />
            </div>
            <div className="w-8 h-8 rounded-full shimmer-skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 2. Skeleton pour la liste des conversations (Messagerie)
 */
export function ConversationListSkeleton() {
  return (
    <div className="divide-y divide-[var(--app-border)] animate-fadeIn">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <div className="w-12 h-12 rounded-full shimmer-skeleton flex-shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center justify-between">
              <div className="w-24 h-3.5 rounded-full shimmer-skeleton" />
              <div className="w-10 h-2.5 rounded-full shimmer-skeleton" />
            </div>
            <div className="w-36 h-3 rounded-full shimmer-skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 3. Skeleton pour les bulles de discussion (Chat)
 */
export function ChatMessagesSkeleton() {
  return (
    <div className="space-y-4 p-4 animate-fadeIn">
      <div className="flex justify-start">
        <div className="w-2/3 h-14 rounded-2xl shimmer-skeleton" />
      </div>
      <div className="flex justify-end">
        <div className="w-1/2 h-12 rounded-2xl shimmer-skeleton" />
      </div>
      <div className="flex justify-start">
        <div className="w-3/4 h-36 rounded-2xl shimmer-skeleton" />
      </div>
      <div className="flex justify-end">
        <div className="w-2/5 h-10 rounded-2xl shimmer-skeleton" />
      </div>
    </div>
  );
}

/**
 * 4. Skeleton pour la page Profil
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Bannière de couverture */}
      <div className="w-full h-48 md:h-64 shimmer-skeleton" />

      <div className="px-4 md:px-6 -mt-16 md:-mt-20 space-y-4 max-w-2xl mx-auto">
        <div className="rounded-[32px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 space-y-5 shadow-sm">
          {/* Avatar + Boutons */}
          <div className="flex items-end justify-between">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full shimmer-skeleton border-4 border-[var(--app-background)]" />
            <div className="flex gap-2">
              <div className="w-20 h-9 rounded-full shimmer-skeleton" />
              <div className="w-24 h-9 rounded-full shimmer-skeleton" />
            </div>
          </div>

          {/* Nom & Bio */}
          <div className="space-y-2">
            <div className="w-40 h-5 rounded-full shimmer-skeleton" />
            <div className="w-24 h-3 rounded-full shimmer-skeleton" />
            <div className="w-full h-3.5 rounded-full shimmer-skeleton pt-1" />
            <div className="w-2/3 h-3.5 rounded-full shimmer-skeleton" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--app-border)]">
            <div className="h-12 rounded-2xl shimmer-skeleton" />
            <div className="h-12 rounded-2xl shimmer-skeleton" />
            <div className="h-12 rounded-2xl shimmer-skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 5. Skeleton pour les Reels plein écran
 */
export function ReelSkeleton() {
  return (
    <div className="w-full h-full bg-neutral-950 flex items-center justify-center relative select-none">
      <div className="w-full h-full shimmer-skeleton opacity-25" />
      {/* Boutons d'actions à droite */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5">
        <div className="w-12 h-12 rounded-full shimmer-skeleton" />
        <div className="w-12 h-12 rounded-full shimmer-skeleton" />
        <div className="w-12 h-12 rounded-full shimmer-skeleton" />
      </div>
      {/* Légende en bas à gauche */}
      <div className="absolute left-6 bottom-24 space-y-2 max-w-xs">
        <div className="w-32 h-4 rounded-full shimmer-skeleton" />
        <div className="w-48 h-3 rounded-full shimmer-skeleton" />
      </div>
    </div>
  );
}

/**
 * 6. Loader central fluide avec Emblème animé (pour transitions & boots)
 */
export function GlobalPulseLoader({ message = "Connexion sécurisée en cours..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[300px] space-y-5 animate-fadeIn select-none">
      <div className="pulse-glow">
        <Logo size="lg" showText={false} />
      </div>
      <div className="space-y-1.5 text-center">
        <p className="text-xs font-black uppercase tracking-wider text-[var(--app-foreground)]">
          {message}
        </p>
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] animate-bounce" />
        </div>
      </div>
    </div>
  );
}
