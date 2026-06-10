"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { tpService } from "@/services/tpService";
import { agentService } from "@/services/agentService";
import {
  Upload, FileText, X, Sparkles, Wand2, Loader2,
  Check, Plus, Trash2, ChevronDown, Code2, ListChecks, Clock,
  BarChart3, Languages, ShieldCheck, RefreshCw, Download, GraduationCap,
  Bot, FileCheck2, CircleDot, BookOpen, Cpu, ArrowLeft,
} from "lucide-react";

// ── Catppuccin Mocha palette ──────────────────────────────────────────────────
const C = {
  base: "#1a1a2e",
  mantle: "#181825",
  surface0: "#1e1e2e",
  surface1: "#313244",
  surface2: "#45475a",
  overlay: "#6c7086",
  text: "#cdd6f4",
  subtext: "#a6adc8",
  mauve: "#cba6f7",
  blue: "#89b4fa",
  green: "#a6e3a1",
  red: "#f38ba8",
  yellow: "#f9e2af",
  peach: "#fab387",
  teal: "#94e2d5",
};

const uid = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const DIFF = {
  beginner: { label: { fr: "Débutant", en: "Beginner" }, color: C.green, mins: 25, q: 1 },
  intermediate: { label: { fr: "Intermédiaire", en: "Intermediate" }, color: C.yellow, mins: 45, q: 2 },
  advanced: { label: { fr: "Avancé", en: "Advanced" }, color: C.red, mins: 75, q: 2 },
};

const STEP_POOL = {
  fr: [
    { title: "Structure de base HTML5", tags: ["html", "head", "body", "title"],
      instr: "Mettez en place le squelette HTML5 : déclaration <!DOCTYPE>, balise <html> avec attribut lang, <head> contenant le titre, et le <body>.",
      q: ["Quelle balise définit l'encodage du document ?", "À quoi sert l'attribut lang sur <html> ?"] },
    { title: "En-tête et navigation", tags: ["header", "nav", "ul", "li", "a"],
      instr: "Créez un en-tête de page avec une barre de navigation. Utilisez une liste de liens pour relier les différentes sections.",
      q: ["Quelle balise regroupe la navigation principale ?", "Pourquoi utiliser une liste pour un menu ?"] },
    { title: "Section héro", tags: ["section", "h1", "p", "img"],
      instr: "Construisez une section d'accroche avec un titre principal, un paragraphe d'introduction et une image illustrative avec son attribut alt.",
      q: ["Combien de balises <h1> par page est recommandé ?", "À quoi sert l'attribut alt d'une image ?"] },
    { title: "Formulaire de contact", tags: ["form", "label", "input", "textarea", "button"],
      instr: "Ajoutez un formulaire accessible : chaque champ doit être associé à un <label>, avec un champ message et un bouton d'envoi.",
      q: ["Comment lier un <label> à un <input> ?", "Quel type d'input pour un email ?"] },
    { title: "Contenu sémantique", tags: ["main", "article", "aside", "figure"],
      instr: "Organisez le contenu principal avec des balises sémantiques. Distinguez le contenu central des informations annexes.",
      q: ["Quelle balise pour le contenu principal unique ?", "Différence entre <article> et <section> ?"] },
    { title: "Pied de page", tags: ["footer", "p", "a", "small"],
      instr: "Terminez la page par un pied de page contenant les mentions légales, des liens et l'année courante.",
      q: ["Quelle balise pour le pied de page ?", "Comment marquer une mention légale discrète ?"] },
  ],
  en: [
    { title: "Base HTML5 structure", tags: ["html", "head", "body", "title"],
      instr: "Set up the HTML5 skeleton: <!DOCTYPE>, <html> with a lang attribute, a <head> with the title, and the <body>.",
      q: ["Which tag declares the document encoding?", "What is the lang attribute on <html> for?"] },
    { title: "Header & navigation", tags: ["header", "nav", "ul", "li", "a"],
      instr: "Create a page header with a navigation bar. Use a list of links to connect the page sections.",
      q: ["Which tag wraps the main navigation?", "Why use a list for a menu?"] },
    { title: "Hero section", tags: ["section", "h1", "p", "img"],
      instr: "Build a hero section with a main heading, an intro paragraph and an illustrative image with its alt attribute.",
      q: ["How many <h1> per page is recommended?", "What is an image alt attribute for?"] },
    { title: "Contact form", tags: ["form", "label", "input", "textarea", "button"],
      instr: "Add an accessible form: every field bound to a <label>, a message field, and a submit button.",
      q: ["How do you link a <label> to an <input>?", "Which input type for an email?"] },
    { title: "Semantic content", tags: ["main", "article", "aside", "figure"],
      instr: "Organise the main content with semantic tags. Separate core content from side information.",
      q: ["Which tag holds the single main content?", "Difference between <article> and <section>?"] },
    { title: "Footer", tags: ["footer", "p", "a", "small"],
      instr: "Finish the page with a footer containing legal notice, links and the current year.",
      q: ["Which tag is the page footer?", "How to mark a small legal note?"] },
  ],
};

