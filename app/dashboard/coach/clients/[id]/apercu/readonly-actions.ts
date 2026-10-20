"use server";

// Actions factices de l'aperçu « Voir comme mon client » : les composants de
// l'espace client attendent des actions en props, l'aperçu leur passe
// celle-ci, qui n'écrit jamais rien. Double sécurité avec l'attribut `inert`
// du conteneur (rien n'est cliquable) : même déclenchée, aucune donnée du
// client ni du coach n'est modifiée.
export async function previewReadOnlyAction(..._args: unknown[]): Promise<{ error: string }> {
  void _args;
  return { error: "Aperçu en lecture seule : aucune modification possible." };
}
