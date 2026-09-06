"use client";

import React, { useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";

const TABS = ["/messages", "/", "/community", "/settings"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useAuth();
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
            <div className={`w-full h-full flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--app-border)] ${user ? "max-w-4xl pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0" : ""}`}>
              <div className="flex-1 h-full overflow-y-auto scroll-smooth min-w-0 focus:outline-none">
                {children}
              </div>
              {user && (
                <aside className="hidden lg:block w-80 p-6 space-y-6 overflow-y-auto h-full flex-shrink-0">
                  <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl p-4 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">Compte</h3>
                    {ready ? (
                      <div className="space-y-2 text-sm">
                        <div className="font-semibold">{user.displayName}</div>
                        <div className="text-neutral-500 dark:text-neutral-400">{user.email}</div>
                        <div className="text-xs text-neutral-400 dark:text-neutral-500">
                          Rôle: {user.role}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">Chargement de la session...</div>
                    )}
                  </div>

                  <div className="text-xs text-neutral-400 dark:text-neutral-500 px-4">© 2026 OnlyAdults</div>
                </aside>
              )}
            </div>
          )}
        </main>
      </div>
      {/* BottomNav mobile WhatsApp */}
      {user && <BottomNav isAdmin={isStaff} />}
    </div>
  );
}