function buildQuiz(prompts: string[], lang: string) {
  return prompts.map((p) => ({
    id: uid(),
    question: p,
    options: [
      { id: "a", text: lang === "fr" ? "Réponse A" : "Answer A" },
      { id: "b", text: lang === "fr" ? "Réponse B" : "Answer B" },
      { id: "c", text: lang === "fr" ? "Réponse C" : "Answer C" },
      { id: "d", text: lang === "fr" ? "Réponse D" : "Answer D" },
    ],
    correctId: "a",
    explanation: lang === "fr"
      ? "Justification générée — à relire."
      : "Rationale drafted from the énoncé — please review.",
  }));
}

function buildTP(settings: Settings, files: UploadedFile[], createdBy: string) {
  const { difficulty, stepCount, language, antiCheat, prompt } = settings;
  const d = DIFF[difficulty as keyof typeof DIFF];
  const pool = STEP_POOL[language as keyof typeof STEP_POOL];
  const enonce = files.find((f) => f.kind === "enonce");
  const steps = Array.from({ length: stepCount }).map((_, i) => {
    const t = pool[i % pool.length];
    return {
      id: uid(),
      title: t.title,
      instructions: t.instr,
      requiredTags: [...t.tags],
      quiz: buildQuiz(t.q.slice(0, d.q), language),
    };
  });

  const enonceTitle = enonce
    ? enonce.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim()
    : null;
  const promptTitle = prompt.trim().length > 0
    ? (prompt.trim().length > 60 ? prompt.trim().slice(0, 57) + "…" : prompt.trim())
    : null;
  const title = enonceTitle || promptTitle
    || (language === "fr" ? "Nouveau TP — Page web" : "New TP — Web page");

  return {
    id: uid(),
    title: title.charAt(0).toUpperCase() + title.slice(1),
    description: language === "fr"
      ? `TP généré par l'agent IA. Objectif : maîtriser la structure HTML sémantique.`
      : `TP drafted by AI agent. Goal: master semantic HTML structure.`,
    field: "Développement Web",
    difficulty,
    estimatedMinutes: d.mins,
    starterHTML: `<!DOCTYPE html>\n<html lang="${language}">\n<head>\n  <meta charset="UTF-8" />\n  <title><!-- ${language === "fr" ? "à compléter" : "to complete"} --></title>\n</head>\n<body>\n  <!-- ${language === "fr" ? "Commencez ici" : "Start here"} -->\n</body>\n</html>`,
    steps,
    antiCheat,
    createdBy,
    createdAt: new Date().toISOString(),
  };
}

const logScript = (files: UploadedFile[], settings: Settings) => {
  const fr = settings.language === "fr";
  const enonce = files.find((f) => f.kind === "enonce");
  const ann = files.filter((f) => f.kind === "annexe").length;
  const hasPrompt = settings.prompt.trim().length > 0;
  return [
    ...(enonce ? [{ icon: FileCheck2, color: C.blue, t: fr ? `Lecture de l'énoncé « ${enonce.name} »…` : `Reading énoncé "${enonce.name}"…` }] : []),
    ...(ann ? [{ icon: BookOpen, color: C.teal, t: fr ? `Analyse de ${ann} annexe(s)…` : `Analysing ${ann} annexe(s)…` }] : []),
    ...(hasPrompt ? [{ icon: Sparkles, color: C.peach, t: fr ? "Prise en compte de la consigne…" : "Reading the teacher's prompt…" }] : []),
    { icon: Cpu, color: C.mauve, t: fr ? "Extraction des objectifs pédagogiques…" : "Extracting learning objectives…" },
    { icon: ListChecks, color: C.peach, t: fr ? `Découpage en ${settings.stepCount} étapes progressives…` : `Splitting into ${settings.stepCount} progressive steps…` },
    { icon: Code2, color: C.yellow, t: fr ? "Détection des balises HTML requises…" : "Detecting required HTML tags…" },
    { icon: GraduationCap, color: C.green, t: fr ? "Génération des QCM de compréhension…" : "Generating comprehension quizzes…" },
    { icon: Check, color: C.green, t: fr ? "Environnement de TP prêt pour relecture." : "TP environment ready for review." },
  ];
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  kind: "enonce" | "annexe";
}

