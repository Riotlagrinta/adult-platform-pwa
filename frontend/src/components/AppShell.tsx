"use client";

import React, { useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";

const TABS = ["/messages", "/", "/community", "/shares", "/settings"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isStaff = user?.role === "MODERATOR" || user?.role === "ADMIN";

  const touchStartRef = useRef<{ x: number; y: number; time: number; target: EventTarget | null } | null>(null);

  // La messagerie occupe 100% de l'écran sans contraintes de largeur
  const isFullBleed = pathname.startsWith("/messages");

  // Navigation fluide par balayage horizontal (Swipe) entre onglets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!user || e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      target: e.target,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const startTarget = touchStartRef.current.target as HTMLElement | null;

    touchStartRef.current = null;

    // Ignorer les gestes trop lents
    if (deltaTime > 650 || deltaTime < 50) return;

    // Doit être un swipe horizontal net
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.5) return;

    // Ignorer si le geste a démarré sur un champ interactif, story tray, ou scroll horizontal
    if (
      startTarget &&
      startTarget.closest(
        "input, textarea, select, button, [role='slider'], .hide-scrollbar, .overflow-x-auto, [data-no-swipe]"
      )
    ) {
      return;
    }

    const currentTabIndex = TABS.findIndex((tab) =>
      tab === "/" ? pathname === "/" : pathname.startsWith(tab)
    );
    if (currentTabIndex === -1) return;

    // Swipe vers la gauche (deltaX < 0) -> Onglet suivant
    if (deltaX < 0 && currentTabIndex < TABS.length - 1) {
      router.push(TABS[currentTabIndex + 1]);
    }
    // Swipe vers la droite (deltaX > 0) -> Onglet précédent
    else if (deltaX > 0 && currentTabIndex > 0) {
      router.push(TABS[currentTabIndex - 1]);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="h-[100dvh] w-screen flex overflow-hidden select-none bg-[var(--app-background)] text-[var(--app-foreground)] relative"
    >
      {user && <Sidebar isAdmin={isStaff} />}
      <div className={`flex-1 flex flex-col ${user ? "md:pl-[280px]" : ""} h-full overflow-hidden relative`}>
        <main className="flex-1 flex justify-center h-full overflow-hidden min-h-0 relative">
          {isFullBleed ? (
            <div className="w-full h-full flex flex-col min-w-0">
              {children}
            </div>
          ) : (
            // Un seul panneau de contenu unifié sur PC — l'ancienne colonne "Compte" à
            // droite faisait double emploi avec la carte de profil déjà présente en bas
            // de la Sidebar, et la ligne de séparation créait une sensation de blocs
            // disjoints plutôt qu'un espace de travail cohérent.
            <div
              className={`w-full h-full overflow-y-auto scroll-smooth min-w-0 focus:outline-none ${
                user ? "max-w-4xl pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0" : ""
              }`}
            >
              {children}
            </div>
          )}
        </main>
      </div>
      {/* BottomNav mobile WhatsApp */}
      {user && <BottomNav isAdmin={isStaff} />}
    </div>
  );
}
