"use client";

import { useEffect, useRef, useState } from "react";
import { CloudRain, Waves, Wind, Fan, Play, Pause, Timer, Volume2 } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";

// Boîte à outils du soir (2026-10-08, retour direct : « dans l'onglet
// sommeil on est censé voir nos stats, comprendre des choses et avoir des
// sons pour s'endormir, de la méditation, des exercices de respiration »).
// Tout est généré en direct par le navigateur (Web Audio) : aucun fichier à
// télécharger, ça marche hors ligne, en boucle parfaite, avec un minuteur qui
// baisse le son doucement avant de couper.

type SoundKey = "pluie" | "ocean" | "ventilateur" | "blanc";

const SOUNDS: { key: SoundKey; label: string; sub: string; icon: React.ElementType }[] = [
  { key: "pluie", label: "Pluie douce", sub: "Le plus apaisant pour beaucoup", icon: CloudRain },
  { key: "ocean", label: "Océan", sub: "Vagues lentes, respiration calme", icon: Waves },
  { key: "ventilateur", label: "Ventilateur", sub: "Bruit grave et régulier", icon: Fan },
  { key: "blanc", label: "Bruit blanc", sub: "Couvre les bruits de la rue", icon: Wind },
];

function noiseBuffer(ctx: AudioContext, kind: "white" | "pink" | "brown"): AudioBuffer {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") d[i] = w * 0.5;
      else if (kind === "pink") {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    // Fondu aux bords pour une boucle sans clic.
    const fade = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      d[i] *= i / fade;
      d[len - 1 - i] *= i / fade;
    }
  }
  return buf;
}

function useSoundEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ stop: () => void; gain: GainNode } | null>(null);

  function stop(fadeSec = 0.6) {
    const n = nodesRef.current;
    const ctx = ctxRef.current;
    if (!n || !ctx) return;
    n.gain.gain.cancelScheduledValues(ctx.currentTime);
    n.gain.gain.setValueAtTime(n.gain.gain.value, ctx.currentTime);
    n.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeSec);
    const toStop = n;
    setTimeout(() => toStop.stop(), fadeSec * 1000 + 50);
    nodesRef.current = null;
  }

  function play(key: SoundKey, volume: number) {
    stop(0.3);
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    void ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const sources: AudioScheduledSourceNode[] = [];
    const loop = (kind: "white" | "pink" | "brown") => {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuffer(ctx, kind);
      s.loop = true;
      sources.push(s);
      return s;
    };

    if (key === "blanc") {
      const s = loop("white");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 9000;
      s.connect(lp).connect(master);
    } else if (key === "ventilateur") {
      const s = loop("brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 500;
      s.connect(lp).connect(master);
    } else if (key === "pluie") {
      const s = loop("pink");
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 400;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 6000;
      // Légère fluctuation, comme une averse qui va et vient.
      const amp = ctx.createGain();
      amp.gain.value = 0.85;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.13;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.15;
      lfo.connect(lfoGain).connect(amp.gain);
      sources.push(lfo);
      s.connect(hp).connect(lp).connect(amp).connect(master);
      const rumble = loop("brown");
      const rg = ctx.createGain();
      rg.gain.value = 0.35;
      rumble.connect(rg).connect(master);
    } else if (key === "ocean") {
      const s = loop("brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      const swell = ctx.createGain();
      swell.gain.value = 0.55;
      // Une vague toutes les ~9 secondes.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.11;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.45;
      lfo.connect(lfoGain).connect(swell.gain);
      sources.push(lfo);
      s.connect(lp).connect(swell).connect(master);
    }

    sources.forEach((s) => s.start());
    master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5);
    nodesRef.current = {
      gain: master,
      stop: () => {
        sources.forEach((s) => { try { s.stop(); } catch {} });
        master.disconnect();
      },
    };
  }

  function setVolume(v: number) {
    const n = nodesRef.current;
    const ctx = ctxRef.current;
    if (n && ctx) n.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
  }

  useEffect(() => () => stop(0.1), []);

  return { play, stop, setVolume };
}

