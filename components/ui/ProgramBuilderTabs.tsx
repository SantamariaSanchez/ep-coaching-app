"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Pencil } from "lucide-react";
import ProgramCreatorWizard from "@/components/ui/ProgramCreatorWizard";
import ProgramEditor from "@/components/ui/ProgramEditor";
import type { ProgramWithDays, ProgramInput } from "@/utils/programs";

export default function ProgramBuilderTabs({
  clientId,
  program,
  saveProgram,
  successRedirect,
}: {
  clientId: string;
  program: ProgramWithDays | null;
  saveProgram: (clientId: string, input: ProgramInput) => Promise<{ error?: string }>;
  successRedirect?: string;
}) {
  const router = useRouter();
  // Pas encore de programme -> on propose le créateur guidé en premier ;
  // un programme existe déjà -> on retombe sur l'éditeur manuel par défaut.
  const [tab, setTab] = useState<"wizard" | "manual">(program ? "manual" : "wizard");

  return (
    <div>
      <div className="flex gap-1 mb-5 border-b border-[var(--color-ep-dark-red)]/20 overflow-x-auto">
        {[
          { key: "wizard" as const, label: "Créateur guidé", icon: Wand2 },
          { key: "manual" as const, label: "Construire moi-même", icon: Pencil },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
              tab === key
                ? "text-[var(--color-ep-red)] border-b-2 border-[var(--color-ep-red)]"
                : "text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "wizard" ? (
        <ProgramCreatorWizard
          clientId={clientId}
          saveProgram={saveProgram}
          onSaved={() => {
            router.push(successRedirect ?? "/dashboard/client/program");
            router.refresh();
          }}
        />
      ) : (
        <ProgramEditor
          clientId={clientId}
          program={program}
          saveProgram={saveProgram}
          successRedirect={successRedirect}
        />
      )}
    </div>
  );
}
