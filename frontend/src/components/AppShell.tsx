"use client";

import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const isStaff = user?.role === "MODERATOR" || user?.role === "ADMIN";

  return (
    <>
      {user && <Sidebar isAdmin={isStaff} />}
      <div className={`flex-1 flex flex-col ${user ? "md:pl-64" : ""} min-h-screen`}>
        <main className="flex-1 flex justify-center">
          <div className={`w-full ${user ? "max-w-4xl flex divide-x divide-[var(--app-border)] pb-16 md:pb-0" : "min-h-screen"}`}>
            <div className="flex-1 min-w-0">{children}</div>
            {user && (
              <aside className="hidden lg:block w-80 p-6 space-y-6">
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
    </>
  );
}
