import { NextResponse } from 'next/server';

export async function GET() {
  // Redirection vers la release GitHub ou fallback de téléchargement direct
  const releaseUrl = 'https://github.com/Riotlagrinta/adult-platform-pwa/releases/latest';
  return NextResponse.redirect(releaseUrl);
}
