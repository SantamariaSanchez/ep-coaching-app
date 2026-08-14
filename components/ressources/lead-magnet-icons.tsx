import {
  Dumbbell, ClipboardCheck, Target, Apple, AlertTriangle, Utensils, Flame,
  Moon, Brain, BedDouble, Activity, Flag, Users, TrendingUp, ClipboardList,
  Zap, Timer, Gauge, Repeat, CalendarClock, Coffee, ShieldCheck, Scale,
  Salad, Smartphone, ThumbsUp, Sparkles, PersonStanding, HeartPulse,
  MessageCircleWarning, Building2, Footprints, Layers, Compass, Rocket,
  Wallet, Handshake, Clock, Home, type LucideIcon,
} from "lucide-react";

// Registre unique des icônes disponibles pour un lead magnet (lib/lead-
// magnets.ts, champ `icon`, string libre). Avant, LeadMagnetsGrid.tsx et
// LeadMagnetLanding.tsx maintenaient chacun leur propre copie partielle de
// cette liste : un icône ajouté d'un côté sans l'autre retombait sur le
// fallback silencieusement (mauvais icône affiché sur la page individuelle
// ou la grille, jamais les deux en même temps). Un seul registre, importé
// des deux côtés, élimine ce risque de dérive.
export const MAGNET_ICONS: Record<string, LucideIcon> = {
  Dumbbell, ClipboardCheck, Target, Apple, AlertTriangle, Utensils, Flame,
  Moon, Brain, BedDouble, Activity, Flag, Users, TrendingUp, ClipboardList,
  Zap, Timer, Gauge, Repeat, CalendarClock, Coffee, ShieldCheck, Scale,
  Salad, Smartphone, ThumbsUp, Sparkles, PersonStanding, HeartPulse,
  MessageCircleWarning, Building2, Footprints, Layers, Compass, Rocket,
  Wallet, Handshake, Clock, Home,
};

export const DEFAULT_MAGNET_ICON = Target;

export function getMagnetIcon(icon: string): LucideIcon {
  return MAGNET_ICONS[icon] ?? DEFAULT_MAGNET_ICON;
}
