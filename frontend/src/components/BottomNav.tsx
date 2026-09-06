"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  CircleDot,
  Users,
  User,
  ShieldCheck,
  Bell,
  Settings,
  Pencil,
} from "lucide-react";
import { useAuth } from "./AuthProvider";

interface BottomNavProps {
  isAdmin?: boolean;
}

export default function BottomNav({ isAdmin = false }: BottomNavProps) {
  const pathname = usePathname();
  const { unreadNotificationsCount } = useAuth();

  const tabs = [
    {
      name: "Discussions",
      href: "/messages",
      icon: MessageSquare,
      match: (p: string) => p.startsWith("/messages"),
    },
    {
      name: "Actus",
      href: "/",
      icon: CircleDot,
      match: (p: string) => p === "/",
    },
    {
      name: "Communauté",
      href: "/notifications",
      icon: Bell,
      match: (p: string) => p === "/notifications",
      badge: unreadNotificationsCount,
    },
    {
      name: "Paramètres",
      href: "/settings",
      icon: Settings,
      match: (p: string) => p.startsWith("/settings") || p.startsWith("/profile"),
    },
  ];

  if (isAdmin) {
    tabs.splice(3, 0, {
      name: "Admin",
      href: "/admin",
      icon: ShieldCheck,
      match: (p: string) => p === "/admin",
    });
  }

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] border-t border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_96%,transparent)] backdrop-blur-xl flex items-center justify-around px-1 select-none z-30">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.match(pathname);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 w-full h-full relative transition-all duration-200"
            >
              <div className="relative">
                <Icon
                  className={`h-[22px] w-[22px] transition-all duration-200 ${
                    isActive
                      ? "text-[var(--app-accent,#25D366)] scale-110"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#25D366] text-white font-black text-[8px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-md">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-[10px] leading-tight transition-all duration-200 ${
                  isActive
                    ? "font-black text-[var(--app-accent,#25D366)]"
                    : "font-medium text-neutral-500 dark:text-neutral-400"
                }`}
              >
                {tab.name}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-[var(--app-accent,#25D366)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* FAB – Nouveau message (affiché hors messagerie) */}
      {!pathname.startsWith("/messages") && (
        <Link
          href="/messages"
          className="md:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 w-14 h-14 rounded-full bg-[var(--app-accent,#25D366)] text-white flex items-center justify-center shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:shadow-[0_6px_30px_rgba(37,211,102,0.5)] active:scale-95 transition-all duration-200 z-30"
          aria-label="Nouvelle discussion"
        >
          <Pencil className="w-5 h-5" />
        </Link>
      )}
    </>
  );
}
