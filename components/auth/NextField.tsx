"use client";

import { useEffect, useState } from "react";

// Transmet ?next=... (page demandée avant la connexion) à l'action de
// connexion. Lu dans l'adresse après le montage : pas de useSearchParams,
// donc pas de Suspense à ajouter autour des formulaires. Le serveur valide
// toujours la valeur (lib/safe-next.ts).
export default function NextField() {
  const [next, setNext] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNext(new URLSearchParams(window.location.search).get("next") ?? "");
  }, []);
  return <input type="hidden" name="next" value={next} />;
}
