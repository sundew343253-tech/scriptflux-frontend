tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowUpRight,
  Clapperboard,
  Clipboard,
  Copy,
  Download,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import type {
  Asset,
  AssetCreate,
  EditGenerateRequest,
  PhotoGenerateRequest,
  ScriptGenerateRequest,
  ScriptGenerateResponse,
  VideoGenerateRequest,
} from "@/lib/types";
import type { VisualPrompt } from "@/lib/types";

type Studio = "dashboard" | "script" | "photo" | "video" | "projects";
type AssetFilter = "all" | "script" | "photo" | "video";

const navItems: { id: Studio; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "script", label: "Script-to-Content", icon: Sparkles },
  { id: "photo", label: "Photo & AI Edit", icon: ImageIcon },
  { id: "video", label: "Video Studio", icon: Video },
  { id: "projects", label: "Assets & Projects", icon: FolderKanban },
];

const BASE_URL ="https://scriptflux-api-2026.onrender.com"
const demoImage = "https://images.unsplash.com/photo-1559828801-04565cd31e27?auto=format&fit=crop&w=1400&q=85";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function kindLabel(kind: Asset["kind"]) {
  return kind === "edit" ? "AI edit" : kind;
}

function contentToText(asset: Asset) {
  if (asset.kind !== "script" || !asset.content) return asset.prompt;
  const content = asset.content as Record<string, unknown>;
  const script = content.script as Record<string, unknown> | undefined;
  return [script?.hook, script?.body, script?.description, script?.cta, ...(Array.isArray(script?.hashtags) ? script.hashtags : [])]
    .filter(Boolean)
    .join("\n\n");
}

