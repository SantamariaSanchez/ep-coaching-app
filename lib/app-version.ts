import pkg from "@/package.json";

/** Version affichée dans Paramètres : numéro + empreinte du déploiement. */
export function appVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  return sha ? `${pkg.version} (${sha})` : pkg.version;
}
