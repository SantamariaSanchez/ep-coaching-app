"use client";

import { useState } from "react";
import { Wrench, ChevronDown, ChevronUp } from "lucide-react";
import ProgramEditor from "@/components/ui/ProgramEditor";
import type { ProgramInput, ProgramWithDays } from "@/utils/programs";

export default function ProgramFromScratchSection({
  clientId,
  saveProgram,
}: {
  clientId: string;
  program: ProgramWithDays | null;
  saveProgram: (clientId: string, input: ProgramInput) => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-[#890404]/30 hover:border-[#890404]/60 rounded-xl px-4 py-3.5 text-sm text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
      >
        <Wrench size={14} strokeWidth={1.8} />
        Créer mon programme sur mesure
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-4">
          <ProgramEditor
            clientId={clientId}
            program={null}
            saveProgram={saveProgram}
            successRedirect="/dashboard/client/program"
          />
        </div>
      )}
    </div>
  );
}