async function downloadAsset(asset: Asset) {
  const text = contentToText(asset);
  if (asset.kind === "script") {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${asset.title.replace(/\s+/g, "-").toLowerCase() || "mediacraft-script"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Script downloaded");
    return;
  }
  if (!asset.media_url) return;
  const anchor = document.createElement("a");
  anchor.href = asset.media_url;
  anchor.download = `${asset.title.replace(/\s+/g, "-").toLowerCase() || "mediacraft-asset"}.${asset.kind === "video" ? "mp4" : "jpg"}`;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  anchor.click();
  toast.success("Download started");
}

function StudioBadge({ children }: { children: string }) {
  return <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">{children}</span>;
}

function AssetCard({
  asset,
  onCopy,
  onDownload,
  onDelete,
}: {
  asset: Asset;
  onCopy: (asset: Asset) => void;
  onDownload: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}) {
  return (
    <article
      data-testid={`asset-card-${asset.id}`}
      className="group relative overflow-hidden rounded-2xl border border-purple-500/15 bg-[#121220]/75 p-3 shadow-[0_10px_35px_rgba(0,0,0,.22)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/35 hover:shadow-[0_0_30px_rgba(6,182,212,.12)]"
    >
      <div className="relative mb-3 flex aspect-[1.55/1] items-center justify-center overflow-hidden rounded-xl bg-[#0b0b16]">
        {asset.kind === "video" && asset.media_url ? (
          <video className="h-full w-full object-cover opacity-80" src={asset.media_url} muted preload="metadata" />
        ) : asset.media_url ? (
          <img className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105" src={asset.media_url} alt={asset.title} />
        ) : (
          <FileText className="text-purple-300" size={34} />
        )}
        <div className="absolute left-2 top-2">
          <Badge data-testid={`asset-kind-${asset.id}`} variant="outline" className="border-white/15 bg-[#090910]/75 text-[10px] text-slate-200 backdrop-blur">
            {kindLabel(asset.kind)}
          </Badge>
        </div>
        {asset.metadata.mocked ? <div className="absolute bottom-2 right-2 rounded-full bg-[#090910]/80 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-amber-300">Mocked demo</div> : null}
      </div>
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 data-testid={`asset-title-${asset.id}`} className="truncate text-sm font-semibold text-slate-100">{asset.title}</h3>
          <p data-testid={`asset-date-${asset.id}`} className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">{formatDate(asset.created_at)}</p>
        </div>
        <ArrowUpRight className="shrink-0 text-slate-500 transition group-hover:text-cyan-300" size={16} />
      </div>
      <div className="mt-3 flex gap-1 border-t border-white/5 pt-2">
        <Button data-testid={`asset-copy-${asset.id}`} onClick={() => onCopy(asset)} variant="ghost" size="sm" className="h-8 flex-1 px-2 text-xs text-slate-400 hover:text-white"><Copy size={13} /> Copy</Button>
        <Button data-testid={`asset-download-${asset.id}`} onClick={() => onDownload(asset)} variant="ghost" size="sm" className="h-8 flex-1 px-2 text-xs text-slate-400 hover:text-cyan-300"><Download size={13} /> Download</Button>
        <Button data-testid={`asset-delete-${asset.id}`} onClick={() => onDelete(asset)} variant="ghost" size="sm" className="h-8 w-8 px-0 text-slate-500 hover:text-red-300"><Trash2 size={13} /></Button>
      </div>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div data-testid="empty-assets-state" className="rounded-2xl border border-dashed border-purple-500/20 bg-[#0d0d18]/70 px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/10 text-purple-300"><FolderKanban size={24} /></div>
      <h3 data-testid="empty-assets-title" className="mt-5 font-heading text-xl font-semibold text-white">Your creative shelf is clear</h3>
      <p data-testid="empty-assets-description" className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Generate a script, photo, or video and it will land here automatically for your next edit.</p>
      <Button data-testid="empty-assets-create-button" onClick={onCreate} className="mt-6 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 shadow-[0_0_22px_rgba(139,92,246,.3)] hover:from-purple-500 hover:to-cyan-400"><Plus size={16} /> Create something</Button>
    </div>
  );
}

function Dashboard({ assets, setStudio }: { assets: Asset[]; setStudio: (studio: Studio) => void }) {
  const recent = assets.slice(0, 3);
  return (
    <div className="space-y-7">
      <section data-testid="dashboard-hero" className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[#1b1234] via-[#121328] to-[#0d1d2b] p-6 sm:p-9">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl animate-float-glow" />
        <div className="absolute -bottom-28 right-32 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl animate-float-glow" />
        <div className="relative max-w-2xl">
          <StudioBadge>Creative command center / 01</StudioBadge>
          <h1 data-testid="dashboard-title" className="mt-4 max-w-xl font-heading text-4xl font-extrabold leading-[.95] tracking-tight text-white sm:text-6xl">Make the next thing <span className="bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">impossible to scroll past.</span></h1>
          <p data-testid="dashboard-description" className="mt-5 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">One focused workspace for sharp scripts, striking visuals, and short-form story worlds.</p>
          <Button data-testid="dashboard-start-button" onClick={() => setStudio("script")} className="mt-7 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-5 shadow-[0_0_24px_rgba(139,92,246,.35)] hover:from-purple-500 hover:to-cyan-400">Start with a script <ArrowUpRight size={16} /></Button>
        </div>
      </section>
      <section data-testid="dashboard-stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{ label: "Total assets", value: assets.length, accent: "text-white" }, { label: "Scripts", value: assets.filter((asset) => asset.kind === "script").length, accent: "text-purple-300" }, { label: "Visuals", value: assets.filter((asset) => asset.kind !== "script").length, accent: "text-cyan-300" }, { label: "Workflow", value: "AI ready", accent: "text-emerald-300" }].map((stat) => <Card key={stat.label} data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`} className="border-white/5 bg-[#10101c]/80"><CardContent className="p-4 sm:p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{stat.label}</p><p className={`mt-3 font-heading text-2xl font-bold ${stat.accent}`}>{stat.value}</p></CardContent></Card>)}
      </section>
      <section>
        <div className="mb-4 flex items-end justify-between"><div><StudioBadge>Quick launch</StudioBadge><h2 data-testid="quick-launch-title" className="mt-2 font-heading text-2xl font-bold text-white">Pick a creative lane</h2></div><Button data-testid="dashboard-view-projects-button" onClick={() => setStudio("projects")} variant="ghost" className="text-xs text-slate-400 hover:text-white">View library <ArrowUpRight size={14} /></Button></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[{ id: "script", label: "Script-to-Content", copy: "Hooks, body copy, and visual directions in one pass.", icon: Sparkles, color: "from-purple-500/20" }, { id: "photo", label: "Photo Studio", copy: "Turn an idea into a cinematic still or edit.", icon: ImageIcon, color: "from-cyan-500/20" }, { id: "video", label: "Video Studio", copy: "Storyboard motion with a ready-to-play demo clip.", icon: Clapperboard, color: "from-blue-500/20" }].map((item) => <button data-testid={`quick-launch-${item.id}`} key={item.id} onClick={() => setStudio(item.id as Studio)} className={`group rounded-2xl border border-white/5 bg-gradient-to-br ${item.color} to-[#121220]/80 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/30`}><item.icon className="text-cyan-300 transition-transform group-hover:scale-110" size={22} /><h3 className="mt-8 font-heading text-lg font-semibold text-white">{item.label}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{item.copy}</p><span className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-purple-300">Open studio <ArrowUpRight size={13} /></span></button>)}
        </div>
      </section>
      <section data-testid="recent-assets-section"><div className="mb-4 flex items-end justify-between"><div><StudioBadge>Latest work</StudioBadge><h2 className="mt-2 font-heading text-2xl font-bold text-white">Recent creations</h2></div>{recent.length > 0 ? <Button data-testid="dashboard-see-all-button" onClick={() => setStudio("projects")} variant="ghost" className="text-xs text-slate-400">See all <ArrowUpRight size={14} /></Button> : null}</div>{recent.length === 0 ? <EmptyState onCreate={() => setStudio("script")} /> : <div className="grid gap-4 md:grid-cols-3">{recent.map((asset) => <AssetCard key={asset.id} asset={asset} onCopy={() => navigator.clipboard.writeText(contentToText(asset)).then(() => toast.success("Copied to clipboard"))} onDownload={downloadAsset} onDelete={() => undefined} />)}</div>}</section>
    </div>
  );
}

function ScriptStudio({ onSendToPhoto, onSaved }: { onSendToPhoto: (prompt: string) => void; onSaved: () => void }) {
  const [form, setForm] = useState<ScriptGenerateRequest>({ topic: "The future of study systems", target_audience: "Students and ambitious creators", tone: "Viral", format: "Reels / TikTok" });
  const [result, setResult] = useState<ScriptGenerateResponse | null>(null);
  const [showVisuals, setShowVisuals] = useState(false);
  const queryClient = useQueryClient();
  const generate = useMutation({ mutationFn: (payload: ScriptGenerateRequest) => apiPost<ScriptGenerateResponse>("/scripts/generate", payload), onSuccess: (data) => { setResult(data); setShowVisuals(false); toast.success("Script direction is ready"); }, onError: () => toast.error("Script generation is temporarily unavailable") });
  const save = useMutation({ mutationFn: (payload: AssetCreate) => apiPost<Asset>("/assets", payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["assets"] }); toast.success("Project saved to your library"); onSaved(); }, onError: () => toast.error("Could not save this project") });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (form.topic.trim()) generate.mutate(form); };
  const saveScript = () => { if (!result) return; save.mutate({ kind: "script", title: form.topic, prompt: form.topic, content: { script: result.script, visual_prompts: result.visual_prompts }, metadata: { tone: form.tone, format: form.format, target_audience: form.target_audience } }); };
  return (
    <div className="space-y-6">
      <StudioIntro eyebrow="Studio / 02" title="Script-to-Content" description="Turn a raw topic into a ready-to-record angle, then hand every scene to your visual team." icon={Sparkles} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
        <Card data-testid="script-generator-card" className="border-purple-500/15 bg-[#121220]/80"><CardHeader><CardTitle className="font-heading text-lg text-white">Give the agent a direction</CardTitle></CardHeader><CardContent><form data-testid="script-generator-form" onSubmit={submit} className="space-y-5"><Field label="Topic / keywords"><Textarea data-testid="script-topic-input" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} placeholder="e.g. How to build a study system that sticks" className="min-h-28 resize-none border-white/10 bg-[#0d0d18] text-slate-100 placeholder:text-slate-600" /></Field><Field label="Target audience"><Input data-testid="script-audience-input" value={form.target_audience} onChange={(event) => setForm({ ...form, target_audience: event.target.value })} className="border-white/10 bg-[#0d0d18]" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Tone"><select data-testid="script-tone-select" value={form.tone} onChange={(event) => setForm({ ...form, tone: event.target.value })} className="h-10 w-full rounded-md border border-white/10 bg-[#0d0d18] px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/60"><option>Viral</option><option>Educational</option><option>Hype</option><option>Casual</option></select></Field><Field label="Format"><select data-testid="script-format-select" value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value })} className="h-10 w-full rounded-md border border-white/10 bg-[#0d0d18] px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/60"><option>Reels / TikTok</option><option>YouTube Shorts</option><option>LinkedIn</option><option>Blog</option></select></Field></div><Button data-testid="generate-script-button" disabled={generate.isPending} className="h-11 w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 font-semibold shadow-[0_0_20px_rgba(139,92,246,.25)] hover:from-purple-500 hover:to-cyan-400">{generate.isPending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Writing your angle...</> : <><Zap size={16} /> Generate script</>}</Button></form></CardContent></Card>
        <ScriptResult result={result} showVisuals={showVisuals} setShowVisuals={setShowVisuals} onSave={saveScript} isSaving={save.isPending} onSendToPhoto={onSendToPhoto} />
      </div>
    </div>
  );
}

function ScriptResult({ result, showVisuals, setShowVisuals, onSave, isSaving, onSendToPhoto }: { result: ScriptGenerateResponse | null; showVisuals: boolean; setShowVisuals: (value: boolean) => void; onSave: () => void; isSaving: boolean; onSendToPhoto: (prompt: string) => void }) {
  if (!result) return <div data-testid="script-result-empty" className="flex min-h-[460px] flex-col items-center justify-center rounded-2xl border border-dashed border-purple-500/20 bg-[#0d0d18]/70 p-8 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-300"><WandSparkles size={24} /></div><h3 className="mt-5 font-heading text-xl font-semibold text-white">Your script will appear here</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">The agent will shape your hook, body, CTA, hashtags, and a visual prompt matrix.</p></div>;
  return <div data-testid="script-result-panel" className="space-y-4"><Card className="overflow-hidden border-cyan-400/20 bg-gradient-to-br from-[#15132a] to-[#101b26]"><div className="h-1 w-full overflow-hidden bg-purple-500/10"><div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-cyan-400 animate-shimmer-line" /></div><CardHeader className="flex-row items-start justify-between space-y-0"><div><StudioBadge>Generated direction</StudioBadge><CardTitle data-testid="generated-script-title" className="mt-2 font-heading text-2xl text-white">Your next post has a pulse.</CardTitle></div><Badge data-testid="script-ready-badge" className="bg-emerald-500/15 text-emerald-300">Ready</Badge></CardHeader><CardContent className="space-y-5"><ScriptBlock label="Hook" value={result.script.hook} testId="generated-script-hook" /><ScriptBlock label="Body" value={result.script.body} testId="generated-script-body" /><div className="grid gap-4 sm:grid-cols-2"><ScriptBlock label="Description" value={result.script.description} testId="generated-script-description" /><ScriptBlock label="CTA" value={result.script.cta} testId="generated-script-cta" /></div><div data-testid="generated-script-hashtags" className="flex flex-wrap gap-2">{result.script.hashtags.map((tag) => <span key={tag} className="rounded-full border border-purple-400/15 bg-purple-500/10 px-2.5 py-1 font-mono text-[10px] text-purple-200">{tag}</span>)}</div><div className="flex flex-wrap gap-2 border-t border-white/5 pt-4"><Button data-testid="convert-visual-prompts-button" onClick={() => setShowVisuals(!showVisuals)} variant="outline" className="border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10">{showVisuals ? <X size={15} /> : <WandSparkles size={15} />}{showVisuals ? "Hide visual prompts" : "Convert to visual prompts"}</Button><Button data-testid="save-script-project-button" onClick={onSave} disabled={isSaving} className="bg-white/10 text-white hover:bg-white/15">{isSaving ? "Saving..." : <><FolderKanban size={15} /> Save project</>}</Button></div></CardContent></Card>{showVisuals ? <div data-testid="visual-prompts-panel" className="space-y-3"><div className="flex items-center justify-between"><div><StudioBadge>Prompt matrix / 03 scenes</StudioBadge><h3 className="mt-2 font-heading text-xl font-semibold text-white">Hand it to the visual layer</h3></div></div>{result.visual_prompts.map((visual, index) => <VisualPromptCard key={visual.scene} visual={visual} index={index} onSendToPhoto={onSendToPhoto} />)}</div> : null}</div>;
}

function VisualPromptCard({ visual, index, onSendToPhoto }: { visual: VisualPrompt; index: number; onSendToPhoto: (prompt: string) => void }) {
  return <div data-testid={`visual-prompt-card-${index + 1}`} className="rounded-2xl border border-white/5 bg-[#121220]/75 p-4 transition hover:border-cyan-400/25"><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-400/10 font-mono text-xs text-cyan-200">0{index + 1}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 data-testid={`visual-prompt-scene-${index + 1}`} className="font-semibold text-white">{visual.scene}</h4><span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{visual.shot}</span></div><p data-testid={`visual-prompt-copy-${index + 1}`} className="mt-2 text-sm leading-6 text-slate-400">{visual.prompt}</p><Button data-testid={`send-visual-prompt-${index + 1}`} onClick={() => onSendToPhoto(visual.prompt)} variant="ghost" size="sm" className="mt-2 h-8 px-0 text-xs text-cyan-300 hover:text-cyan-200">Send to Photo Studio <ArrowUpRight size={13} /></Button></div></div></div>;
}

function PhotoStudio() {
  const [prompt, setPrompt] = useState("A student creator building a futuristic study system at midnight");
  const [style, setStyle] = useState("Cinematic cyberpunk");
  const [aspect, setAspect] = useState("16:9");
  const [editPrompt, setEditPrompt] = useState("Change the background to neon Tokyo rain");
  const [sourceUrl, setSourceUrl] = useState("");
  const [result, setResult] = useState<Asset | null>(null);
  const [editResult, setEditResult] = useState<Asset | null>(null);
  const generate = useMutation({ mutationFn: (payload: PhotoGenerateRequest) => apiPost<Asset>("/media/photo", payload), onSuccess: (asset) => { setResult(asset); toast.success("Mocked photo generated"); }, onError: () => toast.error("Photo generation failed") });
  const edit = useMutation({ mutationFn: (payload: EditGenerateRequest) => apiPost<Asset>("/media/edit", payload), onSuccess: (asset) => { setEditResult(asset); toast.success("Mocked edit applied"); }, onError: () => toast.error("AI edit failed") });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); generate.mutate({ prompt, style, aspect_ratio: aspect }); };
  const handleFile = (file: File | undefined) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setSourceUrl(String(reader.result)); reader.readAsDataURL(file); };
  return <div className="space-y-6"><StudioIntro eyebrow="Studio / 03" title="Photo Studio" description="Create a polished still, or bring a reference into the AI edit zone for a fast visual remix." icon={ImageIcon} /><div className="grid gap-5 xl:grid-cols-2"><Card data-testid="photo-generator-card" className="border-purple-500/15 bg-[#121220]/80"><CardHeader><CardTitle className="font-heading text-lg text-white">Text to image</CardTitle></CardHeader><CardContent><form data-testid="photo-generator-form" onSubmit={submit} className="space-y-5"><Field label="Prompt"><Textarea data-testid="photo-prompt-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-28 resize-none border-white/10 bg-[#0d0d18]" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Aspect ratio"><select data-testid="photo-aspect-select" value={aspect} onChange={(event) => setAspect(event.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-[#0d0d18] px-3 text-sm text-slate-200"><option>16:9</option><option>1:1</option><option>9:16</option><option>4:5</option></select></Field><Field label="Style preset"><select data-testid="photo-style-select" value={style} onChange={(event) => setStyle(event.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-[#0d0d18] px-3 text-sm text-slate-200"><option>Cinematic cyberpunk</option><option>Photorealistic 8K</option><option>Anime</option><option>3D render</option></select></Field></div><Button data-testid="generate-photo-button" disabled={generate.isPending} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500">{generate.isPending ? "Rendering..." : <><Sparkles size={16} /> Generate photo</>}</Button></form>{result ? <MediaResult asset={result} /> : null}</CardContent></Card><Card data-testid="ai-edit-card" className="border-cyan-400/15 bg-[#121220]/80"><CardHeader><CardTitle className="font-heading text-lg text-white">AI edit zone</CardTitle></CardHeader><CardContent><div className="space-y-5"><label data-testid="photo-upload-zone" className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-400/25 bg-cyan-400/[.03] px-5 text-center transition hover:border-cyan-300/50"><Upload className="text-cyan-300" size={24} /><span className="mt-3 text-sm font-medium text-white">Drop a reference image</span><span className="mt-1 text-xs text-slate-500">PNG or JPG · preview stays in this session</span><input data-testid="photo-upload-input" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} /></label>{sourceUrl ? <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#0d0d18] p-2"><img data-testid="photo-upload-preview" src={sourceUrl} alt="Uploaded reference" className="h-12 w-16 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-xs text-slate-400">Reference loaded</span><Button data-testid="photo-upload-clear-button" onClick={() => setSourceUrl("")} variant="ghost" size="icon-sm"><X size={14} /></Button></div> : null}<Field label="Edit instruction"><Textarea data-testid="edit-prompt-input" value={editPrompt} onChange={(event) => setEditPrompt(event.target.value)} className="min-h-24 resize-none border-white/10 bg-[#0d0d18]" /></Field><Button data-testid="apply-ai-edit-button" onClick={() => edit.mutate({ source_url: sourceUrl || demoImage, prompt: editPrompt })} disabled={edit.isPending} variant="outline" className="w-full border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10">{edit.isPending ? "Applying edit..." : <><WandSparkles size={16} /> Apply AI edit</>}</Button>{editResult ? <MediaResult asset={editResult} /> : null}</div></CardContent></Card></div></div>;
}

function VideoStudio() {
  const [prompt, setPrompt] = useState("A neon-lit library transforms into a creator command center");
  const [motion, setMotion] = useState("Cinematic");
  const [duration, setDuration] = useState(5);
  const [camera, setCamera] = useState("Slow push-in");
  const [result, setResult] = useState<Asset | null>(null);
  const generate = useMutation({ mutationFn: (payload: VideoGenerateRequest) => apiPost<Asset>("/media/video", payload), onSuccess: (asset) => { setResult(asset); toast.success("Mocked video ready to preview"); }, onError: () => toast.error("Video generation failed") });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); generate.mutate({ prompt, motion_intensity: motion, duration, camera_movement: camera }); };
  return <div className="space-y-6"><StudioIntro eyebrow="Studio / 04" title="Video Studio" description="Shape a short motion concept with a prompt, camera language, and an instant demo clip." icon={Video} /><div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]"><Card data-testid="video-generator-card" className="border-purple-500/15 bg-[#121220]/80"><CardHeader><CardTitle className="font-heading text-lg text-white">Text to video</CardTitle></CardHeader><CardContent><form data-testid="video-generator-form" onSubmit={submit} className="space-y-5"><Field label="Video prompt"><Textarea data-testid="video-prompt-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-32 resize-none border-white/10 bg-[#0d0d18]" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Motion intensity"><select data-testid="video-motion-select" value={motion} onChange={(event) => setMotion(event.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-[#0d0d18] px-3 text-sm text-slate-200"><option>Subtle</option><option>Cinematic</option><option>High energy</option></select></Field><Field label="Duration"><select data-testid="video-duration-select" value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="h-10 w-full rounded-md border border-white/10 bg-[#0d0d18] px-3 text-sm text-slate-200"><option value={3}>3 sec</option><option value={5}>5 sec</option><option value={10}>10 sec</option></select></Field></div><Field label="Camera movement"><select data-testid="video-camera-select" value={camera} onChange={(event) => setCamera(event.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-[#0d0d18] px-3 text-sm text-slate-200"><option>Slow push-in</option><option>Pan right</option><option>Drone shot</option><option>Handheld follow</option></select></Field><Button data-testid="generate-video-button" disabled={generate.isPending} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500">{generate.isPending ? "Rendering..." : <><Play size={16} /> Generate video</>}</Button></form></CardContent></Card><div data-testid="video-preview-stage" className="relative flex min-h-[430px] flex-col justify-end overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0d0d18] p-5">{result?.media_url ? <video data-testid="generated-video-player" controls className="absolute inset-0 h-full w-full object-cover opacity-70" src={result.media_url} /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(139,92,246,.32),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(6,182,212,.2),transparent_35%)]" />}<div className="relative z-10 rounded-2xl border border-white/10 bg-[#090910]/75 p-5 backdrop-blur-xl"><StudioBadge>{result ? "Mocked demo output" : "Preview stage"}</StudioBadge><h3 data-testid="video-preview-title" className="mt-2 font-heading text-2xl font-semibold text-white">{result ? result.title : "Your motion concept starts here"}</h3><p data-testid="video-preview-copy" className="mt-2 text-sm leading-6 text-slate-400">{result ? "A stable demo clip is ready. Download it or copy the prompt for your next iteration." : "Set the rhythm, choose a camera move, and let the studio draft the first cut."}</p>{result ? <div className="mt-4 flex flex-wrap gap-2"><Button data-testid="download-generated-video-button" onClick={() => downloadAsset(result)} className="bg-gradient-to-r from-purple-600 to-cyan-500"><Download size={15} /> Download video</Button><Button data-testid="copy-video-prompt-button" onClick={() => navigator.clipboard.writeText(result.prompt).then(() => toast.success("Prompt copied"))} variant="outline" className="border-white/15 text-slate-200"><Clipboard size={15} /> Copy prompt</Button></div> : null}</div></div></div></div>;
}

