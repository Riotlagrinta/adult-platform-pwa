"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  PlusSquare,
  Bell,
  User,
  ShieldCheck,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface BottomNavProps {
  isAdmin?: boolean;
}

export default function BottomNav({ isAdmin = false }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] backdrop-blur-md flex items-center justify-around px-2 select-none z-30">
      <Link
        href="/"
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${
          pathname === "/"
            ? "text-[var(--app-foreground)]"
            : "text-neutral-500 dark:text-neutral-400"
        }`}
      >
        <Home className="h-6 w-6" />
      </Link>

      <Link
        href="/messages"
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${
          pathname === "/messages"
            ? "text-[var(--app-foreground)]"
            : "text-neutral-500 dark:text-neutral-400"
        }`}
      >
        <MessageSquare className="h-6 w-6" />
      </Link>

      <Link
        href="/create"
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${
          pathname === "/create"
            ? "text-[var(--app-foreground)]"
            : "text-neutral-500 dark:text-neutral-400"
        }`}
      >
        <PlusSquare className="h-6 w-6" />
      </Link>

      {isAdmin && (
        <Link
          href="/admin"
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${
            pathname === "/admin"
              ? "text-[var(--app-foreground)]"
              : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          <ShieldCheck className="h-6 w-6" />
        </Link>
      )}

      <Link
        href="/notifications"
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${
          pathname === "/notifications"
            ? "text-[var(--app-foreground)]"
            : "text-neutral-500 dark:text-neutral-400"
        }`}
      >
        <Bell className="h-6 w-6" />
      </Link>

      <Link
        href="/profile"
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors ${
          pathname === "/profile"
            ? "text-[var(--app-foreground)]"
            : "text-neutral-500 dark:text-neutral-400"
        }`}
      >
        <User className="h-6 w-6" />
      </Link>

      <div className="flex items-center justify-center w-12 h-12">
        <ThemeToggle className="w-12 h-12 p-0" />
      </div>
    </nav>
  );
}
