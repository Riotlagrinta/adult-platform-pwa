"use client";

import React, { useState } from "react";
import { Settings, User, Shield, Eye, Bell, HelpCircle, Upload, CheckCircle2 } from "lucide-react";
import AuthPanel from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

export default function SettingsPage() {
  const { token, ready, user, refreshUser } = useAuth();
  const [documentType, setDocumentType] = useState("CNI");
  const [documentLast4, setDocumentLast4] = useState("");
  const [notes, setNotes] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const verificationStatus = user?.verificationStatus ?? "DRAFT";

  const handleVerifyRequest = async () => {
    if (!token) return;
    if (!documentType.trim()) {
      setStatus("Veuillez indiquer le type de document.");
      return;
    }

    setStatus(null);

    try {
      let proofUrl: string | undefined;
      if (documentFile) {
        const formData = new FormData();
        formData.append("file", documentFile);
        const upload = await apiRequest<{ file: { url: string } }>("/files/verification", {
          method: "POST",
          token,
          body: formData,
        });
        proofUrl = upload.file.url;
      }

      await apiRequest("/verification/request", {
        method: "POST",
        token,
        body: JSON.stringify({
          documentType,
          documentLast4,
          notes: proofUrl ? `${notes}\nPièce: ${proofUrl}` : notes,
        }),
      });

      await refreshUser();
      setStatus("Demande envoyée aux administrateurs.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erreur lors de la soumission");
    }
  };

  if (!ready) {
    return <div className="p-6 text-sm text-neutral-500">Chargement...</div>;
  }

  if (!token) {
    return (
      <div className="p-4 md:p-6">
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-background)] min-h-screen p-4 md:p-6 space-y-6">
      <div className="border-b border-[var(--app-border)] pb-4">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-[var(--app-foreground)]" />
          <div>
            <h2 className="font-black text-xl tracking-tight uppercase">Paramètres</h2>
            <p className="text-xs text-neutral-500">Gérez votre compte et votre vérification.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-xl">


        <section className="divide-y divide-[var(--app-border)] text-xs">
          {[
            { label: "Modifier les informations de profil", icon: User },
            { label: "Visibilité & Confidentialité", icon: Eye },
            { label: "Notifications push et courriels", icon: Bell },
            { label: "Centre d'aide et assistance", icon: HelpCircle },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 hover:bg-[var(--app-surface-soft)] cursor-pointer rounded-xl transition">
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-neutral-400" />
                <span className="font-bold">{item.label}</span>
              </div>
              <span className="text-neutral-400">›</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
