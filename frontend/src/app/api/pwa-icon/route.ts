import { NextRequest, NextResponse } from "next/server";
import { generateIconSvg, getPwaIconById } from "@/lib/pwa-icons";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const iconId = searchParams.get("id") || "prestige";

  const svg = generateIconSvg(iconId);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
