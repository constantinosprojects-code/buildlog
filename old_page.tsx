"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { StageSVG, SpecPills, TagBadge } from "@/components/StageSVG";
import { compressImage, generateReadme, generateSummary, parseRawNote } from "@/lib/parser";
import { TAGS, type EntryTag } from "@/types/buildlog";
import type { Entry, EntryUpdates, Project } from "@/types/buildlog";
import { supabase } from "@/lib/supabase";

const seedProjects: Project[] = [
  {
    id: "p1",
    name: "Micro-Rover v3",
    description: "Autonomous exploration rover for campus mapping",
    entries: [
      { id: "e1", title: "Initial chassis concept", note: "CAD in Fusion 360. Went with 3D-printed PLA for speed over aluminum.", tag: "Idea", date: "2025-09-12", image: null, specs: ["Fusion 360", "PLA"] },
      { id: "e2", title: "Motor driver fried", note: "Overcurrent on dual TB6612. Smoke came out of the right side. Lesson: add current sensing early.", tag: "Failure", date: "2025-09-18", image: null, specs: ["TB6612"] },
      { id: "e3", title: "Added current sensing + soft-start", note: "INA219 + MOSFET soft-start. No more magic smoke. Trade-off: +$4 BOM and 12ms delay.", tag: "Breakthrough", date: "2025-09-22", image: null, specs: ["INA219", "MOSFET"] },
      { id: "e4", title: "First outdoor test", note: "Traction issues on wet concrete. Switched to 60mm wheels with deeper tread.", tag: "Prototype", date: "2025-10-03", image: null, specs: ["60mm wheels"] },
      { id: "e5", title: "Final sensor suite locked", note: "RPLidar A1 + BNO085 + 2x VL53L1X. Power budget: 4.8W avg.", tag: "Final", date: "2025-10-15", image: null, specs: ["RPLidar A1", "BNO085", "VL53L1X"] },
    ],
  },
  {
    id: "p2",
    name: "Low-Cost Spectrometer",
    description: "Open-source visible light spectrometer under $40",
    entries: [
      { id: "e6", title: "Diffraction grating idea", note: "DVD as cheap grating. Resolution target: 5nm.", tag: "Idea", date: "2025-08-01", image: null, specs: ["DVD"] },
      { id: "e7", title: "Calibration failed hard", note: "Wavelength mapping was off by 40nm. Root cause: nonlinear webcam sensor response.", tag: "Failure", date: "2025-08-14", image: null, specs: [] },
    ],
  },
];

type ViewMode = "edit" | "public";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

