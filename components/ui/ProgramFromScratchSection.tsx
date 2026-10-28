"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import { Wrench, ChevronDown, ChevronUp } from "lucide-react";
import ProgramBuilder from "@/components/program-builder/ProgramBuilder";
import type { ProgramInput, ProgramWithDays } from "@/utils/programs";
import type { TrainingGym } from "@/utils/training-gyms";

export default function ProgramFromScratchSection({
  clientId,
  gyms = [],
  saveProgram,
}: {
  clientId: string;
  gyms?: TrainingGym[];
  program: ProgramWithDays | null;
  saveProgram: (clientId: string, input: ProgramInput) => Promise<{ error?: string }>;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-(--ep-line)/30 hover:border-(--ep-line)/60 rounded-xl px-4 py-3.5 text-sm text-(--ep-ink)/40 hover:text-(--ep-ink)/70 transition-colors"
      >
        <Wrench size={14} strokeWidth={1.8} />
        {t("Créer mon programme sur mesure")}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-4">
          <ProgramBuilder
            mode="self"
            clientId={clientId}
            clientName="moi"
            program={null}
            gyms={gyms}
            saveProgram={saveProgram}
            backHref="/dashboard/client/program"
            programHref="/dashboard/client/program"
          />
        </div>
      )}
    </div>
  );
}
