import {
  User, Video, MessageCircle, ClipboardCheck, Repeat, Zap, GraduationCap,
  type LucideIcon,
} from "lucide-react";
import type { LiveType } from "@/lib/live-types";

export const LIVE_TYPE_ICONS: Record<LiveType, LucideIcon> = {
  "1to1": User,
  webinaire: Video,
  qna: MessageCircle,
  audit: ClipboardCheck,
  checkin_hebdo: Repeat,
  acces_direct: Zap,
  atelier: GraduationCap,
};
