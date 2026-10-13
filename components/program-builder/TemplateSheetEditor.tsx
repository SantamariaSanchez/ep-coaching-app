"use client";

import { useRef } from "react";
import ProgramBuilder from "./ProgramBuilder";
import type { ProgramWithDays, ProgramInput } from "@/utils/programs";
import type { ProgramTemplateWithDays, ProgramTemplateInput } from "@/utils/program-templates";

// Modèles de programme dans le même tableur que les programmes clients
// (2026-10-13) : même outil, mêmes raccourcis, supersets et temps compris.
// Le premier enregistrement crée le modèle, les suivants le mettent à jour.
export default function TemplateSheetEditor({
  templateId,
  template,
  saveProgramTemplate,
}: {
  templateId: string | null;
  template: ProgramTemplateWithDays | null;
  saveProgramTemplate: (templateId: string | null, input: ProgramTemplateInput) => Promise<{ id?: string; error?: string }>;
}) {
  const idRef = useRef<string | null>(templateId);

  const asProgram: ProgramWithDays | null = template
    ? {
        id: template.id,
        client_id: "",
        name: template.name,
        type: template.type,
        frequency: template.frequency,
        created_at: template.created_at,
        is_active: true,
        objective: template.objective,
        coach_notes: template.notes,
        days: template.days.map((d) => ({
          id: d.id,
          program_id: template.id,
          day_label: d.day_label,
          position: d.position,
          notes: d.notes ?? null,
          exercises: d.exercises.map((e) => ({ ...e, day_id: d.id })),
        })),
      }
    : null;

  async function save(_clientId: string, input: ProgramInput) {
    const res = await saveProgramTemplate(idRef.current, {
      name: input.name,
      type: input.type,
      frequency: input.frequency,
      objective: input.objective ?? null,
      notes: input.coach_notes ?? null,
      days: input.days.map((d) => ({ ...d, weekday: null })),
    });
    if (res.id) idRef.current = res.id;
    return { error: res.error };
  }

  return (
    <ProgramBuilder
      mode="self"
      clientId={`modele-${templateId ?? "nouveau"}`}
      clientName="modèle"
      program={asProgram}
      saveProgram={save}
      backHref="/dashboard/coach/programmation"
      programHref="/dashboard/coach/programmation"
    />
  );
}