function Projects({ assets, onCopy, onDownload, onDelete, setStudio }: { assets: Asset[]; onCopy: (asset: Asset) => void; onDownload: (asset: Asset) => void; onDelete: (asset: Asset) => void; setStudio: (studio: Studio) => void }) {
  const [filter, setFilter] = useState<AssetFilter>("all");
  const [search, setSearch] = useState("");
  const visible = useMemo(() => assets.filter((asset) => (filter === "all" || asset.kind === filter || (filter === "photo" && asset.kind === "edit")) && `${asset.title} ${asset.prompt}`.toLowerCase().includes(search.toLowerCase())), [assets, filter, search]);
  return <div className="space-y-6"><StudioIntro eyebrow="Library / 05" title="Assets & Projects" description="Everything you make, in one searchable shelf. Copy an idea, download an output, or clear a draft when it has served its purpose." icon={FolderKanban} /><div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-[#121220]/70 p-3 sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-500" size={16} /><Input data-testid="asset-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your creative shelf..." className="border-white/10 bg-[#0d0d18] pl-9" /></div><div data-testid="asset-filter-controls" className="flex gap-1 overflow-x-auto">{(["all", "script", "photo", "video"] as AssetFilter[]).map((item) => <Button data-testid={`asset-filter-${item}`} key={item} onClick={() => setFilter(item)} variant={filter === item ? "secondary" : "ghost"} size="sm" className={filter === item ? "bg-purple-500/15 text-purple-200" : "text-slate-400"}>{item === "all" ? "All assets" : item[0].toUpperCase() + item.slice(1)}</Button>)}</div></div>{visible.length === 0 ? <EmptyState onCreate={() => setStudio("script")} /> : <div data-testid="asset-grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((asset) => <AssetCard key={asset.id} asset={asset} onCopy={onCopy} onDownload={onDownload} onDelete={onDelete} />)}</div>}</div>;
}

function StudioIntro({ eyebrow, title, description, icon: Icon }: { eyebrow: string; title: string; description: string; icon: LucideIcon }) {
  return <header data-testid={`${title.toLowerCase().replace(/[^a-z]+/g, "-")}-header`} className="flex flex-col justify-between gap-5 border-b border-purple-500/15 pb-6 sm:flex-row sm:items-end"><div><StudioBadge>{eyebrow}</StudioBadge><h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p></div><div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5 text-cyan-300 sm:flex"><Icon size={22} /></div></header>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2"><span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</span>{children}</label>;
}

function ScriptBlock({ label, value, testId }: { label: string; value: string; testId: string }) {
  return <div><p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300/70">{label}</p><p data-testid={testId} className="mt-2 text-sm leading-7 text-slate-300">{value}</p></div>;
}

function MediaResult({ asset }: { asset: Asset }) {
  return <div data-testid={`generated-${asset.kind}-result`} className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d18]"><div className="relative aspect-video overflow-hidden">{asset.media_url ? <img className="h-full w-full object-cover" src={asset.media_url} alt={asset.title} /> : null}<div className="absolute bottom-3 left-3 rounded-full bg-[#090910]/80 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-amber-300">MOCKED DEMO OUTPUT</div></div><div className="flex items-center justify-between gap-3 p-3"><p className="truncate text-xs text-slate-300">{asset.title}</p><Button data-testid={`download-${asset.kind}-result-button`} onClick={() => downloadAsset(asset)} variant="ghost" size="sm" className="shrink-0 text-cyan-300"><Download size={14} /> Download</Button></div></div>;
}

export default function Home() {
  const [studio, setStudio] = useState<Studio>("dashboard");
  const [photoPrompt, setPhotoPrompt] = useState("");
  const queryClient = useQueryClient();
  const assetsQuery = useQuery({ queryKey: ["assets"], queryFn: () => apiGet<Asset[]>("/assets"), retry: false });
  const assets = assetsQuery.data ?? [];
  const deleteMutation = useMutation({ mutationFn: (id: string) => apiDelete<void>(`/assets/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["assets"] }); toast.success("Asset deleted"); }, onError: () => toast.error("Could not delete asset") });
  const copyAsset = (asset: Asset) => navigator.clipboard.writeText(contentToText(asset)).then(() => toast.success("Copied to clipboard"));
  const handleDelete = (asset: Asset) => { if (window.confirm(`Delete ${asset.title}?`)) deleteMutation.mutate(asset.id); };
  const content = studio === "dashboard" ? <Dashboard assets={assets} setStudio={setStudio} /> : studio === "script" ? <ScriptStudio onSendToPhoto={(prompt) => { setPhotoPrompt(prompt); setStudio("photo"); }} onSaved={() => setStudio("projects")} /> : studio === "photo" ? <PhotoStudio /> : studio === "video" ? <VideoStudio /> : <Projects assets={assets} onCopy={copyAsset} onDownload={downloadAsset} onDelete={handleDelete} setStudio={setStudio} />;
  return <div data-testid="mediacraft-app" className="min-h-svh bg-[#090910] text-slate-100"><div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute left-[18%] top-[-18%] h-[420px] w-[420px] rounded-full bg-purple-700/10 blur-[120px]" /><div className="absolute bottom-[-25%] right-[-5%] h-[480px] w-[480px] rounded-full bg-cyan-500/5 blur-[140px]" /></div><aside data-testid="sidebar-navigation" className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-purple-500/15 bg-[#0d0d18]/95 px-2 backdrop-blur-2xl md:top-0 md:h-auto md:w-64 md:flex-col md:border-r md:border-t-0 md:px-4 md:py-6"><div className="hidden items-center gap-3 px-3 md:flex"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 shadow-[0_0_22px_rgba(139,92,246,.4)]"><Sparkles className="text-white" size={20} /></div><div><p data-testid="brand-name" className="font-heading text-lg font-bold text-white">MediaCraft <span className="text-cyan-300">AI</span></p><p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Creative OS</p></div></div><div className="hidden px-3 pt-12 md:block"><StudioBadge>Workspace</StudioBadge></div><nav data-testid="main-navigation" className="flex w-full items-center justify-around gap-1 md:mt-4 md:block md:space-y-1">{navItems.map((item) => { const Icon = item.icon; const active = studio === item.id; return <button data-testid={`nav-${item.id}`} key={item.id} onClick={() => setStudio(item.id)} className={`group flex flex-1 items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-200 md:w-full md:justify-start md:text-sm ${active ? "bg-gradient-to-r from-purple-500/20 to-cyan-400/10 text-white shadow-[inset_2px_0_0_#06b6d4]" : "text-slate-500 hover:bg-white/[.03] hover:text-slate-200"}`}><Icon size={17} className={active ? "text-cyan-300" : "text-slate-500 group-hover:text-purple-300"} /><span className="hidden md:inline">{item.label}</span></button>; })}</nav><div className="mt-auto hidden rounded-2xl border border-purple-500/15 bg-purple-500/[.06] p-4 md:block"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" /><span data-testid="workspace-status" className="font-mono text-[10px] uppercase tracking-widest text-emerald-300">Studio online</span></div><p className="mt-3 text-xs leading-5 text-slate-500">Your workspace is ready for the next idea.</p></div></aside><main className="relative z-10 min-h-svh px-4 pb-24 pt-5 md:ml-64 md:px-8 md:pb-12 md:pt-8 xl:px-12"><div className="mx-auto max-w-7xl"><header data-testid="app-header" className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3 md:hidden"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400"><Sparkles className="text-white" size={17} /></div><span className="font-heading font-semibold text-white">MediaCraft <span className="text-cyan-300">AI</span></span></div><div className="hidden md:block"><p data-testid="header-eyebrow" className="font-mono text-[10px] uppercase tracking-[.2em] text-slate-500">{studio === "dashboard" ? "Overview" : navItems.find((item) => item.id === studio)?.label}</p><p data-testid="header-context" className="mt-1 text-xs text-slate-400">A focused space for your next strong idea.</p></div><div className="flex items-center gap-2"><Badge data-testid="mock-mode-badge" variant="outline" className="hidden border-amber-400/25 bg-amber-400/5 text-[10px] text-amber-300 sm:inline-flex">Mock media mode</Badge><Button data-testid="new-project-button" onClick={() => setStudio("script")} size="sm" className="rounded-xl bg-white/10 text-slate-100 hover:bg-white/15"><Plus size={15} /> <span className="hidden sm:inline">New project</span></Button><Button data-testid="header-menu-button" variant="ghost" size="icon-sm" className="text-slate-400 md:hidden"><Menu size={18} /></Button></div></header>{content}</div></main><div data-testid="mobile-nav-spacer" className="h-1 md:hidden" /></div>;
}