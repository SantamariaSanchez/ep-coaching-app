import {
  Dumbbell, Briefcase, UtensilsCrossed, Moon, Car, Users, BookOpen, Coffee, Footprints,
  ClipboardCheck, Sparkles,
  type LucideIcon,
} from "lucide-react";

// Source unique pour les icônes de blocs d'agenda — utilisée à la fois par
// le grille/formulaire (WeeklyAgenda) et par l'aperçu du jour sur
// "Aujourd'hui" (AujourdhuiView), pour que le même bloc ait toujours le
// même symbole partout dans l'app. Fichier client safe (aucun import
// serveur) : peut être importé depuis n'importe quel composant "use client".

export interface AgendaPreset {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

// Couleurs = variables de thème (suivent l'apparence choisie), jamais une
// couleur codée en dur. Les blocs déjà en base gardent leur couleur.
export const AGENDA_PRESETS: AgendaPreset[] = [
  { key: "salle",      label: "Séance",      icon: Dumbbell,        color: "var(--ep-accent)" },
  { key: "repas",      label: "Repas",       icon: UtensilsCrossed, color: "var(--ep-warn)" },
  { key: "travail",    label: "Travail",     icon: Briefcase,       color: "var(--ep-info)" },
  { key: "trajet",     label: "Trajet",      icon: Car,             color: "var(--ep-ok)" },
  { key: "pas",        label: "Pas",         icon: Footprints,      color: "var(--ep-ok)" },
  { key: "pause",      label: "Pause",       icon: Coffee,          color: "var(--ep-gold)" },
  { key: "rendezvous", label: "Rendez-vous", icon: Users,           color: "var(--ep-pink)" },
  { key: "etude",      label: "Étude",       icon: BookOpen,        color: "var(--ep-info)" },
  { key: "sommeil",    label: "Sommeil",     icon: Moon,            color: "var(--ep-violet)" },
  { key: "bilan",      label: "Bilan",       icon: ClipboardCheck,  color: "var(--ep-violet)" },
  { key: "libre",      label: "Temps libre", icon: Sparkles,        color: "var(--ep-violet)" },
];

export const AGENDA_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  AGENDA_PRESETS.map((p) => [p.key, p.icon])
);
