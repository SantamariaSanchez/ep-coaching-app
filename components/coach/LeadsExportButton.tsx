"use client";

import { Download } from "lucide-react";
import type { Lead } from "@/utils/leads";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export default function LeadsExportButton({ leads }: { leads: Lead[] }) {
  function handleExport() {
    const header = ["Date", "Lead magnet", "Email", "Téléphone"];
    const rows = leads.map((l) => [
      new Date(l.created_at).toISOString().split("T")[0],
      l.lead_magnet_slug,
      l.email ?? "",
      l.phone ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-ep-coaching-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={leads.length === 0}
      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#E01E1E] disabled:opacity-30 transition-colors border border-[#890404]/25 rounded-lg px-3 py-2"
    >
      <Download size={12} /> Exporter en CSV
    </button>
  );
}