function Sounds() {
  const t = useT();
  const engine = useSoundEngine();
  const [playing, setPlaying] = useState<SoundKey | null>(null);
  const [volume, setVol] = useState(0.5);
  const [minutes, setMinutes] = useState<number | null>(30);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState<string>("");

  useEffect(() => {
    if (!playing || !endsAt) return;
    const id = setInterval(() => {
      const ms = endsAt - Date.now();
      if (ms <= 0) {
        engine.stop(8); // le son baisse doucement pendant 8 s
        setPlaying(null);
        setEndsAt(null);
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${m}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(id);
  }, [playing, endsAt, engine]);

  function chooseTimer(m: number | null) {
    setMinutes(m);
    // eslint-disable-next-line react-hooks/purity -- gestionnaire de clic, pas le rendu
    if (playing) setEndsAt(m ? Date.now() + m * 60000 : null);
  }

  function toggle(key: SoundKey) {
    if (playing === key) {
      engine.stop();
      setPlaying(null);
      setEndsAt(null);
      return;
    }
    engine.play(key, volume);
    setPlaying(key);
    // eslint-disable-next-line react-hooks/purity -- gestionnaire de clic, pas le rendu
    setEndsAt(minutes ? Date.now() + minutes * 60000 : null);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {SOUNDS.map(({ key, label, sub, icon: Icon }) => {
          const on = playing === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="ep-press text-left rounded-xl p-3 transition-colors"
              style={{ background: on ? "linear-gradient(150deg, rgba(129,140,248,0.22), rgba(30,20,60,0.35))" : "rgba(245,237,237,0.04)", border: `1px solid ${on ? "rgba(129,140,248,0.55)" : "rgba(245,237,237,0.08)"}` }}
            >
              <span className="flex items-center justify-between">
                <Icon size={17} style={{ color: on ? "#a5b4fc" : "rgba(245,237,237,0.6)" }} />
                {on ? <Pause size={14} className="text-[#a5b4fc]" /> : <Play size={14} className="text-[#F5EDED]/35" />}
              </span>
              <span className="block mt-2 text-[13px] font-bold text-white">{t(label)}</span>
              <span className="block text-[11px] text-[#F5EDED]/45 leading-snug">{t(sub)}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <Volume2 size={14} className="text-[#F5EDED]/45 shrink-0" />
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => { const v = Number(e.target.value); setVol(v); engine.setVolume(v); }}
          aria-label={t("Volume")}
          className="flex-1 accent-[#818cf8]"
        />
      </div>
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        <Timer size={13} className="text-[#F5EDED]/45" />
        {[15, 30, 60, null].map((m) => (
          <button
            key={String(m)}
            type="button"
            onClick={() => chooseTimer(m)}
            className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
            style={{ borderColor: minutes === m ? "rgba(129,140,248,0.6)" : "rgba(245,237,237,0.12)", color: minutes === m ? "#c7d2fe" : "rgba(245,237,237,0.5)", background: minutes === m ? "rgba(129,140,248,0.12)" : "transparent" }}
          >
            {m ? `${m} min` : t("Toute la nuit")}
          </button>
        ))}
        {playing && endsAt && <span className="ml-auto text-[11px] text-[#F5EDED]/45 tabular-nums">{t("Arrêt dans {t}", { t: left })}</span>}
      </div>
    </div>
  );
}

// ── Respiration guidée ─────────────────────────────────────────────────────

type Phase = { label: string; sec: number; scale: number };
const PATTERNS: { key: string; label: string; sub: string; phases: Phase[]; cycles: number }[] = [
  {
    key: "coherence",
    label: "Cohérence cardiaque",
    sub: "5 s inspire, 5 s expire, 5 minutes. Calme le cœur et la tête.",
    phases: [{ label: "Inspire", sec: 5, scale: 1 }, { label: "Expire", sec: 5, scale: 0.45 }],
    cycles: 30,
  },
  {
    key: "478",
    label: "Respiration 4-7-8",
    sub: "Pour t'endormir vite : 4 cycles suffisent souvent.",
    phases: [{ label: "Inspire par le nez", sec: 4, scale: 1 }, { label: "Bloque", sec: 7, scale: 1 }, { label: "Expire par la bouche", sec: 8, scale: 0.45 }],
    cycles: 4,
  },
  {
    key: "carree",
    label: "Respiration carrée",
    sub: "4 temps égaux. Idéale quand tu rumines.",
    phases: [{ label: "Inspire", sec: 4, scale: 1 }, { label: "Bloque", sec: 4, scale: 1 }, { label: "Expire", sec: 4, scale: 0.45 }, { label: "Bloque", sec: 4, scale: 0.45 }],
    cycles: 8,
  },
];

function Breathing() {
  const t = useT();
  const [pattern, setPattern] = useState(PATTERNS[0]);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0); // index global de phase
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!running) return;
    const total = pattern.phases.length * pattern.cycles;
    const phase = pattern.phases[step % pattern.phases.length];
    const tick = setInterval(() => setCount((c) => Math.max(1, c - 1)), 1000);
    const next = setTimeout(() => {
      const n = step + 1;
      if (n >= total) {
        setRunning(false);
        setStep(0);
        return;
      }
      setCount(pattern.phases[n % pattern.phases.length].sec);
      setStep(n);
    }, phase.sec * 1000);
    if (navigator.vibrate) navigator.vibrate(30);
    return () => { clearInterval(tick); clearTimeout(next); };
  }, [running, step, pattern]);

  const phase = pattern.phases[step % pattern.phases.length];
  const scale = running ? phase.scale : 0.6;
  const cycle = Math.floor(step / pattern.phases.length) + 1;

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {PATTERNS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => { setPattern(p); setRunning(false); setStep(0); }}
            className="px-3 py-1.5 rounded-full text-[11.5px] font-bold border"
            style={{ borderColor: pattern.key === p.key ? "rgba(94,234,212,0.6)" : "rgba(245,237,237,0.12)", color: pattern.key === p.key ? "#99f6e4" : "rgba(245,237,237,0.55)", background: pattern.key === p.key ? "rgba(94,234,212,0.1)" : "transparent" }}
          >
            {t(p.label)}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-[#F5EDED]/55 mb-4">{t(pattern.sub)}</p>
      <div className="flex flex-col items-center py-2">
        <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div
            style={{
              position: "absolute", inset: 0, borderRadius: 999,
              background: "radial-gradient(circle at 50% 40%, rgba(94,234,212,0.45), rgba(45,212,191,0.12) 60%, transparent 72%)",
              transform: `scale(${scale})`,
              transition: `transform ${running ? phase.sec : 0.6}s ease-in-out`,
              boxShadow: "0 0 60px rgba(45,212,191,0.25)",
            }}
          />
          <div style={{ position: "relative", textAlign: "center" }}>
            <p className="text-[15px] font-bold text-white">{running ? t(phase.label) : t("Prêt ?")}</p>
            {running && <p className="text-3xl font-black text-white tabular-nums">{count}</p>}
          </div>
        </div>
        {running && <p className="text-[11px] text-[#F5EDED]/40 mt-2">{t("Cycle {c} sur {n}", { c: Math.min(cycle, pattern.cycles), n: pattern.cycles })}</p>}
        <button
          type="button"
          onClick={() => { setStep(0); setCount(pattern.phases[0].sec); setRunning((r) => !r); }}
          className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest"
          style={{ background: running ? "rgba(245,237,237,0.08)" : "linear-gradient(135deg, #14b8a6, #0f766e)", color: "#fff" }}
        >
          {running ? <><Pause size={13} /> {t("Arrêter")}</> : <><Play size={13} /> {t("Commencer")}</>}
        </button>
      </div>
    </div>
  );
}

// ── Méditation guidée ──────────────────────────────────────────────────────

const MEDITATIONS: { key: string; label: string; minutes: number; steps: { sec: number; text: string }[] }[] = [
  {
    key: "scan",
    label: "Scan corporel, 8 min",
    minutes: 8,
    steps: [
      { sec: 40, text: "Allonge-toi confortablement. Ferme les yeux. Laisse ton corps peser de tout son poids sur le matelas." },
      { sec: 45, text: "Respire lentement par le nez. À chaque expiration, laisse partir un peu de la tension de la journée." },
      { sec: 50, text: "Porte ton attention sur tes pieds. Sens leur poids, leur température. Relâche les orteils." },
      { sec: 50, text: "Remonte vers les mollets et les genoux. S'il y a une tension, respire dedans et laisse-la fondre." },
      { sec: 50, text: "Les cuisses, les hanches, le bas du dos. Tout devient lourd, chaud, détendu." },
      { sec: 50, text: "Le ventre se soulève et redescend tout seul. Tu n'as rien à contrôler." },
      { sec: 50, text: "La poitrine, les épaules. Laisse tomber les épaules loin des oreilles. Les bras deviennent lourds jusqu'au bout des doigts." },
      { sec: 50, text: "La nuque, la mâchoire. Desserre les dents. Le front se lisse, les yeux se reposent." },
      { sec: 60, text: "Tout ton corps est relâché. Si une pensée arrive, laisse-la passer comme un nuage, et reviens à ta respiration." },
      { sec: 35, text: "Reste dans ce calme. Tu peux t'endormir maintenant." },
    ],
  },
  {
    key: "pensees",
    label: "Calmer les pensées, 5 min",
    minutes: 5,
    steps: [
      { sec: 35, text: "Installe-toi. Inspire profondément, puis expire longuement par la bouche, deux fois." },
      { sec: 45, text: "Repense à ta journée une seule fois, comme un film en accéléré. Puis dis-toi : c'est fini pour aujourd'hui." },
      { sec: 50, text: "Pense à une chose qui s'est bien passée aujourd'hui, même petite. Reste quelques respirations avec elle." },
      { sec: 50, text: "Ce qui reste à faire demain peut attendre demain. Imagine que tu le poses dans une boîte que tu fermes." },
      { sec: 60, text: "Compte tes expirations de 1 à 10, puis recommence à 1. Si tu perds le fil, recommence simplement à 1." },
      { sec: 60, text: "Ton seul travail maintenant, c'est de te reposer. Bonne nuit." },
    ],
  },
];

function Meditation() {
  const t = useT();
  const [med, setMed] = useState(MEDITATIONS[0]);
  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(0);
  const [voice, setVoice] = useState(true);

  useEffect(() => {
    if (!running || idx >= med.steps.length) return;
    const step = med.steps[idx];
    if (voice && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t(step.text));
      u.lang = t("fr-FR");
      u.rate = 0.82;
      u.pitch = 0.95;
      window.speechSynthesis.speak(u);
    }
    const id = setTimeout(() => {
      if (idx + 1 >= med.steps.length) {
        setRunning(false);
        setIdx(0);
      } else setIdx(idx + 1);
    }, step.sec * 1000);
    return () => clearTimeout(id);
  }, [running, idx, med, voice, t]);

  useEffect(() => () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {MEDITATIONS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => { setMed(m); setRunning(false); setIdx(0); window.speechSynthesis?.cancel(); }}
            className="px-3 py-1.5 rounded-full text-[11.5px] font-bold border"
            style={{ borderColor: med.key === m.key ? "rgba(196,181,253,0.6)" : "rgba(245,237,237,0.12)", color: med.key === m.key ? "#ddd6fe" : "rgba(245,237,237,0.55)", background: med.key === m.key ? "rgba(167,139,250,0.12)" : "transparent" }}
          >
            {t(m.label)}
          </button>
        ))}
      </div>
      <div className="rounded-xl p-4 min-h-[110px] flex items-center" style={{ background: "linear-gradient(160deg, rgba(76,29,149,0.28), rgba(15,10,40,0.4))", border: "1px solid rgba(167,139,250,0.25)" }}>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 17, lineHeight: 1.45, color: "rgba(245,237,237,0.9)", margin: 0 }}>
          {running ? t(med.steps[idx].text) : t("Mets-toi au lit, lance la séance, et laisse-toi guider. Tu peux éteindre l'écran.")}
        </p>
      </div>
      {running && (
        <div className="h-1 rounded-full bg-white/10 mt-3 overflow-hidden">
          <div className="h-full bg-[#a78bfa] rounded-full transition-all" style={{ width: `${(idx / med.steps.length) * 100}%` }} />
        </div>
      )}
      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={() => { setIdx(0); setRunning((r) => !r); if (running) window.speechSynthesis?.cancel(); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest text-white"
          style={{ background: running ? "rgba(245,237,237,0.08)" : "linear-gradient(135deg, #8b5cf6, #5b21b6)" }}
        >
          {running ? <><Pause size={13} /> {t("Arrêter")}</> : <><Play size={13} /> {t("Commencer")}</>}
        </button>
        <label className="flex items-center gap-2 text-[11.5px] text-[#F5EDED]/55">
          <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} className="accent-[#a78bfa]" />
          {t("Voix qui guide")}
        </label>
      </div>
    </div>
  );
}

export default function SleepToolkit() {
  const t = useT();
  const [tab, setTab] = useState<"sons" | "respiration" | "meditation">("sons");
  return (
    <section className="rounded-2xl p-4" style={{ background: "linear-gradient(165deg, #0d0a1f 0%, #110000 70%)", border: "1px solid rgba(129,140,248,0.2)" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#a5b4fc]/80 mb-1">{t("Ce soir")}</p>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 700, fontSize: 18, color: "#F5EDED", margin: "0 0 12px" }}>{t("Pour t'endormir plus vite.")}</p>
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl mb-4" style={{ background: "rgba(245,237,237,0.05)" }}>
        {([["sons", "Sons"], ["respiration", "Respiration"], ["meditation", "Méditation"]] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className="py-2 rounded-lg text-[12px] font-bold transition-colors"
            style={{ background: tab === k ? "rgba(245,237,237,0.1)" : "transparent", color: tab === k ? "#fff" : "rgba(245,237,237,0.5)" }}
          >
            {t(label)}
          </button>
        ))}
      </div>
      {tab === "sons" && <Sounds />}
      {tab === "respiration" && <Breathing />}
      {tab === "meditation" && <Meditation />}
    </section>
  );
}
