import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import PWARegister from "@/components/PWARegister";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PushNotificationBanner from "@/components/PushNotificationBanner";
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
  interactiveWidget: "resizes-content",
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
            __html: `(function(){try{var family=localStorage.getItem('onlyadults_theme_family')||'midnight';var mode=localStorage.getItem('onlyadults_theme_mode')||'dark';var isDark=mode==='dark';document.documentElement.classList.toggle('dark',isDark);document.documentElement.style.colorScheme=isDark?'dark':'light';document.documentElement.setAttribute('data-theme',family);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--app-background)] text-[var(--app-foreground)] h-[100dvh] flex overflow-hidden`}
      >
        <AuthProvider>
          <PWARegister />
          <PWAInstallPrompt />
          <PushNotificationBanner />
          <Analytics />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
