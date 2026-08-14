"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export interface NavShortcut {
  label: string;
  href: string;
}

interface ClientResult {
  id: string;
  full_name: string | null;
}

interface LibraryResult {
  key: string;
  label: string;
  category: "Aliment" | "Exercice" | "Salle" | "Science";
}

interface Result {
  key: string;
  label: string;
  sub: string;
  href: string;
}

// Item 38 : où renvoyer chaque type de contenu trouvé par /api/library-search
// — mêmes chemins que la nav (voir DashboardNav), pas de page dédiée par
// résultat individuel (les bibliothèques elles-mêmes ont leur propre
// recherche interne une fois sur place).
function libraryHref(category: LibraryResult["category"], isCoach: boolean): string {
  const base = isCoach ? "/dashboard/coach" : "/dashboard/client";
  switch (category) {
    case "Exercice":
    case "Salle":
      return `${base}/exercises`;
    case "Aliment":
      return isCoach ? "/dashboard/coach/moi/nutrition" : "/dashboard/client/nutrition";
    case "Science":
      return `${base}/science/recherche`;
  }
}

// Palette de commande (Cmd/Ctrl+K) : sauter directement à un client ou à
// une page de la nav sans repasser par sidebar > client > onglet à chaque
// fois — idée #5 du chantier. Rendue une seule fois dans DashboardNav
// (montée globalement), ouverte/fermée au clavier plutôt que par un
// déclencheur visible pour rester discrète tant qu'on ne s'en sert pas.
export default function CommandPalette({
  navItems,
  isCoach,
}: {
  navItems: NavShortcut[];
  isCoach: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientResult[] | null>(null);
  const [loadingClients, setLoadingClients] = useState(false);
  const [libraryResults, setLibraryResults] = useState<LibraryResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus l'input à l'ouverture. Les clients ne sont chargés qu'une fois,
  // à la première ouverture (pas à chaque montage de la nav) : pas besoin
  // d'alourdir chaque page pour une fonctionnalité qu'on n'utilise pas
  // forcément à chaque visite.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    if (isCoach && clients === null && !loadingClients) {
      setLoadingClients(true);
      fetch("/api/coach/clients-search")
        .then((r) => r.json())
        .then((d) => setClients(d.clients ?? []))
        .catch(() => setClients([]))
        .finally(() => setLoadingClients(false));
    }
    return () => cancelAnimationFrame(t);
  }, [open, isCoach, clients, loadingClients]);

  // Item 38 : recherche dans les bibliothèques de contenu (aliments,
  // exercices, salles, science) — débattue à 250ms pour ne pas taper
  // l'API à chaque frappe, coupée en dessous de 2 caractères comme côté
  // serveur (voir /api/library-search).
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    // En dessous de 2 caractères, aucun fetch : le rendu ignore de toute
    // façon libraryResults dans ce cas (voir plus bas), pas besoin de le
    // vider ici via un setState synchrone dans l'effet.
    if (q.length < 2) return;
    const t = setTimeout(() => {
      fetch(`/api/library-search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setLibraryResults(d.results ?? []))
        .catch(() => setLibraryResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [open, query]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const matchedClients: ClientResult[] =
    q && clients ? clients.filter((c) => c.full_name?.toLowerCase().includes(q)).slice(0, 6) : [];
  const matchedNav = q
    ? navItems.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 6)
    : navItems.slice(0, 8);
  // En dessous de 2 caractères, on ignore ce qui reste éventuellement de la
  // dernière recherche (voir l'effet ci-dessus) plutôt que de le vider via
  // un setState synchrone dans l'effet.
  const shownLibraryResults = q.length >= 2 ? libraryResults : [];

  const results: Result[] = [
    ...matchedClients.map((c) => ({
      key: `c-${c.id}`,
      label: c.full_name ?? "Sans nom",
      sub: "Client",
      href: `/dashboard/coach/clients/${c.id}`,
    })),
    ...shownLibraryResults.map((r) => ({
      key: r.key,
      label: r.label,
      sub: r.category,
      href: libraryHref(r.category, isCoach),
    })),
    ...matchedNav.map((n) => ({ key: `n-${n.href}`, label: n.label, sub: "Page", href: n.href })),
  ];

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDownInput(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) go(r.href);
    }
  }

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(13,0,0,0.7)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)", background: "#1f0101",
          border: "1px solid rgba(137,4,4,0.35)", borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid rgba(137,4,4,0.2)" }}>
          <Search size={16} style={{ color: "rgba(245,237,237,0.35)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={onKeyDownInput}
            placeholder={isCoach ? "Un client, une page, un exercice..." : "Une page, un exercice, un aliment..."}
            aria-label="Rechercher"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#F5EDED", fontSize: 14 }}
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(245,237,237,0.3)", padding: 2, display: "flex" }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ maxHeight: "50vh", overflowY: "auto", padding: 6 }}>
          {results.length === 0 && (
            <p style={{ padding: "20px 14px", fontSize: 12.5, color: "rgba(245,237,237,0.35)", textAlign: "center", margin: 0 }}>
              {loadingClients ? "Chargement des clients..." : "Aucun résultat"}
            </p>
          )}
          {results.map((r, i) => (
            <button
              key={r.key}
              onClick={() => go(r.href)}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: i === activeIndex ? "rgba(224,30,30,0.14)" : "transparent",
                color: i === activeIndex ? "#F5EDED" : "rgba(245,237,237,0.75)",
                fontSize: 13.5, fontWeight: 600,
              }}
            >
              <span>{r.label}</span>
              <span style={{ fontSize: 10, color: "rgba(245,237,237,0.3)", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0, marginLeft: 10 }}>
                {r.sub}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 14, padding: "8px 14px", borderTop: "1px solid rgba(137,4,4,0.2)", fontSize: 10.5, color: "rgba(245,237,237,0.25)" }}>
          <span>↑↓ naviguer</span>
          <span>↵ ouvrir</span>
          <span>esc fermer</span>
        </div>
      </div>
    </div>
  );
}
