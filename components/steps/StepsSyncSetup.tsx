"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Apple, Check, ChevronDown, Copy, ExternalLink, KeyRound, RefreshCw, Smartphone, Trash2, Watch, AlertTriangle } from "lucide-react";
import type { StepsSyncStatus } from "@/utils/steps";
import { safeAction } from "@/lib/safe-action";

// Installation guidée de la synchro automatique des pas (2026-10-14).
// iPhone : un Raccourci lit Santé et envoie le total du jour sur
// /api/steps/ingest, déclenché par une automatisation (heures fixes, et à
// l'ouverture de l'appli EP Coaching). Android : même requête depuis une
// appli d'automatisation qui lit Health Connect. Oura : déjà intégré.

type Tab = "iphone" | "android" | "oura";

const noopSubscribe = () => () => {};

function ago(iso: string | null): string {
  if (!iso) return "jamais";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 36) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

function CopyField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé : le texte reste sélectionnable à la main.
    }
  }
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45 mb-1">{label}</p>
      <div className="flex items-stretch gap-2">
        <code className={`flex-1 min-w-0 rounded-lg bg-(--ep-s2) border border-(--ep-line)/30 px-3 py-2.5 text-[12px] text-(--ep-strong) break-all select-all ${secret ? "font-mono" : ""}`}>{value}</code>
        <button onClick={copy} aria-label={`${t("Copier")} ${label}`} className="w-11 min-h-[44px] flex-shrink-0 rounded-lg border border-(--ep-line)/30 flex items-center justify-center text-(--ep-ink)/70">
          {copied ? <Check size={16} className="text-(--ep-ok)" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

function Step({ n, title, children, done = false }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <li className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
          style={{ background: done ? "rgba(var(--ep-ok-rgb),0.15)" : "rgba(var(--ep-accent-rgb),0.15)", color: done ? "var(--ep-ok)" : "var(--ep-accent-hi2)" }}
        >
          {done ? <Check size={16} /> : n}
        </span>
        <p className="text-base font-black text-(--ep-strong)">{title}</p>
      </div>
      <div className="space-y-3 text-sm text-(--ep-ink)/75 leading-relaxed">{children}</div>
    </li>
  );
}