function Modal({ open, onClose, title, children, wide = false }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
      <div
        className={`max-h-[90vh] overflow-y-auto rounded-xl border border-[#1f1f23] bg-[#111113] shadow-2xl ${wide ? "w-full max-w-3xl" : "w-full max-w-lg"}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-[#1f1f23] px-5 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-xl leading-none text-[#71717a] hover:text-white" aria-label="Close">├ù</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const fieldClass = "mt-1 w-full rounded-lg border border-[#1f1f23] bg-[#0a0a0b] px-3 py-2 text-sm focus:border-[#22c55e] focus:outline-none";
const buttonPrimary = "rounded-lg bg-[#22c55e] px-4 py-2.5 font-semibold text-black transition hover:bg-[#4ade80]";

export default function App() {
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [hydrated, setHydrated] = useState(false);
  const [activeId, setActiveId] = useState<string | null>("p1");
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [showNewProject, setShowNewProject] = useState(false);
  const [showDump, setShowDump] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editTag, setEditTag] = useState<EntryTag>("Prototype");
  const [scrubIndex, setScrubIndex] = useState(0);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [dumpTitle, setDumpTitle] = useState("");
  const [dumpNote, setDumpNote] = useState("");
  const [dumpTag, setDumpTag] = useState<EntryTag | "">("");
  const [dumpImage, setDumpImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Load from Supabase on startup
  useEffect(() => {
    async function loadFromSupabase() {
      try {
        const { data: dbProjects, error: projError } = await supabase.from("projects").select("*");
        const { data: dbEntries, error: entryError } = await supabase.from("entries").select("*");

        if (!projError && dbProjects && dbProjects.length > 0) {
          const formattedProjects: Project[] = dbProjects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            entries: (dbEntries || [])
              .filter((e) => e.project_id === p.id)
              .map((e) => ({
                id: e.id,
                title: e.title,
                note: e.note,
                tag: e.tag as EntryTag,
                date: e.date,
                image: e.image,
                specs: e.specs || [],
              })),
          }));
          setProjects(formattedProjects);
          if (formattedProjects.length > 0) {
            setActiveId(formattedProjects[0].id);
          }
        }
      } catch (err) {
        console.warn("Supabase fetch failed, falling back to seed data", err);
      } finally {
        setHydrated(true);
      }
    }
    loadFromSupabase();
  }, []);

  const active = projects.find((project) => project.id === activeId) ?? projects[0] ?? null;

  useEffect(() => {
    if (active) setScrubIndex(Math.max(0, active.entries.length - 1));
  }, [activeId]);

  useEffect(() => {
    if (editingEntry) {
      setEditTitle(editingEntry.title);
      setEditNote(editingEntry.note);
      setEditTag(editingEntry.tag || "Prototype");
    }
  }, [editingEntry]);

  const createProject = async () => {
    if (!newProjName.trim()) return;
    const id = `p${Date.now()}`;
    const newProj: Project = {
      id,
      name: newProjName.trim(),
      description: newProjDesc.trim(),
      entries: [],
    };

    // Save to Supabase
    await supabase.from("projects").insert([{ id, name: newProj.name, description: newProj.description }]);

    setProjects((current) => [...current, newProj]);
    setActiveId(id);
    setShowNewProject(false);
    setNewProjName("");
    setNewProjDesc("");
  };

  const addEntry = async () => {
    const raw = dumpNote.trim();
    if (!raw && !dumpTitle.trim()) return;
    const parsed = parseRawNote(raw || dumpTitle);
    const entry: Entry = {
      id: `e${Date.now()}`,
      title: dumpTitle.trim() || parsed.title,
      note: raw || dumpTitle.trim(),
      tag: dumpTag || parsed.tag,
      date: new Date().toISOString().slice(0, 10),
      image: dumpImage,
      specs: parsed.specs,
    };

    if (active) {
      // Save to Supabase entries table
      await supabase.from("entries").insert([
        {
          id: entry.id,
          project_id: active.id,
          title: entry.title,
          note: entry.note,
          tag: entry.tag,
          date: entry.date,
          image: entry.image,
          specs: entry.specs,
        },
      ]);
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === active?.id
          ? { ...project, entries: [...project.entries, entry] }
          : project,
      ),
    );
    setShowDump(false);
    setDumpTitle("");
    setDumpNote("");
    setDumpTag("");
    setDumpImage(null);
    setImageError("");
  };

  const updateEntry = async (entryId: string, updates: EntryUpdates) => {
    await supabase.from("entries").update(updates).eq("id", entryId);

    setProjects((current) =>
      current.map((project) =>
        project.id === active?.id
          ? {
              ...project,
              entries: project.entries.map((entry) =>
                entry.id === entryId ? { ...entry, ...updates } : entry,
              ),
            }
          : project,
      ),
    );
    setEditingEntry(null);
  };

  const deleteEntry = async (entryId: string) => {
    await supabase.from("entries").delete().eq("id", entryId);

    setProjects((current) =>
      current.map((project) =>
        project.id === active?.id
          ? { ...project, entries: project.entries.filter((entry) => entry.id !== entryId) }
          : project,
      ),
    );
  };

  const handleImage = async (file?: File) => {
    if (!file) return;
    setImageError("");
    try {
      setDumpImage(await compressImage(file));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Unable to process this image.");
    }
  };

  const simulateVoice = () => {
    const sample = "Motor stalled at 40% duty. Checked current draw ÔÇö spiked to 2.1A on the TB6612. Magic smoke appeared. Added INA219 current sensing and MOSFET soft-start. Fixed.";
    setDumpNote((previous) => previous ? `${previous} ${sample}` : sample);
    setDumpTag("");
  };

  const readme = generateReadme(active);
  const summary = generateSummary(active);
  const visibleEntries = useMemo(
    () => active ? active.entries.slice(0, scrubIndex + 1) : [],
    [active, scrubIndex],
  );
  const tradeoffs = useMemo(
    () => active ? active.entries.filter((entry) => entry.tag === "Failure" || entry.tag === "Breakthrough") : [],
    [active],
  );
  const currentScrubEntry = active?.entries[scrubIndex] ?? null;

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access requires a secure context
    }
  };

  if (!active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b]">
        <button onClick={() => setShowNewProject(true)} className={buttonPrimary}>Create first project</button>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");
        body { font-family: "Inter", system-ui, sans-serif; background: #0a0a0b; color: #fafafa; }
        .mono { font-family: "JetBrains Mono", monospace; }
        .scrub::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #22c55e; cursor: pointer; border: 2px solid #0a0a0b; }
        .connector { stroke: #22c55e; stroke-width: 2; stroke-dasharray: 4 4; opacity: 0.5; }
      `}</style>
      <div className="flex min-h-screen flex-col bg-[#0a0a0b]">
      <header className="sticky top-0 z-40 border-b border-[#1f1f23] bg-[#111113]/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#22c55e] text-sm font-bold text-black">B</div>
            <span className="font-semibold tracking-tight">BuildLog</span>
            <span className="hidden text-sm text-[#71717a] sm:inline">/ {active.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={active.id}
              onChange={(event) => setActiveId(event.target.value)}
              className="rounded-lg border border-[#1f1f23] bg-[#111113] px-3 py-1.5 text-sm focus:border-[#22c55e] focus:outline-none"
              aria-label="Select project"
            >
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <button onClick={() => setShowNewProject(true)} className="rounded-lg border border-[#1f1f23] px-3 py-1.5 text-sm text-[#71717a] transition hover:border-[#22c55e] hover:text-white">+ New</button>
            <div className="mx-1 h-6 w-px bg-border" />
            <button
              onClick={() => setViewMode((mode) => mode === "edit" ? "public" : "edit")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${viewMode === "public" ? "bg-[#22c55e] text-black" : "border border-[#1f1f23] text-[#71717a] hover:text-white"}`}
            >
              {viewMode === "edit" ? "Public View" : "Edit Mode"}
            </button>
            {viewMode === "edit" && <button onClick={() => setShowDump(true)} className="rounded-lg bg-[#22c55e] px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-[#4ade80]">+ Dump</button>}
            <button onClick={() => setShowExport(true)} className="rounded-lg border border-[#1f1f23] px-3 py-1.5 text-sm text-[#71717a] transition hover:border-[#22c55e] hover:text-white">Export</button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        <div className={`${viewMode === "public" ? "lg:col-span-8" : "lg:col-span-12"} space-y-4`}>
          {viewMode === "public" && active.entries.length > 0 && (
            <div className="space-y-4 rounded-xl border border-[#1f1f23] bg-[#111113] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Iteration Scrub</span>
                <span className="mono text-xs text-[#71717a]">v{scrubIndex + 1} / {active.entries.length}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, active.entries.length - 1)}
                value={Math.min(scrubIndex, active.entries.length - 1)}
                onChange={(event) => setScrubIndex(Number(event.target.value))}
                className="scrub w-full accent-accent"
                aria-label="Iteration timeline"
              />
              <div className="flex justify-between text-xs text-[#71717a]"><span>v0.1</span><span>Current</span></div>
              {currentScrubEntry && (
                <div className="flex gap-4 rounded-lg border border-[#1f1f23] bg-[#0a0a0b] p-3">
                  <div className="shrink-0">
                    {currentScrubEntry.image
                      ? <img src={currentScrubEntry.image} alt="" className="h-28 w-28 rounded-lg border border-[#1f1f23] object-cover" />
                      : <StageSVG tag={currentScrubEntry.tag} size={112} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <TagBadge tag={currentScrubEntry.tag} />
                      <span className="mono text-xs text-[#71717a]">{currentScrubEntry.date}</span>
                    </div>
                    <h4 className="truncate text-sm font-medium">{currentScrubEntry.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{currentScrubEntry.note}</p>
                    <SpecPills specs={currentScrubEntry.specs} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative space-y-4">
            {(viewMode === "public" ? visibleEntries : active.entries).map((entry, index, entries) => {
              const next = entries[index + 1];
              const showConnector = entry.tag === "Failure" && next?.tag === "Breakthrough";
              return (
                <div key={entry.id} className="relative">
                  <div className={`rounded-xl border bg-[#111113] p-5 transition ${entry.tag === "Failure" ? "border-[#ef4444]/40" : entry.tag === "Breakthrough" ? "border-[#22c55e]/40" : "border-[#1f1f23]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <TagBadge tag={entry.tag} />
                        <span className="mono text-xs text-[#71717a]">{entry.date}</span>
                      </div>
                      {viewMode === "edit" && (
                        <div className="flex gap-2">
                          <button onClick={() => setEditingEntry(entry)} className="text-xs text-[#71717a] hover:text-white">Edit</button>
                          <button onClick={() => deleteEntry(entry.id)} className="text-xs text-[#ef4444] hover:text-red-400">Delete</button>
                        </div>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-semibold">{entry.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">{entry.note}</p>
                    <SpecPills specs={entry.specs} />
                    {entry.image && <img src={entry.image} alt="" className="mt-3 max-h-48 rounded-lg border border-[#1f1f23] object-cover" />}
                  </div>
                  {showConnector && (
                    <div className="flex justify-center py-1">
                      <svg width="2" height="24" className="overflow-visible" aria-hidden="true">
                        <line x1="1" y1="0" x2="1" y2="24" className="connector" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
            {active.entries.length === 0 && (
              <div className="py-20 text-center text-[#71717a]">
                <p className="text-lg">No entries yet</p>
                <p className="mt-1 text-sm">Hit + Dump to start logging scars</p>
              </div>
            )}
          </div>
        </div>

        {viewMode === "public" && (
          <aside className="space-y-4 lg:col-span-4">
            <div className="sticky top-20 rounded-xl border border-[#1f1f23] bg-[#111113] p-5">
              <h3 className="mb-1 font-semibold">{active.name}</h3>
              <p className="mb-4 text-sm text-[#71717a]">{active.description}</p>
              <div className="mb-3 text-xs text-[#71717a]">Key Trade-Offs</div>
              <div className="space-y-3">
                {tradeoffs.length === 0 && <p className="text-sm text-zinc-500">None recorded</p>}
                {tradeoffs.map((entry) => (
                  <div key={entry.id} className="border-l-2 pl-3" style={{ borderColor: entry.tag === "Failure" ? "#ef4444" : "#22c55e" }}>
                    <div className="text-sm font-medium">{entry.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{entry.note}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowExport(true)} className="mt-5 w-full rounded-lg bg-[#22c55e] py-2 text-sm font-semibold text-black transition hover:bg-[#4ade80]">Export README / Summary</button>
            </div>
          </aside>
        )}
      </main>

      <Modal open={showNewProject} onClose={() => setShowNewProject(false)} title="New Project">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#71717a]">Project name</label>
            <input value={newProjName} onChange={(event) => setNewProjName(event.target.value)} className={fieldClass} placeholder="e.g. Micro-Rover v3" />
          </div>
          <div>
            <label className="text-xs text-[#71717a]">One-line description</label>
            <input value={newProjDesc} onChange={(event) => setNewProjDesc(event.target.value)} className={fieldClass} placeholder="What are you building?" />
          </div>
          <button onClick={createProject} className={`w-full ${buttonPrimary}`}>Create Project</button>
        </div>
      </Modal>

      <Modal open={showDump} onClose={() => setShowDump(false)} title="Dump Entry">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#71717a]">Title <span className="text-zinc-600">(optional ÔÇö auto-extracted)</span></label>
            <input value={dumpTitle} onChange={(event) => setDumpTitle(event.target.value)} className={fieldClass} placeholder="Leave blank to auto-generate" />
          </div>
          <div>
            <label className="text-xs text-[#71717a]">Raw notes / scars / voice transcript</label>
            <textarea value={dumpNote} onChange={(event) => setDumpNote(event.target.value)} rows={5} className={`${fieldClass} resize-none`} placeholder="Paste messy notes, error logs, or hit VoiceÔÇª" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#71717a]">Tag <span className="text-zinc-600">(optional ÔÇö auto-detected)</span></label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <button key={tag} onClick={() => setDumpTag((current) => current === tag ? "" : tag)} className={`rounded-full border px-3 py-1 text-xs transition ${dumpTag === tag ? "border-[#22c55e] bg-[#22c55e]/20 text-[#22c55e]" : "border-[#1f1f23] text-[#71717a] hover:border-zinc-500"}`}>{tag}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-lg border border-dashed border-[#1f1f23] py-2 text-sm text-[#71717a] transition hover:border-[#22c55e] hover:text-white">
              {dumpImage ? "Image attached Ô£ô" : "Drop / select image"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) => void handleImage(event.target.files?.[0])}
            />
            <button onClick={simulateVoice} className="rounded-lg border border-[#1f1f23] px-4 py-2 text-sm text-[#71717a] transition hover:text-white">­ƒÄÖ Voice</button>
          </div>
          {imageError && <p className="text-xs text-[#ef4444]">{imageError}</p>}
          {dumpImage && <img src={dumpImage} alt="Selected upload preview" className="max-h-32 rounded-lg object-cover" />}
          <button onClick={addEntry} className={`w-full ${buttonPrimary}`}>Add to Timeline</button>
        </div>
      </Modal>

      <Modal open={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit Entry">
        {editingEntry && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#71717a]">Title</label>
              <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="text-xs text-[#71717a]">Notes</label>
              <textarea value={editNote} onChange={(event) => setEditNote(event.target.value)} rows={4} className={`${fieldClass} resize-none`} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#71717a]">Tag</label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <button key={tag} type="button" onClick={() => setEditTag(tag)} className={`rounded-full border px-3 py-1 text-xs transition ${editTag === tag ? "border-[#22c55e] bg-[#22c55e]/20 text-[#22c55e]" : "border-[#1f1f23] text-[#71717a] hover:border-zinc-500"}`}>{tag}</button>
                ))}
              </div>
            </div>
            <button onClick={() => updateEntry(editingEntry.id, { title: editTitle, note: editNote, tag: editTag })} className={`w-full ${buttonPrimary}`}>Save</button>
          </div>
        )}
      </Modal>

      <Modal open={showExport} onClose={() => setShowExport(false)} title="Export" wide>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium">GitHub README.md</h4>
              <button onClick={() => void copyText(readme)} className="text-xs text-[#22c55e] hover:underline">Copy</button>
            </div>
            <pre className="mono max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-[#1f1f23] bg-[#0a0a0b] p-4 text-xs">{readme}</pre>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium">150-word Application Summary</h4>
              <button onClick={() => void copyText(summary)} className="text-xs text-[#22c55e] hover:underline">Copy</button>
            </div>
            <div className="max-h-80 overflow-auto rounded-lg border border-[#1f1f23] bg-[#0a0a0b] p-4 text-sm leading-relaxed">{summary}</div>
            <p className="mt-2 text-xs text-[#71717a]">{summary.trim() ? summary.trim().split(/\s+/).length : 0} words</p>
          </div>
        </div>
      </Modal>
      </div>
    </>
  );
}
