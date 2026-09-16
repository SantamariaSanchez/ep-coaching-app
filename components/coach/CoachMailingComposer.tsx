"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Send, FlaskConical, Users, CheckCircle2, XCircle, Clock3, Eye, EyeOff,
  Copy, CalendarClock, Globe2, UserCog, List as ListIcon, ChevronDown,
  LayoutTemplate, Search, X, RefreshCw,
} from "lucide-react";
import {
  sendTestMailing,
  sendMailingToClients,
  sendSingleMailing,
  searchMailingContacts,
  getMailingRecipientCount,
  refreshAllMailingStatsAction,
  type MailingContactResult,
} from "@/app/dashboard/coach/mailing/actions";
import type { CoachMailing, CampaignStats } from "@/lib/coach-mailings";
import type { BrevoListSummary } from "@/lib/brevo-mailing";
import MailingStatsCard, { rateColor, pct } from "@/components/coach/MailingStatsCard";
import {
  audienceToStorageKey,
  storageKeyToAudience,
  describeAudience,
  wrapBrandedEmail,
  MAX_RECIPIENTS_PER_SEND,
} from "@/lib/mailing-audience";
import { getMailTemplatesByCategory, MAIL_TEMPLATES, type MailTemplate } from "@/lib/mail-templates";

// Axe 2 (VISION.md) : mailing par coach — segmentation par tag/liste sous
// le compte Brevo unique (décision prise avec l'utilisateur, 2026-08-14).
// Envoie de vrais emails à de vrais clients : jamais d'auto-envoi, chaque
// diffusion exige une confirmation explicite + un envoi de test d'abord
// possible.
//
// Mailing v2 (2026-08-18, retour direct sur cet onglet encore "en
// brouillon") : audience choisie (mes clients / tous les membres / coachs /
// liste Brevo existante, les 3 dernières réservées au propriétaire),
// dupliquer un envoi précédent, programmer un envoi, aperçu avant envoi
// réel avec la bannière de marque appliquée, refonte visuelle complète.

type AudienceType = "clients_actifs" | "tous_les_membres" | "coachs" | "liste_existante" | "contact_specifique";

const AUDIENCE_OPTIONS: { type: AudienceType; label: string; icon: React.ElementType; ownerOnly?: boolean }[] = [
  { type: "clients_actifs", label: "Mes clients actifs", icon: Users },
  // Retour direct 2026-09-10 ("à qui je veux en un clic") : disponible à
  // tout coach (recherche restreinte à ses propres clients côté serveur,
  // voir searchMailingContacts), pas réservé au propriétaire comme les
  // audiences larges ci-dessous.
  { type: "contact_specifique", label: "Une personne", icon: Search },
  { type: "tous_les_membres", label: "Tous les membres", icon: Globe2, ownerOnly: true },
  { type: "coachs", label: "Coachs", icon: UserCog, ownerOnly: true },
  { type: "liste_existante", label: "Liste Brevo existante", icon: ListIcon, ownerOnly: true },
];

function statusMeta(status: CoachMailing["status"]) {
  if (status === "sent") return { icon: CheckCircle2, color: "#4ade80", label: "Envoyé" };
  if (status === "scheduled") return { icon: CalendarClock, color: "#fbbf24", label: "Programmé" };
  return { icon: XCircle, color: "#f87171", label: "Échec" };
}