export default function StepsSyncSetup({
  status: initialStatus,
  endpoint,
  shortcutUrl,
  hasOura,
  ouraHref,
  backHref,
  createToken,
  revokeToken,
}: {
  status: StepsSyncStatus;
  endpoint: string;
  /** Lien iCloud du raccourci prêt à installer (NEXT_PUBLIC_STEPS_SHORTCUT_URL), quand il existe. */
  shortcutUrl: string | null;
  hasOura: boolean;
  ouraHref: string;
  backHref: string;
  createToken: () => Promise<{ error?: string; token?: string; status?: StepsSyncStatus }>;
  revokeToken: () => Promise<{ error?: string }>;
}) {
  const t = useT();
  const router = useRouter();
  const isAndroid = useSyncExternalStore(noopSubscribe, () => /android/i.test(navigator.userAgent), () => false);
  const [picked, setTab] = useState<Tab | null>(null);
  const tab: Tab = picked ?? (isAndroid ? "android" : "iphone");
  const [status, setStatus] = useState(initialStatus);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const hasKey = status.hasToken || !!token;
  const received = !!status.lastUsedAt;
  const headerValue = token ? `Bearer ${token}` : "Bearer eps_…";

  function create() {
    setError(null);
    startTransition(async () => {
      const res = await safeAction(() => createToken());
      if (res.error || !res.token) {
        setError(res.error ?? "Impossible de créer ta clé.");
        return;
      }
      setToken(res.token);
      if (res.status) setStatus(res.status);
    });
  }

  function revoke() {
    setError(null);
    startTransition(async () => {
      const res = await safeAction(() => revokeToken());
      if (res.error) {
        setError(res.error);
        return;
      }
      setToken(null);
      setConfirmRevoke(false);
      setStatus({ ...status, hasToken: false, hint: null, createdAt: null, lastUsedAt: null, lastSource: null });
    });
  }

  const keyBlock = (
    <>
      {!status.available && (
        <p className="flex items-start gap-2 text-xs text-(--ep-warn)">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {t("La synchro automatique n'est pas encore activée sur le serveur. Réessaie un peu plus tard.")}
        </p>
      )}
      {token ? (
        <>
          <CopyField label={t("Ta clé personnelle")} value={token} secret />
          <p className="text-xs text-(--ep-warn)">{t("Elle ne s'affiche qu'une fois. Ne la partage avec personne : elle permet d'écrire tes pas.")}</p>
        </>
      ) : hasKey ? (
        <p>
          {t("Ta clé est active")} (…{status.hint}). {t("Tu l'as perdue ? Crée-en une nouvelle, l'ancienne cessera aussitôt de marcher.")}
        </p>
      ) : (
        <p>{t("Elle permet à ton téléphone d'envoyer tes pas, et seulement tes pas.")}</p>
      )}
      {!token && (
        <button
          onClick={create}
          disabled={pending || !status.available}
          className={`w-full min-h-[44px] rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${hasKey ? "border border-(--ep-line)/40 text-(--ep-ink)/75" : "bg-(--ep-accent) text-(--ep-strong)"}`}
        >
          <KeyRound size={15} /> {hasKey ? t("Créer une nouvelle clé") : t("Créer ma clé")}
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {/* État */}
      <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-2xl p-4 flex items-center gap-3">
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: received ? "rgba(var(--ep-ok-rgb),0.15)" : "rgba(var(--ep-ink-rgb),0.06)", color: received ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.5)" }}
        >
          {received ? <Check size={18} /> : <RefreshCw size={18} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-(--ep-strong)">{received ? t("Synchro active") : hasOura ? t("Oura connectée") : t("Pas encore de synchro")}</p>
          <p className="text-xs text-(--ep-ink)/50">
            {received ? `${t("Dernière réception")} ${ago(status.lastUsedAt)}` : hasKey ? t("Clé créée, en attente d'un premier envoi.") : t("Suis les 3 étapes ci-dessous.")}
          </p>
        </div>
        <button onClick={() => router.refresh()} aria-label={t("Actualiser")} className="w-11 h-11 rounded-lg border border-(--ep-line)/30 flex items-center justify-center text-(--ep-ink)/60">
          <RefreshCw size={15} />
        </button>
      </div>

      {error && <p role="alert" className="text-xs text-(--ep-bad)">{t(error)}</p>}

      {/* Choix du téléphone */}
      <div role="tablist" aria-label={t("Ton téléphone")} className="grid grid-cols-3 gap-1 bg-(--ep-s2) rounded-xl p-1">
        {([
          ["iphone", "iPhone", Apple],
          ["android", "Android", Smartphone],
          ["oura", "Oura", Watch],
        ] as [Tab, string, typeof Apple][]).map(([k, label, Icon]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`min-h-[44px] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${tab === k ? "bg-(--ep-accent) text-(--ep-strong)" : "text-(--ep-ink)/55"}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "iphone" && (
        <ol className="space-y-3">
          <Step n={1} title={t("Crée ta clé")} done={hasKey}>
            {keyBlock}
          </Step>

          <Step n={2} title={t("Installe le raccourci")} done={received}>
            {shortcutUrl ? (
              <>
                <p>{t("Ouvre le lien sur ton iPhone, touche « Ajouter le raccourci », puis colle ta clé quand il te la demande.")}</p>
                <a href={shortcutUrl} target="_blank" rel="noopener noreferrer" className="w-full min-h-[44px] rounded-xl bg-(--ep-accent) text-(--ep-strong) text-sm font-bold flex items-center justify-center gap-2">
                  <ExternalLink size={15} /> {t("Ajouter le raccourci « Mes pas EP »")}
                </a>
                <p className="text-xs text-(--ep-ink)/50">{t("La première fois, autorise l'accès à Santé (nombre de pas) quand l'iPhone le demande.")}</p>
              </>
            ) : (
              <p>{t("Le raccourci prêt à installer arrive très vite. En attendant, tu peux le créer toi-même en 2 minutes :")}</p>
            )}
            <details className="group rounded-xl border border-(--ep-line)/25" open={!shortcutUrl}>
              <summary className="list-none cursor-pointer flex items-center gap-2 px-3 min-h-[44px] text-xs font-bold text-(--ep-ink)/70">
                <span className="flex-1">{shortcutUrl ? t("Ou le créer à la main") : t("Créer le raccourci à la main")}</span>
                <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
              </summary>
              <ol className="px-3 pb-3 space-y-2.5 text-[13px] list-decimal list-inside marker:font-bold marker:text-(--ep-accent-hi2)">
                <li>{t("App Raccourcis, touche +, nomme-le « Mes pas EP ».")}</li>
                <li>
                  {t("Ajoute l'action « Rechercher des échantillons de santé » :")} <b>{t("Type")}</b> {t("est")} <b>{t("Nombre de pas")}</b>, <b>{t("Date de début")}</b> {t("est")} <b>{t("aujourd'hui")}</b>, <b>{t("Grouper par")}</b> <b>{t("Jour")}</b>. {t("Le groupement évite de compter deux fois l'iPhone et la montre.")}
                </li>
                <li>{t("Ajoute « Calculer les statistiques » : Somme des échantillons.")}</li>
                <li>
                  {t("Ajoute « Obtenir le contenu de l'URL » avec l'adresse ci-dessous, Méthode")} <b>POST</b>, {t("un en-tête")} <b>Authorization</b> {t("et un corps de requête")} <b>JSON</b> {t("avec le champ")} <b>steps</b> ({t("Nombre")}) = {t("le résultat des statistiques")}.
                </li>
                <li>{t("Facultatif : « Obtenir la valeur du dictionnaire » message, puis « Afficher la notification » pour voir le chiffre envoyé.")}</li>
              </ol>
              <div className="px-3 pb-3 space-y-3">
                <CopyField label={t("Adresse (URL)")} value={endpoint} />
                <CopyField label={t("En-tête Authorization")} value={headerValue} secret />
                {!token && <p className="text-[11px] text-(--ep-ink)/45">{t("Ta clé complète ne s'affiche qu'à sa création (étape 1).")}</p>}
              </div>
            </details>
          </Step>

          <Step n={3} title={t("Automatise l'envoi")} done={received}>
            <p>{t("Dans Raccourcis, onglet Automatisation, touche + puis :")}</p>
            <ul className="space-y-2 text-[13px]">
              <li className="flex gap-2">
                <span className="text-(--ep-accent-hi2) font-black">•</span>
                <span>
                  <b>{t("Heure de la journée")}</b> : {t("par exemple 13 h, 19 h et 22 h 30, « Exécuter immédiatement », raccourci « Mes pas EP ». Crée une automatisation par heure.")}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-(--ep-accent-hi2) font-black">•</span>
                <span>
                  <b>{t("App")}</b> : {t("EP Coaching « Est ouverte », « Exécuter immédiatement ». Ton chiffre se met à jour à chaque fois que tu ouvres l'appli.")}
                </span>
              </li>
            </ul>
            <p className="text-xs text-(--ep-ink)/50">{t("Pour tester : lance le raccourci une fois à la main, puis touche Actualiser en haut de cette page.")}</p>
          </Step>
        </ol>
      )}

      {tab === "android" && (
        <ol className="space-y-3">
          <Step n={1} title={t("Crée ta clé")} done={hasKey}>
            {keyBlock}
          </Step>
          <Step n={2} title={t("Relie Health Connect")} done={received}>
            <p>
              {t("Sur Android, tes pas (Samsung Santé, Google Fit, Fitbit, ta montre...) sont regroupés dans Health Connect. L'appli EP Coaching tourne sur le web et ne peut pas le lire seule : une appli d'automatisation qui sait lire Health Connect et envoyer une requête web fait le pont.")}
            </p>
            <p>{t("Dans cette appli, crée une tâche qui lit le nombre de pas d'aujourd'hui puis envoie :")}</p>
            <CopyField label={t("Requête POST vers")} value={endpoint} />
            <CopyField label={t("En-tête Authorization")} value={headerValue} secret />
            <CopyField label={t("Corps JSON")} value={'{"steps": 8532, "source": "android"}'} />
            <p className="text-xs text-(--ep-ink)/50">{t("Remplace 8532 par la variable du nombre de pas. La date est facultative (aujourd'hui par défaut).")}</p>
          </Step>
          <Step n={3} title={t("Automatise l'envoi")} done={received}>
            <p>{t("Programme la tâche toutes les heures (ou à l'ouverture de l'appli EP Coaching). Une fois le premier envoi reçu, l'étape passe au vert.")}</p>
            <p className="text-xs text-(--ep-ink)/50">{t("Pas d'appli d'automatisation ? La saisie rapide (+1000, ou ton total) reste là en un tap sur l'onglet Steps.")}</p>
          </Step>
        </ol>
      )}

      {tab === "oura" && (
        <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-2xl p-4 space-y-3 text-sm text-(--ep-ink)/75 leading-relaxed">
          <p className="flex items-center gap-2 text-base font-black text-(--ep-strong)">
            <Watch size={16} className="text-(--ep-accent-hi2)" /> {hasOura ? t("Ta Oura est connectée") : t("Connecte ta Oura Ring")}
          </p>
          <p>
            {hasOura
              ? t("Tes pas de la veille arrivent tout seuls chaque matin. Pour voir ceux du jour en direct, ajoute aussi le raccourci iPhone ou Android.")
              : t("Une fois connectée, tes pas de la veille arrivent tout seuls chaque matin, avec ton sommeil et ta récupération.")}
          </p>
          {!hasOura && (
            <Link href={ouraHref} className="w-full min-h-[44px] rounded-xl bg-(--ep-accent) text-(--ep-strong) text-sm font-bold flex items-center justify-center">
              {t("Connecter Oura")}
            </Link>
          )}
        </div>
      )}

      {hasKey && (
        <div className="pt-2">
          {confirmRevoke ? (
            <div className="flex gap-2">
              <button onClick={revoke} disabled={pending} className="flex-1 min-h-[44px] rounded-xl border border-(--ep-bad)/40 text-(--ep-bad) text-sm font-bold disabled:opacity-50">
                {t("Oui, supprimer ma clé")}
              </button>
              <button onClick={() => setConfirmRevoke(false)} className="flex-1 min-h-[44px] rounded-xl border border-(--ep-line)/30 text-sm font-bold text-(--ep-ink)/70">
                {t("Annuler")}
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmRevoke(true)} className="w-full min-h-[44px] rounded-xl text-xs font-bold text-(--ep-ink)/45 flex items-center justify-center gap-2">
              <Trash2 size={13} /> {t("Supprimer ma clé (arrête la synchro)")}
            </button>
          )}
        </div>
      )}

      <Link href={backHref} className="block text-center min-h-[44px] leading-[44px] text-sm font-bold text-(--ep-accent-hi2)">
        {t("Retour à mes pas")}
      </Link>
    </div>
  );
}
