import { NextResponse } from "next/server";
import { ownerOfToken } from "@/lib/api-tokens";
import { createAdminClient } from "@/lib/supabase-admin";
import { insertNote, searchNotes } from "@/lib/notes";
import { getQuickAnswers } from "@/lib/quick-answers";
import { callExtraTool, toolsForRole } from "@/lib/mcp-tools";

// Connecteur personnel pour Claude (protocole MCP, transport HTTP sans
// état) : https://ep-coaching.vercel.app/api/mcp?key=<clé perso>, à
// ajouter dans Claude > Réglages > Connecteurs > Ajouter un connecteur
// personnalisé. Claude peut alors ranger des notes dans l'appli (depuis une
// conversation ou depuis Notion via le connecteur Notion) et lire les
// chiffres de la semaine. Chaque clé ne donne accès qu'aux données de son
// propriétaire.

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    name: "ajouter_note",
    description: "Ajoute une note dans EP Coaching (idée, résumé, compte rendu, page Notion importée...). Les #tags dans le texte servent à ranger.",
    inputSchema: {
      type: "object",
      properties: {
        texte: { type: "string", description: "Contenu de la note" },
        titre: { type: "string", description: "Titre (optionnel)" },
        tags: { type: "array", items: { type: "string" }, description: "Tags sans # (optionnel)" },
        lien: { type: "string", description: "Lien source, par exemple la page Notion (optionnel)" },
      },
      required: ["texte"],
    },
  },
  {
    name: "chercher_notes",
    description: "Cherche dans les notes EP Coaching de la personne.",
    inputSchema: { type: "object", properties: { requete: { type: "string" } }, required: ["requete"] },
  },
  {
    name: "notes_recentes",
    description: "Liste les dernières notes EP Coaching.",
    inputSchema: { type: "object", properties: { nombre: { type: "number", description: "1 à 30, 10 par défaut" } } },
  },
  {
    name: "chiffres_de_la_semaine",
    description: "Donne les chiffres clés de la semaine dans EP Coaching : poids, calories, sommeil, pas, séances, et côté coach clients, bilans, leads, paie de l'équipe.",
    inputSchema: { type: "object", properties: {} },
  },
];

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const ok = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const err = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const text = (t: string) => ({ content: [{ type: "text", text: t }] });

async function callTool(ownerId: string, name: string, args: Record<string, unknown>) {
  switch (name) {
    case "ajouter_note": {
      const id = await insertNote(ownerId, {
        text: String(args.texte ?? ""),
        title: typeof args.titre === "string" ? args.titre : undefined,
        tags: Array.isArray(args.tags) ? (args.tags as unknown[]).map(String) : undefined,
        sourceUrl: typeof args.lien === "string" && /^https?:\/\//.test(args.lien) ? args.lien : null,
      });
      return text(id ? "Note ajoutée dans EP Coaching." : "Note vide, rien d'ajouté.");
    }
    case "chercher_notes": {
      const found = await searchNotes(ownerId, String(args.requete ?? "").slice(0, 100), 10);
      return text(found.length ? found.map((n) => `- ${n.title} : ${n.excerpt}`).join("\n") : "Aucune note trouvée.");
    }
    case "notes_recentes": {
      const limit = Math.min(30, Math.max(1, Number(args.nombre ?? 10) || 10));
      const { data } = await createAdminClient().from("notes").select("title, body, tags, updated_at").eq("owner_id", ownerId).order("updated_at", { ascending: false }).limit(limit);
      const rows = (data ?? []) as { title: string; body: string; tags: string[]; updated_at: string }[];
      return text(rows.length ? rows.map((n) => `- ${n.title || "Sans titre"} ${n.tags.map((t) => `#${t}`).join(" ")}\n  ${n.body.replace(/\s+/g, " ").slice(0, 200)}`).join("\n") : "Aucune note pour l'instant.");
    }
    case "chiffres_de_la_semaine": {
      const { data: p } = await createAdminClient().from("profiles").select("role, is_platform_owner").eq("id", ownerId).maybeSingle();
      const answers = await getQuickAnswers(ownerId, p?.role === "coach" ? "coach" : "client", p?.is_platform_owner === true);
      return text(answers.map((a) => `- ${a.title} : ${a.value}${a.detail ? ` (${a.detail})` : ""}`).join("\n"));
    }
    default: {
      return callExtraTool(ownerId, await roleOf(ownerId), name, args);
    }
  }
}

async function roleOf(ownerId: string): Promise<"coach" | "client" | "staff"> {
  const admin = createAdminClient();
  const [{ data: p }, { data: staff }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", ownerId).maybeSingle(),
    admin.from("staff_members").select("user_id").eq("user_id", ownerId).limit(1).maybeSingle(),
  ]);
  if (p?.role === "coach") return "coach";
  return staff ? "staff" : "client";
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const ownerId = await ownerOfToken(url.searchParams.get("key") ?? bearer);
  const body = (await req.json().catch(() => null)) as RpcRequest | RpcRequest[] | null;
  if (!body) return NextResponse.json(err(null, -32700, "JSON invalide"), { status: 400 });
  if (!ownerId) return NextResponse.json(err(Array.isArray(body) ? null : body.id, -32001, "Clé EP Coaching invalide ou supprimée."), { status: 401 });

  const handle = async (m: RpcRequest) => {
    switch (m.method) {
      case "initialize":
        return ok(m.id, {
          protocolVersion: typeof m.params?.protocolVersion === "string" ? m.params.protocolVersion : "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "EP Coaching", version: "1.0.0" },
          instructions: "Connecteur personnel EP Coaching (coaching sportif et nutrition). Notes, bilan du jour, repas, records, et pour un coach : clients, stats réseaux, scripts du Studio et positionnement. Réponds en français, en tutoyant.",
        });
      case "ping":
        return ok(m.id, {});
      case "tools/list":
        return ok(m.id, { tools: [...TOOLS, ...toolsForRole(await roleOf(ownerId))] });
      case "tools/call": {
        const name = String(m.params?.name ?? "");
        const res = await callTool(ownerId, name, (m.params?.arguments as Record<string, unknown>) ?? {}).catch(() => text("Erreur côté EP Coaching, réessaie."));
        return res ? ok(m.id, res) : err(m.id, -32602, `Outil inconnu : ${name}`);
      }
      default:
        return m.id === undefined ? null : err(m.id, -32601, "Méthode non gérée");
    }
  };

  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handle))).filter(Boolean);
    return out.length ? NextResponse.json(out) : new NextResponse(null, { status: 202 });
  }
  const out = await handle(body);
  return out ? NextResponse.json(out) : new NextResponse(null, { status: 202 });
}

export async function GET() {
  return NextResponse.json({ error: "Connecteur MCP EP Coaching : utiliser POST (JSON-RPC)." }, { status: 405 });
}
