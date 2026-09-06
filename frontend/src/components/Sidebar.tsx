"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  CircleDot,
  Bell,
  User,
  ShieldCheck,
  LogOut,
  Settings,
  Download,
} from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "./AuthProvider";
import { useIsStandalone } from "@/lib/use-standalone";

interface SidebarProps {
  isAdmin?: boolean;
}

export default function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, unreadNotificationsCount } = useAuth();
  const isStandalone = useIsStandalone();

  const menuItems = [
    { name: "Discussions", href: "/messages", icon: MessageSquare, match: (p: string) => p.startsWith("/messages") },
    { name: "Actus & Stories", href: "/", icon: CircleDot, match: (p: string) => p === "/" },
    { name: "Notifications", href: "/notifications", icon: Bell, match: (p: string) => p === "/notifications" },
    { name: "Profil", href: "/profile", icon: User, match: (p: string) => p.startsWith("/profile") && !p.startsWith("/profile/") },
    { name: "Paramètres", href: "/settings", icon: Settings, match: (p: string) => p === "/settings" },
    ...(!isStandalone ? [{ name: "Télécharger l'APK", href: "/download", icon: Download, match: (p: string) => p === "/download" }] : []),
  ];

  if (isAdmin) {
    menuItems.splice(3, 0, {
      name: "Administration",
      href: "/admin",
      icon: ShieldCheck,
      match: (p: string) => p === "/admin",
    });
  }

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-[280px] border-r border-[var(--app-border)] bg-[var(--app-surface)] select-none z-30">
      {/* Header zone */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-2">
        <Link href="/">
          <Logo size="md" showText={true} />
        </Link>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.match(pathname);
          const isNotifications = item.href === "/notifications";
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl text-[15px] font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-[var(--app-accent,#25D366)]/10 text-[var(--app-accent,#25D366)] font-bold"
                  : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Icon
                  className={`h-[20px] w-[20px] transition-all ${
                    isActive
                      ? "text-[var(--app-accent,#25D366)]"
                      : "text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-200"
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                <span>{item.name}</span>
              </div>
              {isNotifications && unreadNotificationsCount > 0 && (
                <span className="bg-[var(--app-accent,#25D366)] text-white font-black text-[10px] min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center shadow-sm">
                  {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 pt-2 border-t border-[var(--app-border)] space-y-2">
        {user && (
          <div className="px-4 py-3 rounded-2xl bg-[var(--app-surface-raised)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--app-accent,#25D366)]/15 text-[var(--app-accent,#25D366)] flex items-center justify-center font-black text-sm flex-shrink-0">
              {user.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{user.displayName}</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">{user.verificationStatus}</div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors duration-200"
        >
          <LogOut className="h-[20px] w-[20px]" strokeWidth={1.8} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
