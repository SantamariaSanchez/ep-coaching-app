import {
  Dumbbell, Briefcase, UtensilsCrossed, Moon, Car, Users, BookOpen, Coffee, Footprints,
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

export const AGENDA_PRESETS: AgendaPreset[] = [
  { key: "salle",      label: "Salle",       icon: Dumbbell,       color: "#E01E1E" },
  { key: "travail",    label: "Travail",     icon: Briefcase,      color: "#60a5fa" },
  { key: "repas",      label: "Repas",       icon: UtensilsCrossed, color: "#fbbf24" },
  { key: "sommeil",    label: "Sommeil",     icon: Moon,           color: "#a78bfa" },
  { key: "trajet",     label: "Trajet",      icon: Car,            color: "#4ade80" },
  { key: "rendezvous", label: "Rendez-vous", icon: Users,          color: "#f472b6" },
  { key: "etude",      label: "Étude",       icon: BookOpen,       color: "#60a5fa" },
  { key: "pause",      label: "Pause",       icon: Coffee,         color: "#fbbf24" },
  { key: "pas",        label: "Pas",         icon: Footprints,     color: "#4ade80" },
];

export const AGENDA_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  AGENDA_PRESETS.map((p) => [p.key, p.icon])
);
