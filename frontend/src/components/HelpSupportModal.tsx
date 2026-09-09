"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Lock,
  Sparkles,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileText,
  LifeBuoy,
} from "lucide-react";
import { haptics } from "@/lib/haptics";

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

interface FaqItem {
  id: string;
  category: "creator" | "privacy" | "install" | "payment" | "rules";
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const FAQS: FaqItem[] = [
  {
    id: "creator",
    category: "creator",
    question: "Comment devenir Créateur Vérifié et monétiser mes contenus ?",
    answer:
      "Pour devenir créateur officiel sur OnlyAdults, rendez-vous dans vos Paramètres > Statut de Vérification. Vous y déposerez une pièce d'identité officielle en cours de validité (Passeport, CNI) ainsi qu'un selfie de contrôle. Notre équipe de conformité examine chaque dossier manuellement sous 24 à 48 heures. Une fois approuvé, votre badge VIP rose s'active et vous débloquez les fonctionnalités de monétisation, d'abonnements payants et de pourboires.",
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
  },
  {
    id: "disguise",
    category: "privacy",
    question: "Comment fonctionne le mode Camouflage (Calculatrice, Notes, Fitness) ?",
    answer:
      "Le mode Camouflage est conçu pour vous offrir une discrétion absolue sur votre smartphone. Dans Paramètres > Apparence & Camouflage, vous pouvez choisir une fausse icône et un faux nom (ex: 'Calculatrice', 'Mes Notes' ou 'FitTrack'). Lors de l'installation sur votre écran d'accueil, l'application prend cette apparence neutre et se fond totalement parmi vos applications du quotidien sans éveiller le moindre soupçon.",
    icon: <Lock className="w-4 h-4 text-blue-400" />,
  },
  {
    id: "install",
    category: "install",
    question: "Comment installer l'application sur mon smartphone (Android & iPhone) ?",
    answer:
      "• Sur Android : Vous pouvez télécharger directement notre fichier officiel OnlyAdults.apk depuis le site web, ou l'ajouter en 1 clic via le menu Chrome (⋮ > Installer l'application).\n• Sur iPhone (iOS) : Ouvrez le site dans Safari, touchez l'icône de Partage en bas au milieu, puis sélectionnez 'Sur l'écran d'accueil'. L'application s'installera instantanément en plein écran avec toutes les notifications privées.",
    icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: "security",
    category: "privacy",
    question: "Mes photos éphémères et mes messages vocaux sont-ils protégés ?",
    answer:
      "Oui, absolument. Tous les médias privés transitent par des flux sécurisés et des URLs temporaires pré-signées qui expirent automatiquement. Les photos éphémères (3s, 10s) sont programmées pour s'autodétruire après consultation. De plus, notre filigrane anti-capture dynamique décourage la diffusion externe non consentie de vos contenus.",
    icon: <ShieldCheck className="w-4 h-4 text-teal-400" />,
  },
  {
    id: "payments",
    category: "payment",
    question: "Quels sont les moyens de paiement acceptés et comment se font les retraits ?",
    answer:
      "Nous prenons en charge les cartes bancaires internationales (Visa, Mastercard), les solutions de paiement mobile locales (T-Money, Flooz, Wave selon les régions) et les virements sécurisés. Les créateurs vérifiés peuvent demander leurs virements de gains directement depuis leur tableau de bord financier dès que le seuil de paiement minimum est atteint.",
    icon: <CreditCard className="w-4 h-4 text-amber-400" />,
  },
  {
    id: "rules",
    category: "rules",
    question: "Quelle est la politique 18+ et les règles de la communauté ?",
    answer:
      "OnlyAdults applique une tolérance zéro absolue envers : tout contenu impliquant des mineurs, les contenus non consentis (revenge porn), les menaces, le harcèlement ou la violence. Tout compte enfreignant nos conditions générales d'utilisation est immédiatement banni à vie, et les données peuvent être transmises aux autorités compétentes en cas d'infraction pénale.",
    icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
  },
];

export default function HelpSupportModal({ isOpen, onClose, userEmail }: HelpSupportModalProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>("creator");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Formulaire de contact support
  const [ticketSubject, setTicketSubject] = useState("technique");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleFaq = (id: string) => {
    haptics.light();
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  const filteredFaqs = FAQS.filter((faq) => {
    if (activeCategory === "all") return true;
    return faq.category === activeCategory;
  });

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;

    haptics.medium();
    setIsSending(true);

    // Simulation d'envoi de ticket au support
    setTimeout(() => {
      setIsSending(false);
      setTicketSuccess(true);
      setTicketMessage("");
      haptics.success();
      setTimeout(() => setTicketSuccess(false), 5000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn select-none">
      <div className="w-full max-w-2xl bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header de la modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--app-border)] bg-[var(--app-surface-raised)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--app-accent)]/15 text-[var(--app-accent)] flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[var(--app-foreground)]">
                Centre d&apos;Aide & Information
              </h2>
              <p className="text-[11px] text-neutral-400">
                FAQ, règles de confidentialité et assistance directe 24/7
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--app-surface-soft)] hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps défilant */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* ── Filtres FAQ ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
                Questions Fréquentes (FAQ)
              </span>
              <span className="text-[10px] text-neutral-500 font-bold">{filteredFaqs.length} réponses</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "Toutes" },
                { id: "creator", label: "👑 Créateurs & Monétisation" },
                { id: "privacy", label: "🔒 Confidentialité & Camouflage" },
                { id: "install", label: "📱 Installation Mobile" },
                { id: "payment", label: "💳 Paiements" },
                { id: "rules", label: "⚖️ Règles 18+" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setActiveCategory(cat.id);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
                    activeCategory === cat.id
                      ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-sm"
                      : "bg-[var(--app-surface-soft)] text-neutral-400 hover:text-[var(--app-foreground)]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Accordéons FAQ */}
            <div className="space-y-2 pt-1">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isOpen
                        ? "border-[var(--app-foreground)]/30 bg-[var(--app-surface-raised)]"
                        : "border-[var(--app-border)] bg-[var(--app-surface-soft)] hover:border-neutral-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left font-bold"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex-shrink-0">{faq.icon}</div>
                        <span className="text-xs text-[var(--app-foreground)] leading-snug truncate sm:whitespace-normal">
                          {faq.question}
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-[11px] text-neutral-300 leading-relaxed border-t border-[var(--app-border)]/50 whitespace-pre-line animate-fadeIn">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Formulaire de Contact Support ── */}
          <div className="pt-4 border-t border-[var(--app-border)] space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[var(--app-accent)]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--app-foreground)]">
                Contacter l&apos;Équipe d&apos;Assistance
              </h3>
            </div>
            <p className="text-[11px] text-neutral-400">
              Une question spécifique ou un problème sur votre compte ? Envoyez-nous un message directement.
            </p>

            {ticketSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="font-black text-xs">Message envoyé avec succès !</div>
                  <div className="text-[10px] opacity-80">
                    Notre équipe vous répondra par email sous 24h.
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendTicket} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 block mb-1">Motif de la demande</label>
                    <select
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--app-surface-soft)] border border-[var(--app-border)] text-xs text-[var(--app-foreground)] focus:outline-none focus:border-[var(--app-accent)]"
                    >
                      <option value="verification">👑 Vérification & Statut Créateur</option>
                      <option value="technique">⚙️ Problème Technique / Bug</option>
                      <option value="payment">💳 Question Facturation & Gains</option>
                      <option value="report">🚨 Signalement d&apos;un contenu ou profil</option>
                      <option value="other">💬 Autre demande</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 block mb-1">Votre email de réponse</label>
                    <input
                      type="email"
                      defaultValue={userEmail || ""}
                      placeholder="votre-email@example.com"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[var(--app-surface-soft)] border border-[var(--app-border)] text-xs text-[var(--app-foreground)] focus:outline-none focus:border-[var(--app-accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 block mb-1">Votre message</label>
                  <textarea
                    rows={3}
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Expliquez votre situation en détail..."
                    required
                    className="w-full p-3 rounded-xl bg-[var(--app-surface-soft)] border border-[var(--app-border)] text-xs text-[var(--app-foreground)] focus:outline-none focus:border-[var(--app-accent)] resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-neutral-500">
                    Email direct : <strong className="text-neutral-400">support@onlyadults.club</strong>
                  </span>
                  <button
                    type="submit"
                    disabled={isSending || !ticketMessage.trim()}
                    className="px-5 py-2.5 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-xs hover:opacity-90 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? "Transmission..." : "Envoyer le message"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--app-border)] bg-[var(--app-surface-soft)] flex items-center justify-between text-[11px] text-neutral-400">
          <span>OnlyAdults Inc. • Plateforme 18+ Sécurisée</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-[var(--app-foreground)] hover:underline"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
