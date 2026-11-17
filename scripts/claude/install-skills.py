#!/usr/bin/env python3
"""Installe les compétences Claude d'Emmanuel dans ~/.claude/skills (chaque session).
Usage : python3 install-skills.py [dossier_de_clones]
Clone (shallow) chaque dépôt, garde les vrais SKILL.md (pas les tests, traductions,
copies pour d'autres agents), filtre les catalogues géants, n'écrase rien d'existant."""
import os, re, shutil, subprocess, sys

REPOS = """blader/humanizer heygen-com/hyperframes 21st-dev/magic-mcp bradautomates/claude-video
morluto/rea apify/apify-mcp-server googleworkspace/cli vercel-labs/skills stablyai/orca affaan-m/ECC
ethanplusai/sellbird obra/superpowers thedotmack/claude-mem pbakaus/impeccable
rebelytics/one-skill-to-rule-them-all Jakeschincariol/instagram-agent-skill emilkowalski/skills
leonxlnx/taste-skill Jakeschincariol/day-trader-skill alexyc9381/hiring-panel-skill
Vibha-Ramprakash/claude-video-effects mimurchison/claude-chief-of-staff wheresryan22/anatomy
HaydenLundin/marketing-psychology mvanhorn/last30days-skill Panniantong/agent-reach
lemomo-ai/lemo-opuscar dietrichgebert/ponytail NVIDIA/SkillSpector""".split()

# Catalogues trop gros : on ne garde que ce qui sert au business (contenu, vidéo, design, vente).
ALLOW = {
    "affaan-m/ECC": {"article-writing", "brand-discovery", "brand-voice", "content-engine", "deep-research",
        "design-system", "email-ops", "frontend-design-direction", "market-research", "marketing-campaign",
        "motion-advanced", "motion-foundations", "motion-patterns", "remotion-video-creation", "research-ops",
        "seo", "short-video-distribution", "social-publisher", "taste-distillation", "tasteforge-video",
        "video-editing", "ui-demo", "liquid-glass-design"},
    "googleworkspace/cli": {"gws-shared", "gws-gmail", "gws-calendar", "gws-drive", "gws-docs", "gws-sheets"},
}
CMD_REPOS = {"mimurchison/claude-chief-of-staff", "thedotmack/claude-mem"}
SKIP = re.compile(r"(^|/)(node_modules|tests?|__tests__|fixtures?|examples?|docs|i18n|registry|resources|"
                  r"\.openclaw|\.cursor-plugin|\.vc|\.automations|claude-mem-cursor|claude-mem-grok-bot|cowork|pi)(/|$)")

def main():
    base = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-skill-repos"
    dest = os.path.expanduser("~/.claude/skills")
    cmds = os.path.expanduser("~/.claude/commands")
    os.makedirs(dest, exist_ok=True); os.makedirs(base, exist_ok=True)
    total = 0
    for repo in REPOS:
        d = os.path.join(base, repo.replace("/", "__"))
        if not os.path.isdir(d):
            r = subprocess.run(["git", "clone", "-q", "--depth", "1", f"https://github.com/{repo}", d])
            if r.returncode:
                print(f"! clone impossible : {repo}"); continue
        found = []
        for root, dirs, files in os.walk(d):
            rel = os.path.relpath(root, d)
            if SKIP.search(rel) or "/.git" in root:
                dirs[:] = []; continue
            if "SKILL.md" in files:
                found.append(root)
        allow = ALLOW.get(repo)
        n = 0
        for src in found:
            name = os.path.basename(src) if src != d else repo.split("/")[1]
            if allow is not None and name not in allow:
                continue
            tgt = os.path.join(dest, name)
            if os.path.exists(tgt):
                continue
            shutil.copytree(src, tgt, ignore=shutil.ignore_patterns(".git", "node_modules"))
            n += 1
        # Commandes slash (chief of staff, etc.)
        for c in (("commands", ".claude/commands") if repo in CMD_REPOS else ()):
            cd = os.path.join(d, c)
            if os.path.isdir(cd):
                os.makedirs(cmds, exist_ok=True)
                for f in os.listdir(cd):
                    if f.endswith(".md") and not os.path.exists(os.path.join(cmds, f)):
                        shutil.copy(os.path.join(cd, f), cmds); n += 1
        total += n
        print(f"{repo:45s} {n:3d}")
    print(f"Total installé : {total}")

main()
