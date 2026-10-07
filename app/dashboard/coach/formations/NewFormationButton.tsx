"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createFormation } from "./actions";
import NewFormationModal from "./NewFormationModal";

export default function NewFormationButton() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleCreate(title: string, emoji: string) {
    const res = await createFormation(title, emoji);
    if (res.id) router.push(`/dashboard/coach/formations/${res.id}`);
    return res;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ep-btn-secondary"
        style={{ marginBottom: 16, alignSelf: "flex-start" }}
      >
        <Plus size={14} />
        {t("Nouvelle formation")}
      </button>
      {open && <NewFormationModal onCreate={handleCreate} onClose={() => setOpen(false)} />}
    </>
  );
}
