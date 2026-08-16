import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import PWARegister from "@/components/PWARegister";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { Analytics } from "@vercel/analytics/next";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OnlyAdults - Plateforme Premium Privée",
  description: "Plateforme web progressive pour adultes validés, avec profils privés, messagerie et publications.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OnlyAdults",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full select-none" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var key='theme';var saved=localStorage.getItem(key);var system=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var theme=saved==='light'||saved==='dark'?saved:system;document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.style.colorScheme=theme;document.documentElement.setAttribute('data-theme',theme);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--app-background)] text-[var(--app-foreground)] h-[100dvh] flex overflow-hidden`}
      >
        <AuthProvider>
          <PWARegister />
          <PWAInstallPrompt />
          <Analytics />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