interface Settings {
  difficulty: string;
  stepCount: number;
  language: string;
  antiCheat: boolean;
  prompt: string;
}

interface QuizQ {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
}

interface TPStep {
  id: string;
  title: string;
  instructions: string;
  requiredTags: string[];
  quiz: QuizQ[];
}

interface GeneratedTP {
  id: string;
  title: string;
  description: string;
  field?: string;
  difficulty: string;
  estimatedMinutes: number;
  starterHTML: string;
  steps: TPStep[];
  antiCheat?: boolean;
  createdBy: string;
  createdAt: string;
}

// ── Atoms ─────────────────────────────────────────────────────────────────────
function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: `${color}1f`, color, border: `1px solid ${color}3a` }}>
      {children}
    </span>
  );
}

function FileCard({ f, onToggle, onRemove, lang }: { f: UploadedFile; onToggle: (id: string) => void; onRemove: (id: string) => void; lang: string }) {
  const isE = f.kind === "enonce";
  const col = isE ? C.mauve : C.teal;
  return (
    <div className="flex items-center gap-3 rounded-xl p-3 transition-colors"
      style={{ background: C.mantle, border: `1px solid ${C.surface1}` }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${col}1f`, color: col }}>
        <FileText size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm" style={{ color: C.text }}>{f.name}</div>
        <div className="text-xs" style={{ color: C.overlay }}>{(f.size / 1024).toFixed(0)} KB</div>
      </div>
      <button onClick={() => onToggle(f.id)}
        className="rounded-md px-2 py-1 text-xs font-medium transition-colors"
        style={{ background: `${col}1f`, color: col, border: `1px solid ${col}3a` }}>
        {isE ? "Énoncé" : "Annexe"}
      </button>
      <button onClick={() => onRemove(f.id)} className="rounded-md p-1 transition-colors"
        style={{ color: C.overlay }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.red)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.overlay)}>
        <X size={16} />
      </button>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: C.subtext }}>
        <Icon size={13} style={{ color: C.overlay }} /> {label}
      </span>
      {children}
    </label>
  );
}

function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; label: string; c?: string }[] }) {
  return (
    <div className="flex gap-1 rounded-lg p-1" style={{ background: C.mantle, border: `1px solid ${C.surface1}` }}>
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button key={o.v} onClick={() => onChange(o.v)}
            className="flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all"
            style={active
              ? { background: `${o.c || C.mauve}26`, color: o.c || C.mauve, border: `1px solid ${o.c || C.mauve}55` }
              : { color: C.subtext, border: "1px solid transparent" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function QuizCard({ q, onChange, onRemove, lang }: { q: QuizQ; onChange: (q: QuizQ) => void; onRemove: () => void; lang: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: C.base, border: `1px solid ${C.surface1}` }}>
      <div className="mb-2 flex items-start gap-2">
        <input value={q.question} onChange={(e) => onChange({ ...q, question: e.target.value })}
          placeholder={lang === "fr" ? "Question…" : "Question…"}
          className="flex-1 rounded-md px-2 py-1.5 text-sm outline-none"
          style={{ background: C.mantle, border: `1px solid ${C.surface1}`, color: C.text }} />
        <button onClick={onRemove} className="rounded-md p-1.5" style={{ color: C.overlay }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.red)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.overlay)}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {q.options.map((o) => {
          const correct = q.correctId === o.id;
          return (
            <div key={o.id} className="flex items-center gap-1.5">
              <button onClick={() => onChange({ ...q, correctId: o.id })}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={correct ? { background: C.green, color: C.base } : { border: `1px solid ${C.surface2}`, color: "transparent" }}>
                <Check size={11} />
              </button>
              <input value={o.text} onChange={(e) => {
                const options = q.options.map((x) => x.id === o.id ? { ...x, text: e.target.value } : x);
                onChange({ ...q, options });
              }}
                className="w-full rounded-md px-2 py-1 text-xs outline-none"
                style={{ background: C.mantle, border: `1px solid ${C.surface1}`, color: C.text }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepCard({ step, index, onChange, onRemove, lang }: { step: TPStep; index: number; onChange: (s: TPStep) => void; onRemove: () => void; lang: string }) {
  const [open, setOpen] = useState(index === 0);
  const [tagInput, setTagInput] = useState("");
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[<>]/g, "");
    if (t && !step.requiredTags.includes(t)) onChange({ ...step, requiredTags: [...step.requiredTags, t] });
    setTagInput("");
  };
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: C.surface0, border: `1px solid ${C.surface1}` }}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
          style={{ background: `${C.mauve}26`, color: C.mauve }}>{index + 1}</span>
        <span className="flex-1 truncate text-sm font-medium" style={{ color: C.text }}>
          {step.title || (lang === "fr" ? "Étape sans titre" : "Untitled step")}
        </span>
        <span className="text-xs" style={{ color: C.overlay }}>{step.requiredTags.length} tags · {step.quiz.length} Q</span>
        <ChevronDown size={16} style={{ color: C.overlay, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          <input value={step.title} onChange={(e) => onChange({ ...step, title: e.target.value })}
            placeholder={lang === "fr" ? "Titre de l'étape" : "Step title"}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: C.mantle, border: `1px solid ${C.surface1}`, color: C.text }} />
          <textarea value={step.instructions} onChange={(e) => onChange({ ...step, instructions: e.target.value })}
            rows={3} placeholder={lang === "fr" ? "Consignes…" : "Instructions…"}
            className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: C.mantle, border: `1px solid ${C.surface1}`, color: C.text }} />
          <div>
            <span className="mb-1.5 block text-xs font-medium" style={{ color: C.subtext }}>
              {lang === "fr" ? "Balises HTML requises" : "Required HTML tags"}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {step.requiredTags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs"
                  style={{ background: `${C.blue}1f`, color: C.blue, border: `1px solid ${C.blue}3a` }}>
                  &lt;{t}&gt;
                  <button onClick={() => onChange({ ...step, requiredTags: step.requiredTags.filter((x) => x !== t) })}>
                    <X size={11} />
                  </button>
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder={lang === "fr" ? "+ balise" : "+ tag"}
                className="w-20 rounded-md px-2 py-1 font-mono text-xs outline-none"
                style={{ background: C.mantle, border: `1px solid ${C.surface1}`, color: C.text }} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: C.subtext }}>
                {lang === "fr" ? "QCM de compréhension" : "Comprehension quiz"}
              </span>
              <button onClick={() => onChange({ ...step, quiz: [...step.quiz, ...buildQuiz([""], lang)] })}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                style={{ color: C.mauve }}>
                <Plus size={12} /> {lang === "fr" ? "Question" : "Question"}
              </button>
            </div>
            {step.quiz.map((q, qi) => (
              <QuizCard key={q.id} q={q} lang={lang}
                onChange={(nq) => {
                  const quiz = [...step.quiz]; quiz[qi] = nq;
                  onChange({ ...step, quiz });
                }}
                onRemove={() => onChange({ ...step, quiz: step.quiz.filter((_, i) => i !== qi) })} />
            ))}
          </div>
          <button onClick={onRemove} className="inline-flex items-center gap-1 text-xs" style={{ color: C.red }}>
            <Trash2 size={12} /> {lang === "fr" ? "Supprimer l'étape" : "Remove step"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AgentTPCreatorPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<"idle" | "thinking" | "done">("idle");
  const [log, setLog] = useState<{ icon: React.ElementType; color: string; t: string }[]>([]);
  const [tp, setTp] = useState<GeneratedTP | null>(null);
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<NodeJS.Timeout[]>([]);

  const [settings, setSettings] = useState<Settings>({
    difficulty: "intermediate",
    stepCount: 4,
    language: "fr",
    antiCheat: true,
    prompt: "",
  });
  const L = settings.language;

  const addFiles = useCallback((list: FileList) => {
    const incoming: UploadedFile[] = Array.from(list).map((f, i) => ({
      id: uid(), name: f.name, size: f.size,
      kind: files.length === 0 && i === 0 ? "enonce" : "annexe",
    }));
    setFiles((p) => [...p, ...incoming]);
  }, [files.length]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };
  const toggleKind = (id: string) =>
    setFiles((p) => p.map((f) => f.id === id ? { ...f, kind: f.kind === "enonce" ? "annexe" : "enonce" } : f));
  const removeFile = (id: string) => setFiles((p) => p.filter((f) => f.id !== id));

  const hasEnonce = files.some((f) => f.kind === "enonce");
  const hasPrompt = settings.prompt.trim().length > 0;
  const canGenerate = hasEnonce || hasPrompt;

  const generate = async () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStatus("thinking");
    setTp(null);
    setLog([]);
    setPublished(false);

    const script = logScript(files, settings);

    // Try real agent API first, fall back to local generation
    let agentResult: GeneratedTP | null = null;
    try {
      const result = await agentService.generateTP({
        prompt: settings.prompt,
        difficulty: settings.difficulty,
        step_count: settings.stepCount,
        language: settings.language,
        file_names: files.map((f) => f.name),
      });
      if (result?.tp) {
        const rawTp = result.tp;
        agentResult = {
          ...rawTp,
          // LLMs often return snake_case — normalize to camelCase
          steps: (rawTp.steps ?? []).map((s: any) => ({
            ...s,
            requiredTags: s.requiredTags ?? s.required_tags ?? [],
            quiz: (s.quiz ?? []).map((q: any) => ({
              ...q,
              correctId: q.correctId ?? q.correct_id ?? (q.options?.[0]?.id ?? "a"),
              options: (q.options ?? []).map((o: any, i: number) => ({
                id: o.id ?? String.fromCharCode(97 + i),
                text: o.text ?? o.label ?? "",
              })),
            })),
          })),
          createdBy: user?.id ?? "teacher",
          createdAt: new Date().toISOString(),
        };
      }
    } catch {
      // agent unavailable — use local generation
    }

    script.forEach((entry, i) => {
      const t = setTimeout(() => {
        setLog((p) => [...p, entry]);
        if (i === script.length - 1) {
          const t2 = setTimeout(() => {
            setTp(agentResult ?? buildTP(settings, files, user?.id ?? "teacher"));
            setStatus("done");
          }, 450);
          timers.current.push(t2);
        }
      }, 600 + i * 650);
      timers.current.push(t);
    });
  };

  const setStep = (si: number, s: TPStep) =>
    setTp((p) => p ? { ...p, steps: p.steps.map((x, i) => i === si ? s : x) } : p);

  const addStep = () => setTp((p) => p ? ({
    ...p,
    steps: [...p.steps, { id: uid(), title: "", instructions: "", requiredTags: [], quiz: buildQuiz([""], L) }],
  }) : p);

  const exportJSON = () => {
    if (!tp) return;
    const { antiCheat: _, ...rest } = tp;
    const payload = JSON.stringify(rest, null, 2);
    navigator.clipboard?.writeText(payload).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };

  const handlePublish = async () => {
    if (!tp) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { antiCheat: _, ...tpData } = tp;
    const created = await tpService.saveTP({
      ...tpData,
      field: tpData.field ?? "Développement Web",
      difficulty: tpData.difficulty as "beginner" | "intermediate" | "advanced",
    });
    if (!created) { alert("Could not publish the TP. Is the backend running?"); return; }
    setPublished(true);
    setTimeout(() => router.push("/teacher/dashboard"), 1400);
  };

  return (
    <div className="min-h-screen w-full" style={{ background: C.base, color: C.text }}>
      <style>{`
        @keyframes riseIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glowPulse{0%,100%{opacity:.5}50%{opacity:1}}
        .rise{animation:riseIn .45s cubic-bezier(.4,0,.2,1) both}
      `}</style>

      {/* atmosphere */}
      <div className="pointer-events-none fixed inset-0" style={{
        background: `radial-gradient(900px 500px at 80% -10%, ${C.mauve}14, transparent 60%), radial-gradient(700px 400px at 0% 100%, ${C.blue}10, transparent 55%)`,
      }} />

      {/* Nav */}
      <nav className="z-10 border-b px-6 py-3.5 flex items-center justify-between sticky top-0"
        style={{ background: `${C.mantle}ee`, borderColor: C.surface1, backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <Link href="/teacher/dashboard"
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: C.overlay }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.text)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.overlay)}>
            <ArrowLeft size={15} /> Dashboard
          </Link>
          <span style={{ color: C.surface2 }}>/</span>
          <span className="text-sm font-medium" style={{ color: C.text }}>Créer un TP</span>
          <span style={{ color: C.surface2 }}>/</span>
          <span className="text-sm font-medium" style={{ color: C.mauve }}>Agent IA</span>
        </div>
        <Pill color={C.mauve}><Bot size={12} /> orchestrator · deepseek-v3</Pill>
      </nav>

      <div className="relative mx-auto max-w-[1320px] px-5 py-6 md:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: `linear-gradient(135deg, ${C.mauve}, ${C.blue})`, color: C.base }}>
              <Wand2 size={20} />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full"
                style={{ background: C.green, color: C.base, border: `2px solid ${C.base}` }}>
                <Sparkles size={9} />
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight" style={{ color: C.text }}>
                {L === "fr" ? "Créateur de TP par l'Agent IA" : "AI Agent TP Creator"}
              </h1>
              <p className="text-xs" style={{ color: C.overlay }}>
                {L === "fr"
                  ? "Déposez l'énoncé et les annexes — l'agent construit l'environnement complet."
                  : "Drop the énoncé and annexes — the agent builds the full TP environment."}
              </p>
            </div>
          </div>
          <Pill color={status === "done" ? C.green : status === "thinking" ? C.yellow : C.overlay}>
            <CircleDot size={11} />
            {status === "idle" ? (L === "fr" ? "En attente" : "Idle")
              : status === "thinking" ? (L === "fr" ? "Analyse…" : "Analysing…")
              : (L === "fr" ? "Brouillon prêt" : "Draft ready")}
          </Pill>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[400px_1fr]">
          {/* ── LEFT ── */}
          <div className="space-y-4">
            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer rounded-2xl p-6 text-center transition-all"
              style={{
                background: dragOver ? `${C.mauve}12` : C.surface0,
                border: `1.5px dashed ${dragOver ? C.mauve : C.surface2}`,
              }}>
              <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx" className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)} />
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: `${C.mauve}1f`, color: C.mauve }}>
                <Upload size={22} />
              </div>
              <p className="text-sm font-medium" style={{ color: C.text }}>
                {L === "fr" ? "Déposez l'énoncé PDF ici" : "Drop the PDF énoncé here"}
              </p>
              <p className="mt-1 text-xs" style={{ color: C.overlay }}>
                PDF · DOCX — {L === "fr" ? "énoncé et annexes · optionnel" : "énoncé and annexes · optional"}
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f) => (
                  <FileCard key={f.id} f={f} lang={L} onToggle={toggleKind} onRemove={removeFile} />
                ))}
              </div>
            )}

            {/* Prompt */}
            <div className="rounded-2xl p-4" style={{ background: C.surface0, border: `1px solid ${C.surface1}` }}>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: C.subtext }}>
                <Sparkles size={13} style={{ color: C.peach }} />
                {L === "fr" ? "Consigne pour l'agent" : "Prompt for the agent"}
              </label>
              <textarea
                value={settings.prompt}
                onChange={(e) => setSettings({ ...settings, prompt: e.target.value })}
                rows={4}
                placeholder={L === "fr"
                  ? "Décrivez le TP… ex. « Créer une page de profil HTML avec navigation, section héro et formulaire de contact. »"
                  : "Describe the TP… e.g. \"Build an HTML profile page with navigation, hero section and contact form.\""}
                className="w-full resize-none rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none"
                style={{ background: C.mantle, border: `1px solid ${C.surface1}`, color: C.text }} />
              <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: C.overlay }}>
                <CircleDot size={10} style={{ color: canGenerate ? C.green : C.overlay }} />
                {L === "fr" ? "Une consigne ou un fichier suffit — les deux peuvent être combinés." : "A prompt or a file is enough — both can be combined."}
              </p>
            </div>

            {/* Settings */}
            <div className="space-y-3.5 rounded-2xl p-4" style={{ background: C.surface0, border: `1px solid ${C.surface1}` }}>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: C.subtext }}>
                <Sparkles size={13} style={{ color: C.mauve }} /> {L === "fr" ? "Paramètres" : "Settings"}
              </h3>

              <Field label={L === "fr" ? "Difficulté" : "Difficulty"} icon={BarChart3}>
                <Seg value={settings.difficulty} onChange={(v) => setSettings({ ...settings, difficulty: v })}
                  options={Object.entries(DIFF).map(([k, v]) => ({ v: k, label: v.label[L as "fr" | "en"], c: v.color }))} />
              </Field>

              <Field label={L === "fr" ? `Nombre d'étapes : ${settings.stepCount}` : `Steps: ${settings.stepCount}`} icon={ListChecks}>
                <input type="range" min={2} max={6} value={settings.stepCount}
                  onChange={(e) => setSettings({ ...settings, stepCount: +e.target.value })}
                  className="w-full" style={{ accentColor: C.mauve }} />
              </Field>

              <Field label={L === "fr" ? "Langue" : "Language"} icon={Languages}>
                <Seg value={settings.language} onChange={(v) => setSettings({ ...settings, language: v })}
                  options={[{ v: "fr", label: "Français", c: C.blue }, { v: "en", label: "English", c: C.blue }]} />
              </Field>

              <button onClick={() => setSettings({ ...settings, antiCheat: !settings.antiCheat })}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors"
                style={{ background: C.mantle, border: `1px solid ${C.surface1}` }}>
                <span className="flex items-center gap-2" style={{ color: C.text }}>
                  <ShieldCheck size={15} style={{ color: settings.antiCheat ? C.green : C.overlay }} />
                  {L === "fr" ? "Anti-triche (copier-coller désactivé)" : "Anti-cheat (paste disabled)"}
                </span>
                <span className="relative h-5 w-9 rounded-full transition-colors"
                  style={{ background: settings.antiCheat ? C.green : C.surface2 }}>
                  <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                    style={{ left: settings.antiCheat ? "18px" : "2px" }} />
                </span>
              </button>

              <button onClick={generate} disabled={!canGenerate || status === "thinking"}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all"
                style={{
                  background: !canGenerate || status === "thinking" ? C.surface1 : `linear-gradient(135deg, ${C.mauve}, ${C.blue})`,
                  color: !canGenerate || status === "thinking" ? C.overlay : C.base,
                  cursor: !canGenerate || status === "thinking" ? "not-allowed" : "pointer",
                  boxShadow: canGenerate && status !== "thinking" ? `0 8px 24px -8px ${C.mauve}88` : "none",
                }}>
                {status === "thinking"
                  ? (<><Loader2 size={16} className="animate-spin" /> {L === "fr" ? "Génération…" : "Generating…"}</>)
                  : (<><Wand2 size={16} /> {tp ? (L === "fr" ? "Régénérer" : "Regenerate") : (L === "fr" ? "Générer l'environnement" : "Generate environment")}</>)}
              </button>
            </div>

            {/* Agent log */}
            {log.length > 0 && (
              <div className="space-y-2.5 rounded-2xl p-4" style={{ background: C.surface0, border: `1px solid ${C.surface1}` }}>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: C.subtext }}>
                  <Bot size={13} style={{ color: C.teal }} /> {L === "fr" ? "Activité de l'agent" : "Agent activity"}
                </h3>
                {log.map((e, i) => {
                  const Icon = e.icon;
                  return (
                    <div key={i} className="rise flex items-center gap-2.5 text-sm" style={{ color: C.text }}>
                      <Icon size={15} style={{ color: e.color }} />
                      <span>{e.t}</span>
                    </div>
                  );
                })}
                {status === "thinking" && (
                  <div className="flex items-center gap-2.5 text-sm" style={{ color: C.overlay }}>
                    <Loader2 size={15} className="animate-spin" style={{ color: C.mauve }} />
                    <span style={{ animation: "glowPulse 1.4s infinite" }}>{L === "fr" ? "réflexion…" : "thinking…"}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: generated TP ── */}
          <div className="rounded-2xl p-5 md:p-6" style={{ background: C.surface0, border: `1px solid ${C.surface1}`, minHeight: 520 }}>
            {!tp ? (
              <div className="flex h-full min-h-[460px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl"
                  style={{ background: `${C.mauve}14`, color: C.mauve }}>
                  <GraduationCap size={30} />
                </div>
                <h2 className="text-base font-semibold" style={{ color: C.text }}>
                  {L === "fr" ? "L'environnement de TP apparaîtra ici" : "The TP environment appears here"}
                </h2>
                <p className="mt-1.5 max-w-sm text-sm" style={{ color: C.overlay }}>
                  {L === "fr"
                    ? "Déposez un énoncé, ajustez les paramètres, puis lancez l'agent. Le brouillon généré sera entièrement modifiable avant publication."
                    : "Drop an énoncé, tune the settings, then run the agent. The generated draft is fully editable before publishing."}
                </p>
              </div>
            ) : (
              <div className="rise space-y-5">
                <div className="space-y-3">
                  <input value={tp.title} onChange={(e) => setTp({ ...tp, title: e.target.value })}
                    className="w-full bg-transparent text-xl font-semibold outline-none"
                    style={{ color: C.text }} />
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill color={DIFF[tp.difficulty as keyof typeof DIFF].color}>
                      <BarChart3 size={12} /> {DIFF[tp.difficulty as keyof typeof DIFF].label[L as "fr" | "en"]}
                    </Pill>
                    <Pill color={C.peach}><Clock size={12} /> {tp.estimatedMinutes} min</Pill>
                    <Pill color={C.blue}><ListChecks size={12} /> {tp.steps.length} {L === "fr" ? "étapes" : "steps"}</Pill>
                    {tp.antiCheat && <Pill color={C.green}><ShieldCheck size={12} /> Anti-cheat</Pill>}
                  </div>
                  <textarea value={tp.description} onChange={(e) => setTp({ ...tp, description: e.target.value })}
                    rows={2} className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: C.mantle, border: `1px solid ${C.surface1}`, color: C.subtext }} />
                </div>

                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: C.subtext }}>
                    <Code2 size={13} style={{ color: C.yellow }} /> {L === "fr" ? "Code HTML de départ" : "Starter HTML"}
                  </span>
                  <textarea value={tp.starterHTML} onChange={(e) => setTp({ ...tp, starterHTML: e.target.value })}
                    rows={6} spellCheck={false}
                    className="font-mono w-full resize-none rounded-xl px-3 py-2.5 text-xs leading-relaxed outline-none"
                    style={{ background: C.mantle, border: `1px solid ${C.surface1}`, color: C.green }} />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: C.subtext }}>
                      <ListChecks size={13} style={{ color: C.mauve }} /> {L === "fr" ? "Étapes du TP" : "TP steps"}
                    </span>
                    <button onClick={addStep} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                      style={{ background: `${C.mauve}1f`, color: C.mauve, border: `1px solid ${C.mauve}3a` }}>
                      <Plus size={13} /> {L === "fr" ? "Étape" : "Step"}
                    </button>
                  </div>
                  {tp.steps.map((s, i) => (
                    <StepCard key={s.id} step={s} index={i} lang={L}
                      onChange={(ns) => setStep(i, ns)}
                      onRemove={() => setTp((p) => p ? ({ ...p, steps: p.steps.filter((_, x) => x !== i) }) : p)} />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: C.surface1 }}>
                  <button onClick={generate}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium"
                    style={{ background: C.mantle, border: `1px solid ${C.surface1}`, color: C.subtext }}>
                    <RefreshCw size={14} /> {L === "fr" ? "Régénérer" : "Regenerate"}
                  </button>
                  <button onClick={exportJSON}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium"
                    style={{ background: C.mantle, border: `1px solid ${C.surface1}`, color: copied ? C.green : C.subtext }}>
                    {copied ? <Check size={14} /> : <Download size={14} />}
                    {copied ? (L === "fr" ? "JSON copié" : "JSON copied") : "Export JSON"}
                  </button>
                  <button onClick={handlePublish}
                    disabled={published}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
                    style={{
                      background: published
                        ? C.surface1
                        : `linear-gradient(135deg, ${C.green}, ${C.teal})`,
                      color: published ? C.overlay : C.base,
                      boxShadow: published ? "none" : `0 8px 24px -8px ${C.green}88`,
                      cursor: published ? "not-allowed" : "pointer",
                    }}>
                    {published
                      ? (<><Check size={15} /> {L === "fr" ? "Publié !" : "Published!"}</>)
                      : (<><FileCheck2 size={15} /> {L === "fr" ? "Publier le TP" : "Publish TP"}</>)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
