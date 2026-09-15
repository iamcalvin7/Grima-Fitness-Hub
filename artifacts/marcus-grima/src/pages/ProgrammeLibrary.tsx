import React, { useState } from "react";
import {
  Archive,
  ArrowLeft,
  Check,
  CheckCircle,
  CaretDown,
  FloppyDisk,
  Folders,
  PencilSimple,
  Plus,
  SpinnerGap,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  useGetAdminProgrammes,
  useGetAdminProgramme,
  useCreateProgramme,
  useUpdateProgrammeDraft,
  useCreateReplacementDraft,
  usePublishProgramme,
  useArchiveProgramme,
  type ProgrammeTemplate,
  type ProgrammeRevision,
  type ProgrammeDay,
  type ExercisePrescription,
} from "@/hooks/use-programmes";
import { useGetAdminExercises } from "@/hooks/use-exercises";

type ViewState =
  | { kind: "list" }
  | { kind: "edit"; programmeId: string | null };

export function ProgrammeLibrary() {
  const [view, setView] = useState<ViewState>({ kind: "list" });

  return (
    <div className="flex h-screen w-full flex-col bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-[#0A0A0A] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Folders size={16} weight="fill" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">Programme Library</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {view.kind === "list" ? "All Programmes" : view.programmeId ? "Edit Programme" : "New Programme"}
            </p>
          </div>
        </div>
        {view.kind !== "list" && (
          <button
            onClick={() => setView({ kind: "list" })}
            className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-white/10 text-white/70 hover:text-white"
          >
            <ArrowLeft size={14} weight="bold" />
            Back to List
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {view.kind === "list" && <ProgrammeList onSelect={(id) => setView({ kind: "edit", programmeId: id })} />}
        {view.kind === "edit" && <ProgrammeEditor programmeId={view.programmeId} onDone={() => setView({ kind: "list" })} />}
      </main>
    </div>
  );
}

function ProgrammeList({ onSelect }: { onSelect: (id: string | null) => void }) {
  const { data: programmes, isLoading, error } = useGetAdminProgrammes();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center" data-testid="programme-list-loading">
        <SpinnerGap size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-red-200" data-testid="programme-list-error">
        <WarningCircle size={32} weight="duotone" className="mb-2 text-red-400" />
        <p className="text-sm font-medium">Failed to load programmes</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide">Templates</h2>
          <p className="mt-1 text-sm text-white/45">Manage workout programmes for clients</p>
        </div>
        <button
          onClick={() => onSelect(null)}
          data-testid="button-new-programme"
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus size={14} weight="bold" />
          New Programme
        </button>
      </div>

      <div className="grid gap-4">
        {programmes?.map((programme) => (
          <ProgrammeRow key={programme.id} programme={programme} onSelect={() => onSelect(programme.id)} />
        ))}
        {programmes?.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/5 py-16 text-center">
            <Folders size={48} weight="duotone" className="mb-4 text-white/20" />
            <p className="text-lg font-bold text-white/70">No programmes yet</p>
            <p className="mt-1 text-sm text-white/40">Create a programme template to assign to clients.</p>
            <button
              onClick={() => onSelect(null)}
              data-testid="button-create-first-programme"
              className="mt-6 flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/20"
            >
              <Plus size={14} weight="bold" />
              Create First Programme
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgrammeRow({ programme, onSelect }: { programme: ProgrammeTemplate; onSelect: () => void }) {
  const publishedName = programme.publishedRevision?.name;
  const draftName = programme.draftRevision?.name;
  const displayName = draftName ?? publishedName ?? "Untitled Programme";

  const statusColor = {
    draft: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    published: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    archived: "text-white/40 bg-white/5 border-white/10",
  }[programme.status];

  return (
    <button
      onClick={onSelect}
      data-testid={`card-programme-${programme.id}`}
      className="group flex w-full text-left cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-[#141414] p-5 transition-all hover:border-primary/40 hover:bg-[#1A1A1A]"
    >
      <div>
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">{displayName}</h3>
          <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${statusColor}`}>
            {programme.status}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-white/40 flex-wrap">
          <span>Slug: {programme.slug}</span>
          <span>•</span>
          <span>Version: {programme.version}</span>
          {programme.draftRevision && programme.publishedRevision && (
            <>
              <span>•</span>
              <span className="text-amber-400/70">Has Unpublished Changes</span>
            </>
          )}
        </div>
      </div>
      <CaretDown size={16} weight="bold" className="text-white/20 -rotate-90 group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

function ProgrammeEditor({ programmeId, onDone }: { programmeId: string | null; onDone: () => void }) {
  const { data: exercises } = useGetAdminExercises("active");
  const { data: programme, isLoading } = useGetAdminProgramme(programmeId ?? "");
  const createProg = useCreateProgramme();
  const updateDraft = useUpdateProgrammeDraft(programmeId ?? "");
  const createReplacement = useCreateReplacementDraft(programmeId ?? "");
  const publishProg = usePublishProgramme(programmeId ?? "");
  const archiveProg = useArchiveProgramme(programmeId ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState<ProgrammeDay[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");

  const mapToWriteDto = () => {
    return {
      name,
      description,
      difficulty,
      goal,
      days: days.map(d => ({
        name: d.name,
        ...(d.estimatedMinutes !== null ? { estimatedMinutes: d.estimatedMinutes } : { estimatedMinutes: null }),
        exercises: d.exercises.map(ex => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          ...(ex.restSeconds != null ? { restSeconds: ex.restSeconds } : {}),
          ...(ex.notes ? { notes: ex.notes } : {})
        }))
      }))
    };
  };

  React.useEffect(() => {
    if (!programmeId) {
      setInitialized(true);
      return;
    }
    if (programme && !initialized) {
      const activeRevision = programme.draftRevision ?? programme.publishedRevision;
      if (activeRevision) {
        setName(activeRevision.name || "");
        setDescription(activeRevision.description || "");
        setDifficulty(activeRevision.difficulty || "Beginner");
        setGoal(activeRevision.goal || "");
        setDays(activeRevision.days || []);
      }
      setInitialized(true);
    }
  }, [programme, programmeId, initialized]);

  if (programmeId && isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <SpinnerGap size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  const isEditable = (!programmeId || !!programme?.draftRevision) && programme?.status !== "archived";
  const draftVersion = programme?.draftRevision?.version;

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = mapToWriteDto();
      if (!programmeId) {
        const res = await createProg.mutateAsync(payload);
        // Do not onDone(), let it stay on edit if we want, but since it's a new ID, we should transition to edit.
        // Actually, just redirect to list for simplicity or we can't update URL easily here.
        onDone();
      } else {
        await updateDraft.mutateAsync({ data: payload, version: draftVersion! });
      }
    } catch (err: any) {
      setError(err.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draftVersion) return;
    setSaving(true);
    setError(null);
    try {
      const payload = mapToWriteDto();
      // Always save draft first to ensure latest changes are persisted
      const savedProg = await updateDraft.mutateAsync({ data: payload, version: draftVersion });
      const newDraftVersion = savedProg.draftRevision!.version;
      await publishProg.mutateAsync(newDraftVersion);
    } catch (err: any) {
      setError(err.message || "Failed to publish");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!programme) return;
    setSaving(true);
    setError(null);
    try {
      await archiveProg.mutateAsync({ version: programme.version, reason: archiveReason });
      setShowArchive(false);
    } catch (err: any) {
      setError(err.message || "Failed to archive");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6 pb-32">
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
          <WarningCircle size={20} weight="fill" className="text-red-400" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Top Actions */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{programmeId ? "Edit Template" : "New Template"}</h2>
          {programme && (
            <p className="mt-1 flex gap-2 text-xs font-bold uppercase tracking-widest text-white/40 flex-wrap">
              <span className={programme.status === 'published' ? 'text-emerald-400' : programme.status === 'draft' ? 'text-amber-400' : 'text-white/40'}>{programme.status}</span>
              <span>·</span>
              <span>Version {programme.version}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {programme?.status === "published" && !programme?.draftRevision && (
            <button
              onClick={() => createReplacement.mutateAsync()}
              data-testid="button-create-replacement-draft"
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-white/20"
            >
              Revise
            </button>
          )}

          {programme?.status === "published" && !programme?.draftRevision && (
            <button
              onClick={() => setShowArchive(true)}
              data-testid="button-show-archive"
              className="rounded-full bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-red-500/20"
            >
              Archive
            </button>
          )}

          {programme?.status === "published" && programme?.draftRevision && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Publish draft to archive</span>
              <button
                disabled
                className="rounded-full bg-red-500/5 text-red-400/30 border border-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-not-allowed"
              >
                Archive
              </button>
            </div>
          )}

          {isEditable && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                data-testid="button-save-draft"
                className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                {saving ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} weight="bold" />}
                Save Draft
              </button>
              {programmeId && (
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  data-testid="button-publish"
                  className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
                >
                  {saving ? <SpinnerGap size={14} className="animate-spin" /> : <CheckCircle size={14} weight="fill" />}
                  Publish
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showArchive && (
        <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
           <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-4">Archive Programme</h3>
           <p className="text-sm text-red-200 mb-4">Are you sure you want to archive this programme? This action cannot be undone, and clients will no longer see it.</p>
           <input
              type="text"
              placeholder="Reason for archiving..."
              value={archiveReason}
              onChange={e => setArchiveReason(e.target.value)}
              data-testid="input-archive-reason"
              className="w-full bg-black/40 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-white outline-none mb-4 focus:border-red-400"
           />
           <div className="flex items-center gap-3">
             <button onClick={handleArchive} disabled={!archiveReason || saving} data-testid="button-confirm-archive" className="bg-red-500 hover:bg-red-400 text-black px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-50">Confirm Archive</button>
             <button onClick={() => setShowArchive(false)} data-testid="button-cancel-archive" className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest">Cancel</button>
           </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="space-y-8">
        <div className="rounded-2xl border border-white/5 bg-[#111111] p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-primary">General Information</h3>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Programme Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditable}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary/60 disabled:opacity-50"
                placeholder="e.g. Hypertrophy Split v2"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Goal</span>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={!isEditable}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary/60 disabled:opacity-50"
                placeholder="e.g. Muscle & Strength"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isEditable}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary/60 disabled:opacity-50"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Difficulty</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={!isEditable}
                className="mt-2 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary/60 disabled:opacity-50"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </label>
          </div>
        </div>

        {/* Days Editor */}
        <div>
           <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Workout Days</h3>
              {isEditable && (
                <button
                  onClick={() => setDays([...days, { dayNumber: days.length + 1, name: "", estimatedMinutes: 45, exercises: [] }])}
                  data-testid="button-add-day"
                  className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-white/10"
                >
                  <Plus size={12} weight="bold" /> Add Day
                </button>
              )}
           </div>

           <div className="space-y-4">
              {days.map((day, dIdx) => (
                <div key={dIdx} className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden">
                  <div className="bg-[#1A1A1A] p-4 flex items-center gap-4">
                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary font-black">
                        {dIdx + 1}
                     </div>
                     <div className="flex-1 grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={day.name}
                          onChange={(e) => {
                            const newDays = [...days];
                            newDays[dIdx].name = e.target.value;
                            setDays(newDays);
                          }}
                          disabled={!isEditable}
                          data-testid={`input-day-name-${dIdx}`}
                          placeholder="Day Name (e.g. Push Day)"
                          className="w-full bg-transparent text-sm font-bold text-white placeholder-white/20 outline-none"
                        />
                        <div className="flex items-center gap-2 text-white/50 text-xs">
                          <span>Est. Minutes:</span>
                          <input
                            type="number"
                            value={day.estimatedMinutes === null ? "" : day.estimatedMinutes}
                            onChange={(e) => {
                              const newDays = [...days];
                              newDays[dIdx].estimatedMinutes = e.target.value === "" ? null : Number(e.target.value);
                              setDays(newDays);
                            }}
                            disabled={!isEditable}
                            className="w-16 bg-white/5 px-2 py-1 rounded text-white text-center outline-none focus:bg-white/10"
                          />
                        </div>
                     </div>
                     {isEditable && (
                        <button
                          onClick={() => setDays(days.filter((_, i) => i !== dIdx))}
                          aria-label="Remove day"
                          className="text-white/20 hover:text-red-400 p-2"
                        >
                           <X size={16} weight="bold" />
                        </button>
                     )}
                  </div>

                  <div className="p-4 space-y-2">
                     {day.exercises.map((ex, eIdx) => (
                        <div key={eIdx} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                           <div className="text-[10px] font-bold text-white/30 w-4">{eIdx + 1}</div>
                           <select
                              value={ex.exerciseId}
                              onChange={(e) => {
                                const newDays = [...days];
                                newDays[dIdx].exercises[eIdx].exerciseId = e.target.value;
                                setDays(newDays);
                              }}
                              disabled={!isEditable}
                              data-testid={`select-exercise-${dIdx}-${eIdx}`}
                              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                           >
                              <option value="">Select Exercise...</option>
                              {exercises?.map(e => (
                                 <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                           </select>
                           <div className="flex items-center gap-2">
                              <input
                                 type="number"
                                 value={ex.sets}
                                 onChange={(e) => {
                                   const newDays = [...days];
                                   newDays[dIdx].exercises[eIdx].sets = Number(e.target.value);
                                   setDays(newDays);
                                 }}
                                 disabled={!isEditable}
                                 placeholder="Sets"
                                 className="w-14 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-center text-white outline-none"
                              />
                              <span className="text-white/30 text-[10px]">x</span>
                              <input
                                 type="text"
                                 value={ex.reps}
                                 onChange={(e) => {
                                   const newDays = [...days];
                                   newDays[dIdx].exercises[eIdx].reps = e.target.value;
                                   setDays(newDays);
                                 }}
                                 disabled={!isEditable}
                                 placeholder="Reps"
                                 className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-center text-white outline-none"
                              />
                           </div>
                           {isEditable && (
                              <button
                                onClick={() => {
                                  const newDays = [...days];
                                  newDays[dIdx].exercises = day.exercises.filter((_, i) => i !== eIdx);
                                  setDays(newDays);
                                }}
                                aria-label="Remove exercise"
                                className="text-white/20 hover:text-red-400 p-1"
                              >
                                 <X size={14} weight="bold" />
                              </button>
                           )}
                        </div>
                     ))}
                     {isEditable && (
                        <button
                          onClick={() => {
                            const newDays = [...days];
                            newDays[dIdx].exercises.push({ position: day.exercises.length + 1, exerciseId: "", sets: 3, reps: "10" });
                            setDays(newDays);
                          }}
                          data-testid={`button-add-exercise-${dIdx}`}
                          className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-white/40 hover:text-primary transition-colors border border-dashed border-white/10 rounded-xl hover:border-primary/40 hover:bg-primary/5 mt-2"
                        >
                           <Plus size={12} weight="bold" /> Add Exercise
                        </button>
                     )}
                  </div>
                </div>
              ))}
              {days.length === 0 && (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl">
                  <p className="text-sm font-medium text-white/40">No days added yet.</p>
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
}
