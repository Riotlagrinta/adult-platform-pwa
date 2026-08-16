"use client";

import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const isStaff = user?.role === "MODERATOR" || user?.role === "ADMIN";

  return (
    <div className="h-[100dvh] w-screen flex overflow-hidden select-none bg-[var(--app-background)] text-[var(--app-foreground)] relative">
      {user && <Sidebar isAdmin={isStaff} />}
      <div className={`flex-1 flex flex-col ${user ? "md:pl-64" : ""} h-full overflow-hidden relative`}>
        <main className="flex-1 flex justify-center h-full overflow-hidden min-h-0 relative">
          <div className={`w-full h-full flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--app-border)] ${user ? "max-w-4xl pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0" : ""}`}>
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
        </main>
      </div>
      {user && <BottomNav isAdmin={isStaff} />}
    </div>
  );
}
