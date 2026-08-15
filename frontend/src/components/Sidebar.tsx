"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  Bell,
  User,
  PlusSquare,
  ShieldCheck,
  LogOut,
  Settings,
} from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "./AuthProvider";

interface SidebarProps {
  isAdmin?: boolean;
}

export default function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: "Accueil", href: "/", icon: Home },
    { name: "Messages", href: "/messages", icon: MessageSquare },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Créer un Post", href: "/create", icon: PlusSquare },
    { name: "Profil", href: "/profile", icon: User },
    { name: "Paramètres", href: "/settings", icon: Settings },
  ];

  if (isAdmin) {
    menuItems.splice(3, 0, {
      name: "Vérifications",
      href: "/admin",
      icon: ShieldCheck,
    });
  }

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-64 border-r border-[var(--app-border)] bg-[var(--app-surface)] p-6 select-none z-30">
      <div className="mb-8 flex items-center justify-between gap-2">
        <Link href="/">
          <Logo size="md" showText={true} />
        </Link>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-full text-base font-medium transition-colors duration-200 ${
                isActive
                  ? "bg-[var(--app-foreground)] text-[var(--app-background)] font-semibold"
                  : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-[var(--app-border)] space-y-3">
        {user && (
          <div className="px-4 text-xs text-neutral-500">
            <div className="font-semibold text-neutral-700 dark:text-neutral-200">{user.displayName}</div>
            <div>{user.verificationStatus}</div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-4 px-4 py-3 rounded-full text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors duration-200"
        >
          <LogOut className="h-5 w-5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
