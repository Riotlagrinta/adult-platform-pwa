import { NextRequest, NextResponse } from "next/server";
import { getPwaIconById } from "@/lib/pwa-icons";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const iconId = searchParams.get("icon") || "prestige";
  const icon = getPwaIconById(iconId);

  const manifest = {
    name: icon.appName,
    short_name: icon.appName,
    description: icon.description,
    start_url: "/",
    display: "standalone",
    background_color: icon.bgColor,
    theme_color: icon.themeColor,
    orientation: "portrait",
    icons: [
      {
        src: `/api/pwa-icon?id=${icon.id}&size=192`,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
      {
        src: `/api/pwa-icon?id=${icon.id}&size=512`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
