"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import {
  ONBOARDING_SECTIONS,
  INTAKE_FIELD_MAP,
  isNumericIntakeColumn,
  mapRadioToEnum,
} from "@/lib/onboarding-intake-config";

async function uploadPhoto(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  file: File,
  slot: string
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/onboarding/${slot}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("progress-photos")
    .upload(path, file, { contentType: file.type || "image/jpeg" });
  return error ? null : path;
}

export async function submitOnboardingIntake(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const admin = createAdminClient();
  const text = (key: string) => (formData.get(key) as string | null)?.trim() || null;

  // ── Champs traités individuellement (pas dans client_intake) ──────────
  const prenom = text("prenom");
  const nom = text("nom");
  const naissance = text("naissance");
  const sexe = text("sexe") as "Homme" | "Femme" | null;
  const poids = text("poids");

  if (prenom || nom) {
    await admin
      .from("profiles")
      .update({ full_name: [prenom, nom].filter(Boolean).join(" ") })
      .eq("id", user.id);
  }
  if (poids) {
    const w = parseFloat(poids);
    if (!Number.isNaN(w)) {
      await admin.from("profiles").update({ weight_start: w }).eq("id", user.id);
    }
  }

  // ── Champs génériques → client_intake, via INTAKE_FIELD_MAP ───────────
  const intakeUpdate: Record<string, unknown> = {
    date_of_birth: naissance || null,
    gender: sexe || null,
  };

  for (const section of ONBOARDING_SECTIONS) {
    for (const key of Object.keys(section.fields)) {
      const field = section.fields[key];
      const column = INTAKE_FIELD_MAP[key];
      if (!column) continue;
      const raw = text(key);
      if (raw === null) continue;

      if (field.type === "radio") {
        intakeUpdate[column] = mapRadioToEnum(key, raw);
      } else if (isNumericIntakeColumn(column)) {
        const n = parseFloat(raw);
        intakeUpdate[column] = Number.isNaN(n) ? null : n;
      } else {
        intakeUpdate[column] = raw;
      }
    }
  }

  // ── Photos : salle + physique (upload réel, plus besoin de les joindre à un mail) ──
  const gymFiles = formData.getAll("gym_photos").filter((f): f is File => f instanceof File && f.size > 0);
  const gymPaths = (
    await Promise.all(gymFiles.map((f, i) => uploadPhoto(supabase, user.id, f, `gym-${i}`)))
  ).filter((p): p is string => !!p);
  if (gymPaths.length > 0) intakeUpdate.gym_photo_paths = gymPaths;

  const physiqueSlots = ["face", "profil", "dos"];
  const physiquePaths: string[] = [];
  for (const slot of physiqueSlots) {
    const file = formData.get(`photo_${slot}`);
    if (file instanceof File && file.size > 0) {
      const path = await uploadPhoto(supabase, user.id, file, `physique-${slot}`);
      if (path) physiquePaths.push(path);
    }
  }
  if (physiquePaths.length > 0) intakeUpdate.physique_photo_paths = physiquePaths;

  const { error } = await admin
    .from("client_intake")
    .upsert(
      { client_id: user.id, ...intakeUpdate, updated_at: new Date().toISOString() },
      { onConflict: "client_id" }
    );
  if (error) return { error: "Erreur lors de l'enregistrement : " + error.message };

  revalidatePath("/dashboard/client");
  revalidatePath("/dashboard/coach/clients");
  return {};
}