export default function CoachMailingComposer({
  initialHistory,
  brevoLists,
  isPlatformOwner,
}: {
  initialHistory: CoachMailing[];
  brevoLists: BrevoListSummary[];
  isPlatformOwner: boolean;
}) {
  const [history, setHistory] = useState(initialHistory);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialHistory change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

  // Suivi de performance (2026-09-16) : fusionne un snapshot rafraîchi par
  // MailingStatsCard.tsx dans l'historique local, sans attendre le
  // round-trip revalidatePath (voir refreshMailingStatsAction).
  function updateMailingStats(mailingId: string, stats: CampaignStats, fetchedAt: string) {
    setHistory((prev) => prev.map((m) => (m.id === mailingId ? { ...m, stats, stats_fetched_at: fetchedAt } : m)));
  }

  const statsEntries = useMemo(
    () => history.filter((m): m is CoachMailing & { stats: CampaignStats } => m.stats != null),
    [history]
  );

  // Résumé rapide (moyenne sur les 5 derniers envois avec stats déjà
  // récupérées) : une vraie valeur ajoutée pour un coach qui ouvre la page
  // sans avoir à comparer ligne par ligne — voir le bloc affiché sous le
  // composeur.
  const recentStatsEntries = useMemo(() => statsEntries.slice(0, 5), [statsEntries]);
  const avgOpenRate =
    recentStatsEntries.length > 0
      ? recentStatsEntries.reduce((sum, m) => sum + m.stats.openRate, 0) / recentStatsEntries.length
      : null;
  const avgClickRate =
    recentStatsEntries.length > 0
      ? recentStatsEntries.reduce((sum, m) => sum + m.stats.clickRate, 0) / recentStatsEntries.length
      : null;

  // Amélioration non demandée explicitement (voir rapport) : signale une
  // campagne dont le taux d'ouverture s'écroule par rapport aux autres
  // envois du coach — le signal utile pour savoir qu'il faut retravailler
  // l'objet, plutôt que de laisser un chiffre bas se noyer dans la liste.
  // Comparaison seulement à partir de 3 autres envois avec stats (sinon
  // pas assez de recul), et seulement si la moyenne des autres n'est pas
  // déjà elle-même très faible (sinon tout paraîtrait "anormalement bas").
  function lowOpenRateWarningFor(mailing: CoachMailing): boolean {
    if (!mailing.stats) return false;
    const others = statsEntries.filter((s) => s.id !== mailing.id);
    if (others.length < 3) return false;
    const avg = others.reduce((sum, s) => sum + s.stats.openRate, 0) / others.length;
    if (avg < 0.05) return false;
    return mailing.stats.openRate < avg * 0.5;
  }

  const [isRefreshingAll, startRefreshAllTransition] = useTransition();
  function refreshAllStats() {
    startRefreshAllTransition(async () => {
      await refreshAllMailingStatsAction();
      // revalidatePath dans l'action ci-dessus resynchronise initialHistory
      // (voir le useEffect juste au-dessus), qui contient alors les
      // stats_json à jour pour chaque ligne rafraîchie.
    });
  }

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState<AudienceType>("clients_actifs");
  const [selectedListId, setSelectedListId] = useState<number | null>(brevoLists[0]?.id ?? null);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  // Initialiseur paresseux (calculé une seule fois, au montage) plutôt que
  // Date.now() directement dans le JSX : un appel impur au moment du rendu
  // fait échouer la règle react-hooks/purity.
  const [minScheduleAt] = useState(() => new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Bibliothèque de modèles (retour direct 2026-09-10 : "améliore l'onglet,
  // mets une centaine de templates") — ~100 modèles prêts, groupés par
  // catégorie (voir lib/mail-templates.ts), filtrables par recherche. Choisir
  // un modèle préremplit juste le sujet/corps du composeur existant, rien de
  // plus : les destinataires et l'envoi restent exactement le même circuit
  // qu'avant (test, confirmation, historique).
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const templateGroups = useMemo(() => getMailTemplatesByCategory(), []);
  const filteredTemplateGroups = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return templateGroups;
    return templateGroups
      .map((g) => ({ ...g, templates: g.templates.filter((t) => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)) }))
      .filter((g) => g.templates.length > 0);
  }, [templateGroups, templateSearch]);

  function applyTemplate(t: MailTemplate) {
    setSubject(t.subject);
    setBody(t.body);
    setTestSent(false);
    setShowTemplates(false);
    setTemplateSearch("");
  }

  const selectedList = brevoLists.find((l) => l.id === selectedListId) ?? null;

  // Recherche "Une personne" (retour direct 2026-09-10) : un contact
  // sélectionné vaut 1 destinataire, aucun sélectionné vaut 0 — jamais
  // d'appel à getMailingRecipientCount pour ce type (il ne connaît que les
  // audiences par segment, pas la recherche libre).
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<MailingContactResult[]>([]);
  const [contactSearching, setContactSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<MailingContactResult | null>(null);

  useEffect(() => {
    if (audienceType !== "contact_specifique") return;
    const q = contactQuery.trim();
    if (q.length < 2) {
      setContactResults([]);
      return;
    }
    setContactSearching(true);
    const handle = setTimeout(() => {
      searchMailingContacts(q).then((r) => {
        setContactResults(r);
        setContactSearching(false);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [contactQuery, audienceType]);

  useEffect(() => {
    if (audienceType === "contact_specifique") {
      setRecipientCount(selectedContact ? 1 : 0);
      return;
    }
    if (audienceType === "liste_existante") {
      setRecipientCount(selectedList?.totalSubscribers ?? 0);
      return;
    }
    setRecipientCount(null);
    getMailingRecipientCount(audienceType).then((r) => setRecipientCount(r.count));
  }, [audienceType, selectedList, selectedContact]);

  const audienceKey = useMemo(() => {
    if (audienceType === "liste_existante" && selectedList) {
      return audienceToStorageKey({ type: "liste_existante", listId: selectedList.id, listName: selectedList.name });
    }
    if (audienceType === "contact_specifique" && selectedContact) {
      return audienceToStorageKey({ type: "contact_specifique", contactId: selectedContact.id, contactName: selectedContact.name });
    }
    return audienceToStorageKey(storageKeyToAudience(audienceType));
  }, [audienceType, selectedList, selectedContact]);

  const previewHtml = useMemo(() => wrapBrandedEmail(body || "<p><em>Ton message apparaîtra ici…</em></p>"), [body]);

  function resetComposer() {
    setSubject("");
    setBody("");
    setAudienceType("clients_actifs");
    setTestSent(false);
    setConfirming(false);
    setScheduleLater(false);
    setScheduledAtLocal("");
    setShowPreview(false);
    setSelectedContact(null);
    setContactQuery("");
    setContactResults([]);
  }

  function duplicateFromHistory(item: CoachMailing) {
    setSubject(item.subject);
    setBody(item.html_content ?? "");
    const parsed = storageKeyToAudience(item.audience);
    if (parsed.type === "liste_existante") {
      setAudienceType("liste_existante");
      setSelectedListId(parsed.listId || brevoLists[0]?.id || null);
    } else if (parsed.type === "tous_les_membres" || parsed.type === "coachs") {
      setAudienceType(parsed.type);
    } else {
      setAudienceType("clients_actifs");
    }
    setTestSent(false);
    setConfirming(false);
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function sendTest() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await sendTestMailing(subject, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTestSent(true);
    });
  }

  function confirmSend() {
    setError(null);

    // Envoi 1-1 (retour direct 2026-09-10) : circuit transactionnel direct,
    // jamais de programmation (pas de notion de "scheduledAt" côté
    // sendBrevoEmail, voir sendSingleMailing) — envoyé immédiatement.
    if (audienceType === "contact_specifique") {
      if (!selectedContact) return;
      startTransition(async () => {
        const result = await sendSingleMailing(subject, body, selectedContact.id);
        if (result.error) {
          setError(result.error);
          setConfirming(false);
          return;
        }
        setSuccess(`Envoyé à ${selectedContact.name}.`);
        setHistory((prev) => [
          {
            id: `tmp-${Date.now()}`,
            subject,
            html_content: body,
            audience: audienceKey,
            scheduled_at: null,
            recipient_count: 1,
            status: "sent",
            created_at: new Date().toISOString(),
            // Envoi 1-1 transactionnel : jamais de campagne Brevo, donc
            // jamais de statistiques possibles (voir MailingStatsCard.tsx).
            brevo_campaign_id: null,
            stats: null,
            stats_fetched_at: null,
          },
          ...prev,
        ]);
        resetComposer();
      });
      return;
    }

    const scheduledIso = scheduleLater && scheduledAtLocal ? new Date(scheduledAtLocal).toISOString() : undefined;
    startTransition(async () => {
      const result = await sendMailingToClients(subject, body, audienceKey, scheduledIso);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      const n = result.recipientCount ?? 0;
      setSuccess(
        (result.scheduled ? `Programmé pour ${n} destinataire${n > 1 ? "s" : ""}.` : `Envoyé à ${n} destinataire${n > 1 ? "s" : ""}.`) +
          (result.failedSyncCount
            ? ` Attention, ${result.failedSyncCount} contact${result.failedSyncCount > 1 ? "s n'ont" : " n'a"} pas pu être synchronisé${result.failedSyncCount > 1 ? "s" : ""} vers Brevo.`
            : "")
      );
      setHistory((prev) => [
        {
          id: `tmp-${Date.now()}`,
          subject,
          html_content: body,
          audience: audienceKey,
          scheduled_at: scheduledIso ?? null,
          recipient_count: n,
          status: result.scheduled ? "scheduled" : "sent",
          created_at: new Date().toISOString(),
          // Ligne temporaire remplacée par la vraie ligne (avec son
          // brevo_campaign_id réel) dès que revalidatePath resynchronise
          // initialHistory ci-dessus — pas de stats disponibles avant ça.
          brevo_campaign_id: null,
          stats: null,
          stats_fetched_at: null,
        },
        ...prev,
      ]);
      resetComposer();
    });
  }

  const overLimit = recipientCount != null && recipientCount > MAX_RECIPIENTS_PER_SEND;
  const canSend = !isPending && !!subject.trim() && !!body.trim() && !overLimit && !!recipientCount &&
    (audienceType !== "liste_existante" || !!selectedList) &&
    (audienceType !== "contact_specifique" || !!selectedContact) &&
    (audienceType === "contact_specifique" || !scheduleLater || !!scheduledAtLocal);

  return (
    <div>
      {/* ── Composer ── */}
      <div className="bg-[#1f0101] border border-[#890404]/30 rounded-2xl p-5 mb-6">
        {/* Audience */}
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-2">Destinataires</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {AUDIENCE_OPTIONS.filter((o) => !o.ownerOnly || isPlatformOwner).map(({ type, label, icon: Icon }) => {
            const active = audienceType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setAudienceType(type)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-lg border transition-colors"
                style={
                  active
                    ? { background: "rgba(224,30,30,0.15)", borderColor: "rgba(224,30,30,0.5)", color: "#E01E1E" }
                    : { background: "transparent", borderColor: "rgba(137,4,4,0.25)", color: "rgba(245,237,237,0.45)" }
                }
              >
                <Icon size={13} /> {label}
              </button>
            );
          })}
        </div>

        {audienceType === "liste_existante" && (
          <div className="mb-3">
            {brevoLists.length === 0 ? (
              <p className="text-[11px] text-[#F5EDED]/30 italic">Aucune liste Brevo trouvée sur le compte.</p>
            ) : (
              <div className="relative">
                <select
                  value={selectedListId ?? ""}
                  onChange={(e) => setSelectedListId(parseInt(e.target.value, 10))}
                  aria-label="Liste Brevo"
                  className="w-full appearance-none bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-[12.5px] text-white focus:outline-none focus:border-[#E01E1E]/60"
                >
                  {brevoLists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} · {l.totalSubscribers} contact{l.totalSubscribers > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/30 pointer-events-none" />
              </div>
            )}
          </div>
        )}

        {audienceType === "contact_specifique" && (
          <div className="mb-3">
            {selectedContact ? (
              <div className="flex items-center justify-between gap-2 bg-[#150000] border border-[#E01E1E]/40 rounded-lg px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-white truncate">{selectedContact.name}</p>
                  <p className="text-[10.5px] text-[#F5EDED]/35 truncate">{selectedContact.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedContact(null); setContactQuery(""); }}
                  aria-label="Changer de destinataire"
                  className="flex-shrink-0 text-[#F5EDED]/30 hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/30" />
                <input
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                  placeholder="Nom ou email de la personne"
                  aria-label="Chercher un destinataire"
                  className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg pl-8 pr-3 py-2.5 text-[12.5px] text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60"
                />
                {contactQuery.trim().length >= 2 && (
                  <div className="mt-1.5 bg-[#150000] border border-[#890404]/25 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {contactSearching ? (
                      <p className="px-3.5 py-2.5 text-[11px] text-[#F5EDED]/30">Recherche…</p>
                    ) : contactResults.length === 0 ? (
                      <p className="px-3.5 py-2.5 text-[11px] text-[#F5EDED]/30 italic">Aucune correspondance pour ce nom/email.</p>
                    ) : (
                      contactResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedContact(c); setContactQuery(""); setContactResults([]); }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-[#890404]/10 transition-colors border-b border-[#890404]/10 last:border-b-0"
                        >
                          <p className="text-[12px] font-bold text-white truncate">{c.name}</p>
                          <p className="text-[10.5px] text-[#F5EDED]/35 truncate">{c.email}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 mb-3 text-[11px] text-[#F5EDED]/40">
          <Users size={13} />
          {recipientCount == null
            ? "…"
            : `${recipientCount} destinataire${recipientCount > 1 ? "s" : ""} recevrai${recipientCount > 1 ? "ent" : "t"} ce mail`}
        </div>

        {/* Sujet / message */}
        <button
          type="button"
          onClick={() => setShowTemplates(true)}
          className="w-full mb-2 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F5EDED]/55 hover:text-[#E01E1E] border border-dashed border-[#890404]/35 hover:border-[#E01E1E]/50 rounded-lg py-2.5 transition-colors"
        >
          <LayoutTemplate size={13} /> Choisir un modèle ({MAIL_TEMPLATES.length} prêts)
        </button>
        <input
          value={subject}
          onChange={(e) => { setSubject(e.target.value); setTestSent(false); }}
          placeholder="Sujet"
          aria-label="Sujet"
          className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-4 py-3 text-[13px] text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60"
        />
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); setTestSent(false); }}
          placeholder="Ton message (HTML simple accepté : <b>, <a href>, <br>...)"
          aria-label="Ton message"
          rows={8}
          className="w-full mt-2 bg-[#150000] border border-[#890404]/30 rounded-lg px-4 py-3 text-[13px] text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 resize-y font-sans"
        />

        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/65 transition-colors"
        >
          {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
          {showPreview ? "Masquer l'aperçu" : "Aperçu avec la bannière de marque"}
        </button>

        {showPreview && (
          <div className="mt-2.5 rounded-lg overflow-hidden border border-[#890404]/25" style={{ height: 420 }}>
            <iframe
              title="Aperçu de l'email"
              srcDoc={previewHtml}
              sandbox=""
              className="w-full h-full"
              style={{ border: "none", background: "#0D0000" }}
            />
          </div>
        )}

        {/* Programmation — pas de notion de programmation pour un envoi 1-1
            (transactionnel, toujours immédiat, voir sendSingleMailing) */}
        {audienceType !== "contact_specifique" && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-dashed border-[#890404]/15">
          <button
            type="button"
            onClick={() => setScheduleLater((v) => !v)}
            className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest transition-colors"
            style={{ color: scheduleLater ? "#fbbf24" : "rgba(245,237,237,0.35)" }}
          >
            <CalendarClock size={13} />
            {scheduleLater ? "Envoi programmé" : "Envoyer maintenant"}
          </button>
          {scheduleLater && (
            <input
              type="datetime-local"
              value={scheduledAtLocal}
              min={minScheduleAt}
              aria-label="Date et heure d'envoi programmé"
              onChange={(e) => setScheduledAtLocal(e.target.value)}
              className="bg-[#150000] border border-[#890404]/30 rounded-lg px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-[#E01E1E]/60"
            />
          )}
        </div>
        )}

        {error && <p className="text-[12px] text-red-400 mt-2.5">{error}</p>}
        {success && <p className="text-[12px] text-green-400 mt-2.5">{success}</p>}
        {overLimit && (
          <p className="text-[11.5px] text-amber-400 mt-2.5">
            {recipientCount} destinataires dépasse le plafond de {MAX_RECIPIENTS_PER_SEND} par envoi (compte Brevo
            gratuit, partagé avec les emails critiques de l&apos;appli). Contacte-moi pour augmenter le plafond si besoin.
          </p>
        )}

        <div className="flex items-center gap-2 mt-3.5 flex-wrap">
          <button
            type="button"
            onClick={sendTest}
            disabled={isPending || !subject.trim() || !body.trim()}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F5EDED]/50 hover:text-[#F5EDED]/80 disabled:opacity-30 transition-colors border border-[#890404]/25 rounded-lg px-3 py-2.5"
          >
            <FlaskConical size={13} /> {testSent ? "Test envoyé ✓" : "Envoyer un test (à moi)"}
          </button>

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!canSend}
              className="ep-btn-primary disabled:opacity-40"
              style={{ height: 40, borderRadius: 999, paddingInline: 18 }}
            >
              <Send size={13} /> {scheduleLater ? "Programmer l'envoi" : "Envoyer"}
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11.5px] font-bold text-amber-400">
                Confirmer {scheduleLater ? "la programmation" : "l'envoi"} à {recipientCount} destinataire{(recipientCount ?? 0) > 1 ? "s" : ""} ?
              </span>
              <button
                type="button"
                onClick={confirmSend}
                disabled={isPending}
                className="ep-btn-primary disabled:opacity-60"
                style={{ height: 34, borderRadius: 999, paddingInline: 14, fontSize: 11.5 }}
              >
                {isPending ? "…" : "Oui"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="text-[11.5px] font-bold text-[#F5EDED]/40 hover:text-[#F5EDED]/70 border border-[#F5EDED]/15 rounded-full px-3 py-1.5 transition-colors"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Historique ── */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30">Historique</p>
            <button
              type="button"
              onClick={refreshAllStats}
              disabled={isRefreshingAll}
              className="inline-flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#E01E1E] disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={11} className={isRefreshingAll ? "animate-spin" : ""} />
              {isRefreshingAll ? "Actualisation…" : "Rafraîchir les stats"}
            </button>
          </div>

          {/* Résumé rapide : moyenne sur les envois déjà consultés (voir
              recentStatsEntries plus haut) — n'apparaît qu'une fois qu'il y
              a au moins 2 envois avec des stats à comparer. */}
          {recentStatsEntries.length >= 2 && avgOpenRate != null && avgClickRate != null && (
            <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3 mb-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
                Moyenne sur les {recentStatsEntries.length} derniers envois consultés
              </p>
              <div className="flex items-center gap-4">
                <span className="text-[14px] font-black" style={{ color: rateColor(avgOpenRate, [0.1, 0.2]) }}>
                  {pct(avgOpenRate)} <span className="text-[10px] font-bold text-[#F5EDED]/35">ouverture</span>
                </span>
                <span className="text-[14px] font-black" style={{ color: rateColor(avgClickRate, [0.01, 0.02]) }}>
                  {pct(avgClickRate)} <span className="text-[10px] font-bold text-[#F5EDED]/35">clic</span>
                </span>
              </div>
              <p className="mt-1.5 text-[10px] text-[#F5EDED]/35">
                Repère : un taux d&apos;ouverture correct tourne autour de 20 à 30%, un bon taux de clic autour de 2 à 5%.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {history.map((m) => {
              const meta = statusMeta(m.status);
              const StatusIcon = meta.icon;
              return (
                <div key={m.id} className="bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <StatusIcon size={13} style={{ color: meta.color, flexShrink: 0 }} />
                    <p className="flex-1 min-w-0 text-[12.5px] font-bold text-white truncate">{m.subject}</p>
                    {m.html_content && (
                      <button
                        type="button"
                        onClick={() => duplicateFromHistory(m)}
                        title="Dupliquer cet envoi"
                        aria-label="Dupliquer cet envoi"
                        className="flex-shrink-0 text-[#F5EDED]/25 hover:text-[#E01E1E] transition-colors"
                      >
                        <Copy size={13} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 pl-[21px]">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#F5EDED]/30">
                      {describeAudience(m.audience)}
                    </span>
                    <span className="text-[10.5px]" style={{ color: meta.color }}>
                      {m.status === "failed" ? "échec" : `${m.recipient_count} destinataire${m.recipient_count > 1 ? "s" : ""}`}
                    </span>
                    <span className="text-[10px] text-[#F5EDED]/25 flex items-center gap-1">
                      <Clock3 size={10} />
                      {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
                        new Date(m.scheduled_at ?? m.created_at)
                      )}
                    </span>
                  </div>
                  {m.status === "sent" && (
                    <div className="pl-[21px]">
                      <MailingStatsCard
                        mailingId={m.id}
                        brevoCampaignId={m.brevo_campaign_id}
                        stats={m.stats}
                        fetchedAt={m.stats_fetched_at}
                        lowOpenRateWarning={lowOpenRateWarningFor(m)}
                        onRefreshed={(stats, fetchedAt) => updateMailingStats(m.id, stats, fetchedAt)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bibliothèque de modèles ── */}
      {showTemplates && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-0 sm:px-4"
          onClick={() => setShowTemplates(false)}
        >
          <div
            className="ep-modal-panel relative w-full sm:max-w-2xl bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 border-b border-[#890404]/15 flex-shrink-0">
              <p className="text-sm font-black uppercase tracking-tight text-white">
                Modèles ({MAIL_TEMPLATES.length})
              </p>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                aria-label="Fermer"
                className="text-[#F5EDED]/40 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-[#890404]/15 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/30" />
                <input
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Chercher un modèle (bienvenue, relance, anniversaire...)"
                  aria-label="Chercher un modèle"
                  autoFocus
                  className="w-full bg-[#0D0000] border border-[#890404]/30 rounded-lg pl-8 pr-3 py-2.5 text-[12.5px] text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4">
              {filteredTemplateGroups.length === 0 ? (
                <p className="text-[12px] text-[#F5EDED]/30 italic text-center py-8">Aucun modèle ne correspond à cette recherche.</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {filteredTemplateGroups.map((g) => (
                    <div key={g.category}>
                      <p className="text-[9.5px] font-bold uppercase tracking-widest text-[#E01E1E]/70 mb-2">
                        {g.label} · {g.templates.length}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {g.templates.map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => applyTemplate(t)}
                            className="text-left bg-[#1f0101] hover:bg-[#2a0202] border border-[#890404]/20 hover:border-[#E01E1E]/40 rounded-lg px-3.5 py-2.5 transition-colors"
                          >
                            <p className="text-[12px] font-bold text-white truncate">{t.name}</p>
                            <p className="text-[10.5px] text-[#F5EDED]/40 truncate mt-0.5">{t.subject}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
