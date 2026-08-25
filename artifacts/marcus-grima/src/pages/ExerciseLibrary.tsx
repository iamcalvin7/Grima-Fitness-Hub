import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowCounterClockwise,
  ArrowLeft,
  Check,
  CheckCircle,
  CaretDown,
  FloppyDisk,
  Funnel,
  Info,
  LinkSimple,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  SpinnerGap,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { BodyMap, type MuscleId } from "@/components/BodyMap";
import { ApiError, apiRequest } from "@/lib/api";

type ExerciseStatus = "draft" | "active" | "archived";
type PerformanceType =
  | "weight_reps"
  | "bodyweight_reps"
  | "added_weight_reps"
  | "assisted_reps"
  | "duration"
  | "distance_time";
type Difficulty = "beginner" | "intermediate" | "advanced";
type Laterality = "bilateral" | "unilateral";
type MuscleRole = "primary" | "secondary";
type MuscleKey =
  | "chest"
  | "upper_chest"
  | "front_delts"
  | "side_delts"
  | "biceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "quads"
  | "adductors"
  | "traps"
  | "rear_delts"
  | "lats"
  | "triceps"
  | "lower_back"
  | "glutes"
  | "hamstrings"
  | "calves";

export interface ExerciseRecord {
  id: string;
  name: string;
  slug: string;
  status: ExerciseStatus;
  version: number;
  performanceType: PerformanceType | null;
  movementPattern: string | null;
  laterality: Laterality | null;
  description: string | null;
  instructions: string | null;
  difficulty: Difficulty | null;
  defaultRestSeconds: number | null;
  safetyNotes: string | null;
  internalNotes: string | null;
  mediaUrl: string | null;
  createdAt: string;
  updatedAt: string;
  muscles: { muscleKey: MuscleKey; role: MuscleRole }[];
  equipment: { equipmentKey: string; required: boolean }[];
}

interface ExercisePage {
  exercises: ExerciseRecord[];
  pagination: { page: number; limit: number; total: number };
}

const PERFORMANCE_TYPES: { value: PerformanceType; label: string; hint: string }[] = [
  { value: "weight_reps", label: "Weight + reps", hint: "Load and repetitions" },
  { value: "bodyweight_reps", label: "Bodyweight reps", hint: "Repetitions using bodyweight" },
  { value: "added_weight_reps", label: "Added-weight reps", hint: "Bodyweight plus external load" },
  { value: "assisted_reps", label: "Assisted reps", hint: "Repetitions with assistance" },
  { value: "duration", label: "Duration", hint: "Time under effort" },
  { value: "distance_time", label: "Distance + time", hint: "Distance completed against time" },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const LATERALITIES: { value: Laterality; label: string }[] = [
  { value: "bilateral", label: "Bilateral" },
  { value: "unilateral", label: "Unilateral" },
];

const MUSCLES: { value: MuscleKey; label: string }[] = [
  { value: "chest", label: "Chest" },
  { value: "upper_chest", label: "Upper chest" },
  { value: "front_delts", label: "Front delts" },
  { value: "side_delts", label: "Side delts" },
  { value: "biceps", label: "Biceps" },
  { value: "forearms", label: "Forearms" },
  { value: "abs", label: "Abs" },
  { value: "obliques", label: "Obliques" },
  { value: "quads", label: "Quads" },
  { value: "adductors", label: "Adductors" },
  { value: "traps", label: "Traps" },
  { value: "rear_delts", label: "Rear delts" },
  { value: "lats", label: "Lats" },
  { value: "triceps", label: "Triceps" },
  { value: "lower_back", label: "Lower back" },
  { value: "glutes", label: "Glutes" },
  { value: "hamstrings", label: "Hamstrings" },
  { value: "calves", label: "Calves" },
];

const SERVER_TO_BODYMAP: Partial<Record<MuscleKey, MuscleId>> = {
  chest: "chest",
  front_delts: "front_deltoids",
  rear_delts: "rear_deltoids",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  abs: "abs",
  obliques: "obliques",
  quads: "quadriceps",
  adductors: "adductors",
  traps: "trapezius",
  lats: "lats",
  lower_back: "lower_back",
  glutes: "glutes",
  hamstrings: "hamstrings",
  calves: "calves",
};

const BODYMAP_TO_SERVER = Object.entries(SERVER_TO_BODYMAP).reduce(
  (result, [serverKey, bodyMapKey]) => {
    if (bodyMapKey) result[bodyMapKey] = serverKey as MuscleKey;
    return result;
  },
  {} as Partial<Record<MuscleId, MuscleKey>>,
);

const STATUS_CONFIG: Record<
  ExerciseStatus,
  { label: string; detail: string; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    detail: "Needs review",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    icon: <PencilSimple size={13} weight="bold" />,
  },
  active: {
    label: "Active",
    detail: "Client-visible",
    className: "border-primary/30 bg-primary/10 text-primary",
    icon: <CheckCircle size={13} weight="fill" />,
  },
  archived: {
    label: "Archived",
    detail: "Not client-visible",
    className: "border-white/15 bg-white/6 text-white/55",
    icon: <Archive size={13} weight="bold" />,
  },
};

const INITIAL_FORM: FormState = {
  name: "",
  slug: "",
  performanceType: "",
  movementPattern: "",
  laterality: "",
  description: "",
  instructions: "",
  difficulty: "",
  defaultRestSeconds: "",
  safetyNotes: "",
  internalNotes: "",
  mediaUrl: "",
  primaryMuscle: "",
  secondaryMuscles: [],
  equipment: [],
};

interface EquipmentDraft {
  equipmentKey: string;
  required: boolean;
}

interface FormState {
  name: string;
  slug: string;
  performanceType: PerformanceType | "";
  movementPattern: string;
  laterality: Laterality | "";
  description: string;
  instructions: string;
  difficulty: Difficulty | "";
  defaultRestSeconds: string;
  safetyNotes: string;
  internalNotes: string;
  mediaUrl: string;
  primaryMuscle: MuscleKey | "";
  secondaryMuscles: MuscleKey[];
  equipment: EquipmentDraft[];
}

function labelForMuscle(key: string | null | undefined) {
  return MUSCLES.find((muscle) => muscle.value === key)?.label ?? key ?? "Unassigned";
}

function labelForPerformance(value: string | null | undefined) {
  return PERFORMANCE_TYPES.find((type) => type.value === value)?.label ?? "Not configured";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeEquipmentKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toForm(exercise?: ExerciseRecord | null): FormState {
  if (!exercise) return { ...INITIAL_FORM, secondaryMuscles: [], equipment: [] };
  return {
    name: exercise.name,
    slug: exercise.slug,
    performanceType: exercise.performanceType ?? "",
    movementPattern: exercise.movementPattern ?? "",
    laterality: exercise.laterality ?? "",
    description: exercise.description ?? "",
    instructions: exercise.instructions ?? "",
    difficulty: exercise.difficulty ?? "",
    defaultRestSeconds:
      exercise.defaultRestSeconds === null ? "" : String(exercise.defaultRestSeconds),
    safetyNotes: exercise.safetyNotes ?? "",
    internalNotes: exercise.internalNotes ?? "",
    mediaUrl: exercise.mediaUrl ?? "",
    primaryMuscle: exercise.muscles.find((muscle) => muscle.role === "primary")?.muscleKey ?? "",
    secondaryMuscles: exercise.muscles
      .filter((muscle) => muscle.role === "secondary")
      .map((muscle) => muscle.muscleKey),
    equipment: exercise.equipment.map((item) => ({
      equipmentKey: item.equipmentKey,
      required: item.required,
    })),
  };
}

function toPayload(form: FormState) {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    performanceType: form.performanceType || null,
    movementPattern: form.movementPattern.trim() || null,
    laterality: form.laterality || null,
    description: form.description.trim() || null,
    instructions: form.instructions.trim() || null,
    difficulty: form.difficulty || null,
    defaultRestSeconds: form.defaultRestSeconds.trim()
      ? Number(form.defaultRestSeconds)
      : null,
    safetyNotes: form.safetyNotes.trim() || null,
    internalNotes: form.internalNotes.trim() || null,
    mediaUrl: form.mediaUrl.trim() || null,
    muscles: [
      ...(form.primaryMuscle
        ? [{ muscleKey: form.primaryMuscle, role: "primary" as const }]
        : []),
      ...form.secondaryMuscles.map((muscleKey) => ({
        muscleKey,
        role: "secondary" as const,
      })),
    ],
    equipment: form.equipment
      .filter((item) => item.equipmentKey.trim())
      .map((item) => ({
        equipmentKey: item.equipmentKey.trim(),
        required: item.required,
      })),
  };
  if (form.slug.trim()) payload.slug = form.slug.trim();
  return payload;
}

function getFieldErrors(error: ApiError | null): Record<string, string> {
  const details = error?.details?.fields;
  if (details && typeof details === "object" && !Array.isArray(details)) {
    return details as Record<string, string>;
  }
  if (Array.isArray(details)) {
    return Object.fromEntries(details.map((field) => [String(field), "Needs attention"]));
  }
  return {};
}

function userFacingError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 401) return "Your session has expired. Sign in again to manage the catalogue.";
  if (error.status === 403) return "You do not have permission to manage the exercise catalogue.";
  if (error.status === 0) return error.message;
  return error.message || fallback;
}

function isConflict(error: unknown) {
  return error instanceof ApiError && error.status === 409;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated recently";
  return `Updated ${date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function statusBadge(status: ExerciseStatus) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading exercises">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="h-52 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
      ))}
    </div>
  );
}

function EmptyState({
  filtered,
  onCreate,
}: {
  filtered: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/35">
        <Funnel size={24} weight="bold" />
      </div>
      <h2 className="text-lg font-black text-white">
        {filtered ? "No exercises match those filters" : "Your catalogue is empty"}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/45">
        {filtered
          ? "Try clearing a filter or searching for a different movement."
          : "Create the first draft exercise to start building Marcus’s server-authoritative library."}
      </p>
      {!filtered && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-85"
        >
          <Plus size={15} weight="bold" /> Create draft
        </button>
      )}
    </div>
  );
}

function ExerciseCard({
  exercise,
  onEdit,
}: {
  exercise: ExerciseRecord;
  onEdit: () => void;
}) {
  const primary = exercise.muscles.find((muscle) => muscle.role === "primary")?.muscleKey;
  const secondary = exercise.muscles.filter((muscle) => muscle.role === "secondary");
  const mediaBroken = !exercise.mediaUrl ? false : undefined;
  return (
    <article className="group flex min-h-56 flex-col rounded-2xl border border-white/8 bg-[#111111] p-5 transition-colors hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">
            {labelForPerformance(exercise.performanceType)}
          </p>
          <h2 className="break-words text-lg font-black leading-tight text-white">{exercise.name}</h2>
          <p className="mt-1 truncate text-xs font-medium text-white/30">/{exercise.slug}</p>
        </div>
        {statusBadge(exercise.status)}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/7 py-4 text-xs">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">Primary muscle</p>
          <p className="mt-1 font-bold text-white/75">{labelForMuscle(primary)}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">Difficulty</p>
          <p className="mt-1 font-bold capitalize text-white/75">{exercise.difficulty ?? "Not set"}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">Equipment</p>
          <p className="mt-1 truncate font-bold text-white/75">
            {exercise.equipment.length
              ? exercise.equipment.map((item) => item.equipmentKey.replace(/_/g, " ")).join(", ")
              : "None listed"}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">Media</p>
          <p className="mt-1 font-bold text-white/75">{mediaBroken === false ? "Reference linked" : "No reference"}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-white/35">{formatUpdatedAt(exercise.updatedAt)}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">
            v{exercise.version}
            {secondary.length ? ` · ${secondary.length} additional muscle${secondary.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/75 transition-colors hover:border-white/30 hover:text-white"
        >
          <PencilSimple size={14} weight="bold" /> Edit
        </button>
      </div>
    </article>
  );
}

export function ExerciseLibrary() {
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | ExerciseStatus>("");
  const [performanceType, setPerformanceType] = useState<"" | PerformanceType>("");
  const [muscle, setMuscle] = useState<"" | MuscleKey>("");
  const [equipment, setEquipment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<ExerciseRecord | null | undefined>(undefined);
  const [notice, setNotice] = useState("");
  const requestId = useRef(0);

  const fetchExercises = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(pagination.page), limit: "25" });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (performanceType) params.set("performanceType", performanceType);
    if (muscle) params.set("muscle", muscle);
    if (equipment.trim()) params.set("equipment", equipment.trim());
    try {
      const result = await apiRequest<ExercisePage>(`/admin/exercises?${params.toString()}`);
      if (id !== requestId.current) return;
      setExercises(result.exercises);
      setPagination(result.pagination);
    } catch (caught) {
      if (id !== requestId.current) return;
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(userFacingError(caught, "Unable to load the exercise catalogue."));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [equipment, muscle, pagination.page, performanceType, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchExercises(), search.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchExercises]);

  useEffect(() => {
    setPagination((current) => (current.page === 1 ? current : { ...current, page: 1 }));
  }, [search, status, performanceType, muscle, equipment]);

  const hasFilters = Boolean(search || status || performanceType || muscle || equipment);
  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPerformanceType("");
    setMuscle("");
    setEquipment("");
  };

  const openCreate = () => {
    setNotice("");
    setEditor(null);
  };

  const openEdit = async (exercise: ExerciseRecord) => {
    setNotice("");
    try {
      const result = await apiRequest<{ exercise: ExerciseRecord }>(`/admin/exercises/${exercise.id}`);
      setEditor(result.exercise);
    } catch (caught) {
      setError(userFacingError(caught, "Unable to load the latest exercise record."));
    }
  };

  const refresh = async () => {
    await fetchExercises();
  };

  const handleCreated = (exercise: ExerciseRecord) => {
    setEditor(undefined);
    setNotice(`Draft “${exercise.name}” created.`);
    void refresh();
  };

  const handleChanged = (exercise: ExerciseRecord) => {
    setEditor(exercise);
    setNotice("");
    void refresh();
  };

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  return (
    <div className="min-h-screen bg-transparent pb-28 md:pb-12">
      <header className="border-b border-white/7 px-5 pb-6 pt-8 md:px-8 md:pt-10">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-primary">Marcus HQ / Catalogue</p>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Exercise Library</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">
                Build the approved movement catalogue that powers future programming. Drafts stay private until you explicitly activate them.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-black uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-85"
            >
              <Plus size={16} weight="bold" /> New exercise
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2">
              <Info size={13} /> Server-authoritative
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2">
              <CheckCircle size={13} /> Active exercises are client-visible
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-5 py-6 md:px-8">
        {notice && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/[0.08] px-4 py-3 text-sm text-primary" role="status">
            <CheckCircle className="mt-0.5 shrink-0" size={17} weight="fill" />
            <p>{notice}</p>
            <button type="button" className="ml-auto text-primary/60 hover:text-primary" aria-label="Dismiss notification" onClick={() => setNotice("")}>
              <X size={15} />
            </button>
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-white/8 bg-[#111111]/85 p-4 md:p-5" aria-label="Exercise filters">
          <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
            <Funnel size={14} /> Find an exercise
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.6fr)_repeat(4,minmax(130px,1fr))_auto]">
            <label className="relative block">
              <span className="sr-only">Search exercises</span>
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by exercise name"
                className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-primary/60"
              />
            </label>
            <FilterSelect label="Status" value={status} onChange={(value) => setStatus(value as "" | ExerciseStatus)}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </FilterSelect>
            <FilterSelect label="Performance" value={performanceType} onChange={(value) => setPerformanceType(value as "" | PerformanceType)}>
              <option value="">All types</option>
              {PERFORMANCE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </FilterSelect>
            <FilterSelect label="Muscle" value={muscle} onChange={(value) => setMuscle(value as "" | MuscleKey)}>
              <option value="">All muscles</option>
              {MUSCLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </FilterSelect>
            <label className="block">
              <span className="sr-only">Equipment filter</span>
              <input
                value={equipment}
                onChange={(event) => setEquipment(event.target.value)}
                placeholder="Equipment"
                className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-primary/60"
              />
            </label>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="min-h-11 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/45 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Clear
            </button>
          </div>
        </section>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">{loading ? "Loading catalogue…" : `${pagination.total} exercise${pagination.total === 1 ? "" : "s"}`}</p>
            {!loading && <p className="mt-1 text-xs text-white/35">Showing draft, active, and archived definitions for this tenant.</p>}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/55 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
          >
            <ArrowCounterClockwise className={loading ? "animate-spin" : ""} size={14} /> Refresh
          </button>
        </div>

        {error ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.04] px-6 text-center" role="alert">
            <WarningCircle size={28} className="text-red-300" weight="fill" />
            <h2 className="mt-4 text-lg font-black text-white">Catalogue unavailable</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">{error}</p>
            <button type="button" onClick={() => void refresh()} className="mt-5 min-h-11 rounded-xl border border-white/15 px-4 text-xs font-black uppercase tracking-[0.14em] text-white hover:border-white/30">
              Try again
            </button>
          </div>
        ) : loading ? (
          <LoadingState />
        ) : exercises.length === 0 ? (
          <EmptyState filtered={hasFilters} onCreate={openCreate} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} onEdit={() => void openEdit(exercise)} />
            ))}
          </div>
        )}

        {!loading && !error && pagination.total > pagination.limit && (
          <nav className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-[#111111]/80 px-4 py-3" aria-label="Exercise pages">
            <p className="text-xs text-white/40">Page {pagination.page} of {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-bold text-white/60 disabled:opacity-25">Previous</button>
              <button type="button" disabled={pagination.page >= totalPages} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-bold text-white/60 disabled:opacity-25">Next</button>
            </div>
          </nav>
        )}
      </main>

      {editor !== undefined && (
        <ExerciseEditor
          exercise={editor}
          onClose={() => setEditor(undefined)}
          onCreated={handleCreated}
          onChanged={handleChanged}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 pr-9 text-sm text-white outline-none transition-colors focus:border-primary/60"
      >
        {children}
      </select>
      <CaretDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35" size={14} />
    </label>
  );
}

function ExerciseEditor({
  exercise,
  onClose,
  onCreated,
  onChanged,
}: {
  exercise: ExerciseRecord | null;
  onClose: () => void;
  onCreated: (exercise: ExerciseRecord) => void;
  onChanged: (exercise: ExerciseRecord) => void;
}) {
  const isNew = exercise === null;
  const [record, setRecord] = useState<ExerciseRecord | null>(exercise);
  const [form, setForm] = useState<FormState>(() => toForm(exercise));
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<"activate" | "archive" | "restore" | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [mediaBroken, setMediaBroken] = useState(false);
  const initialForm = useRef(JSON.stringify(form));
  const dirty = JSON.stringify(form) !== initialForm.current;
  const fieldErrors = getFieldErrors(error);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const close = () => {
    if (dirty && !window.confirm("You have unsaved changes. Close without saving?")) return;
    onClose();
  };

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
    setSuccess("");
  };

  const updateName = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: !current.slug || current.slug === slugify(current.name) ? slugify(value) : current.slug,
    }));
    setError(null);
  };

  const setPrimaryMuscle = (value: MuscleKey | "") => {
    setForm((current) => ({
      ...current,
      primaryMuscle: value,
      secondaryMuscles: current.secondaryMuscles.filter((muscle) => muscle !== value),
    }));
    setError(null);
  };

  const toggleSecondary = (value: MuscleKey) => {
    setForm((current) => ({
      ...current,
      secondaryMuscles: current.secondaryMuscles.includes(value)
        ? current.secondaryMuscles.filter((muscle) => muscle !== value)
        : [...current.secondaryMuscles, value].filter((muscle) => muscle !== current.primaryMuscle),
    }));
    setError(null);
  };

  const selectedBodyMapMuscles = useMemo(
    () =>
      [form.primaryMuscle, ...form.secondaryMuscles]
        .map((key) => (key ? SERVER_TO_BODYMAP[key] : undefined))
        .filter((key): key is MuscleId => Boolean(key)),
    [form.primaryMuscle, form.secondaryMuscles],
  );

  const toggleBodyMapMuscle = (bodyMapKey: MuscleId) => {
    const serverKey = BODYMAP_TO_SERVER[bodyMapKey];
    if (!serverKey) return;
    const isSelected = serverKey === form.primaryMuscle || form.secondaryMuscles.includes(serverKey);
    if (isSelected) {
      if (serverKey === form.primaryMuscle) {
        setForm((current) => ({ ...current, primaryMuscle: "", secondaryMuscles: current.secondaryMuscles.filter((item) => item !== serverKey) }));
      } else {
        toggleSecondary(serverKey);
      }
    } else if (!form.primaryMuscle) {
      setPrimaryMuscle(serverKey);
    } else {
      toggleSecondary(serverKey);
    }
  };

  const addEquipment = () => {
    setForm((current) => ({ ...current, equipment: [...current.equipment, { equipmentKey: "", required: true }] }));
  };

  const updateEquipment = (index: number, changes: Partial<EquipmentDraft>) => {
    setForm((current) => ({
      ...current,
      equipment: current.equipment.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item),
    }));
    setError(null);
  };

  const removeEquipment = (index: number) => {
    setForm((current) => ({ ...current, equipment: current.equipment.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess("");
    if (!form.name.trim()) {
      setError(new ApiError(400, "Exercise name is required"));
      return;
    }
    const equipmentKeys = form.equipment.map((item) => normalizeEquipmentKey(item.equipmentKey)).filter(Boolean);
    if (new Set(equipmentKeys).size !== equipmentKeys.length) {
      setError(new ApiError(400, "Each equipment item may appear only once"));
      return;
    }
    if (form.defaultRestSeconds && (!/^\d+$/.test(form.defaultRestSeconds) || Number(form.defaultRestSeconds) < 1 || Number(form.defaultRestSeconds) > 3600)) {
      setError(new ApiError(400, "Default rest must be an integer from 1 to 3600 seconds"));
      return;
    }
    setSaving(true);
    try {
      const result = isNew
        ? await apiRequest<{ exercise: ExerciseRecord }>("/admin/exercises", { method: "POST", body: toPayload(form) })
        : await apiRequest<{ exercise: ExerciseRecord }>(`/admin/exercises/${record!.id}`, { method: "PATCH", body: toPayload(form) });
      initialForm.current = JSON.stringify(toForm(result.exercise));
      setForm(toForm(result.exercise));
      setRecord(result.exercise);
      if (isNew) {
        onCreated(result.exercise);
      } else {
        setSuccess("Changes saved. The server accepted the current version.");
        onChanged(result.exercise);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, userFacingError(caught, "Unable to save this exercise.")));
    } finally {
      setSaving(false);
    }
  };

  const reload = async () => {
    if (!record) return;
    setSaving(true);
    setError(null);
    try {
      const result = await apiRequest<{ exercise: ExerciseRecord }>(`/admin/exercises/${record.id}`);
      setRecord(result.exercise);
      setForm(toForm(result.exercise));
      initialForm.current = JSON.stringify(toForm(result.exercise));
      setSuccess("Reloaded the latest server version. Review it before saving again.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, userFacingError(caught, "Unable to reload the exercise.")));
    } finally {
      setSaving(false);
    }
  };

  const lifecycle = async (kind: "activate" | "archive" | "restore") => {
    if (!record) return;
    if (dirty && !window.confirm("Save or discard your changes before changing lifecycle status?")) return;
    if (kind === "activate" && !window.confirm("Activate this exercise? It will become available to permitted client catalogue consumers.")) return;
    if (kind === "restore" && !window.confirm("Restore this exercise to draft? It will need review and activation before clients can see it.")) return;
    if (kind === "archive") {
      if (!window.confirm("Archive this exercise? Archiving removes it from client catalogue results; it does not delete the record.")) return;
      if (!archiveReason.trim()) {
        setError(new ApiError(400, "Archive reason is required"));
        return;
      }
    }
    setAction(kind);
    setError(null);
    setSuccess("");
    try {
      const endpoint = kind === "activate"
        ? `/admin/exercises/${record.id}/activate`
        : kind === "archive"
          ? `/admin/exercises/${record.id}/archive`
          : `/admin/exercises/${record.id}/restore`;
      const result = await apiRequest<{ exercise: ExerciseRecord }>(endpoint, {
        method: "POST",
        body: kind === "archive" ? { reason: archiveReason.trim() } : undefined,
      });
      setRecord(result.exercise);
      setForm(toForm(result.exercise));
      initialForm.current = JSON.stringify(toForm(result.exercise));
      setArchiveReason("");
      setSuccess(kind === "activate" ? "Exercise activated. It is now client-visible." : kind === "archive" ? "Exercise archived. It is no longer client-visible." : "Exercise restored to draft for review.");
      onChanged(result.exercise);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, userFacingError(caught, "Unable to change lifecycle status.")));
    } finally {
      setAction(null);
    }
  };

  const activationFields = Array.isArray(error?.details?.fields)
    ? (error?.details?.fields as string[]).map((field) => field === "primaryMuscle" ? "Primary muscle" : field.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`))
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-0 backdrop-blur-sm md:p-6" role="dialog" aria-modal="true" aria-label={isNew ? "Create exercise" : `Edit ${record?.name ?? "exercise"}`}>
      <div className="ml-auto min-h-full w-full max-w-5xl border-l border-white/10 bg-[#0d0d0d] shadow-2xl md:min-h-0 md:rounded-2xl md:border">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/8 bg-[#0d0d0d]/95 px-5 py-4 backdrop-blur-md md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={close} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/55 hover:border-white/25 hover:text-white" aria-label="Close editor">
              <ArrowLeft size={18} weight="bold" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{isNew ? "New draft" : `${record?.status ?? "Exercise"} · v${record?.version ?? 1}`}</p>
              <h2 className="truncate text-lg font-black text-white">{isNew ? "Create exercise" : record?.name}</h2>
            </div>
          </div>
          <button type="button" onClick={close} className="hidden text-white/35 hover:text-white md:block" aria-label="Close editor"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="space-y-6 px-5 py-6 md:px-7">
          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3" role="alert">
              <div className="flex items-start gap-3 text-sm text-red-200">
                <WarningCircle className="mt-0.5 shrink-0" size={17} weight="fill" />
                <div className="min-w-0">
                  <p className="font-bold">{isConflict(error) ? "This exercise changed elsewhere" : error.message}</p>
                  {isConflict(error) && <p className="mt-1 text-xs leading-relaxed text-red-200/70">Your unsaved input is still here. Reload the latest record explicitly before deciding what to keep.</p>}
                  {activationFields.length > 0 && <p className="mt-1 text-xs leading-relaxed text-red-200/70">Complete: {activationFields.join(", ")}.</p>}
                  {Object.keys(fieldErrors).length > 0 && <p className="mt-1 text-xs leading-relaxed text-red-200/70">Check the highlighted fields below.</p>}
                </div>
                {isConflict(error) && record && <button type="button" onClick={() => void reload()} disabled={saving} className="ml-auto shrink-0 rounded-lg border border-red-200/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-100 hover:border-red-200/40">Reload</button>}
              </div>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/[0.08] px-4 py-3 text-sm text-primary" role="status">
              <CheckCircle className="mt-0.5 shrink-0" size={17} weight="fill" /> <p>{success}</p>
            </div>
          )}

          <section>
            <SectionHeading eyebrow="01 / Basic information" title="Name the movement" description="Use a stable, descriptive name. Tenant ownership and lifecycle are managed by the server." />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextField label="Exercise name" required value={form.name} error={fieldErrors.name} onChange={updateName} placeholder="e.g. Front foot elevated split squat" />
              <TextField label="Canonical slug" value={form.slug} error={fieldErrors.slug} disabled={record?.status === "active"} onChange={(value) => updateField("slug", slugify(value))} placeholder="Auto-generated from the name" hint={record?.status === "active" ? "Active slugs are locked by the server." : "Lowercase letters, numbers, and hyphens."} />
              <TextArea label="Description" value={form.description} error={fieldErrors.description} onChange={(value) => updateField("description", value)} placeholder="What this movement is and when to use it." rows={3} className="md:col-span-2" />
            </div>
          </section>

          <section className="border-t border-white/8 pt-6">
            <SectionHeading eyebrow="02 / Performance configuration" title="How is it measured?" description="Choose the approved measurement model. Personal-best calculations and workout logging are not part of this library." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {PERFORMANCE_TYPES.map((type) => (
                <button type="button" key={type.value} onClick={() => updateField("performanceType", type.value)} className={`rounded-xl border p-4 text-left transition-colors ${form.performanceType === type.value ? "border-primary/50 bg-primary/[0.09]" : "border-white/8 bg-white/[0.03] hover:border-white/20"}`} aria-pressed={form.performanceType === type.value}>
                  <span className={`text-sm font-black ${form.performanceType === type.value ? "text-primary" : "text-white/80"}`}>{type.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-white/40">{type.hint}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <SelectField label="Difficulty" value={form.difficulty} error={fieldErrors.difficulty} onChange={(value) => updateField("difficulty", value as Difficulty | "")}>
                <option value="">Choose difficulty</option>
                {DIFFICULTIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </SelectField>
              <SelectField label="Laterality" value={form.laterality} error={fieldErrors.laterality} onChange={(value) => updateField("laterality", value as Laterality | "")}>
                <option value="">Choose laterality</option>
                {LATERALITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </SelectField>
              <TextField label="Default rest (seconds)" value={form.defaultRestSeconds} error={fieldErrors.defaultRestSeconds} onChange={(value) => updateField("defaultRestSeconds", value.replace(/[^\d]/g, ""))} placeholder="e.g. 90" inputMode="numeric" />
            </div>
            <TextField className="mt-4" label="Movement pattern" required={record?.status === "active"} value={form.movementPattern} error={fieldErrors.movementPattern} onChange={(value) => updateField("movementPattern", value)} placeholder="e.g. Knee-dominant single-leg squat" />
          </section>

          <section className="border-t border-white/8 pt-6">
            <SectionHeading eyebrow="03 / Muscle targeting" title="Map the stimulus" description="Choose one primary muscle and any additional muscles. The BodyMap highlights compatible canonical keys; the list below covers the full server vocabulary." />
            <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.2fr)]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <BodyMap interactive selectedMuscles={selectedBodyMapMuscles} onMuscleToggle={toggleBodyMapMuscle} />
                <p className="mt-3 text-center text-[10px] leading-relaxed text-white/30">Click a compatible region to add it. Use the canonical selectors for upper chest and side delts.</p>
              </div>
              <div className="space-y-4">
                <SelectField label="Primary muscle" required={record?.status === "active"} value={form.primaryMuscle} error={fieldErrors.primaryMuscle} onChange={(value) => setPrimaryMuscle(value as MuscleKey | "")}>
                  <option value="">Choose the primary muscle</option>
                  {MUSCLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </SelectField>
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Additional muscles</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MUSCLES.filter((item) => item.value !== form.primaryMuscle).map((item) => {
                      const selected = form.secondaryMuscles.includes(item.value);
                      return (
                        <label key={item.value} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm transition-colors ${selected ? "border-primary/35 bg-primary/[0.08] text-white" : "border-white/8 bg-white/[0.02] text-white/55 hover:border-white/20"}`}>
                          <input type="checkbox" checked={selected} onChange={() => toggleSecondary(item.value)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                          <span>{item.label}</span>
                          {selected && <Check className="ml-auto text-primary" size={15} weight="bold" />}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-white/8 pt-6">
            <SectionHeading eyebrow="04 / Equipment" title="What does it require?" description="Equipment keys are normalized by the server. Keep each item unique and mark whether it is required." />
            <div className="mt-5 space-y-2">
              {form.equipment.map((item, index) => (
                <div key={`${index}-${item.equipmentKey}`} className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:flex-row sm:items-center">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Equipment {index + 1}</span>
                    <input value={item.equipmentKey} onChange={(event) => updateEquipment(index, { equipmentKey: event.target.value })} placeholder="e.g. Barbell" className="min-h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary/60" />
                  </label>
                  <label className="flex min-h-10 shrink-0 items-center gap-2 px-1 text-xs text-white/60">
                    <input type="checkbox" checked={item.required} onChange={(event) => updateEquipment(index, { required: event.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                    Required
                  </label>
                  <button type="button" onClick={() => removeEquipment(index)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/35 hover:bg-red-400/10 hover:text-red-300" aria-label={`Remove equipment ${index + 1}`}><Trash size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={addEquipment} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-white/15 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/50 hover:border-primary/40 hover:text-primary"><Plus size={14} weight="bold" /> Add equipment</button>
            </div>
          </section>

          <section className="border-t border-white/8 pt-6">
            <SectionHeading eyebrow="05 / Coaching information" title="Help Marcus coach it" description="Activation requires instructions. Safety and internal notes remain separate so internal context is never exposed to clients." />
            <div className="mt-5 space-y-4">
              <TextArea label="Instructions" required={record?.status === "active"} value={form.instructions} error={fieldErrors.instructions} onChange={(value) => updateField("instructions", value)} placeholder="Step-by-step coaching cues and execution notes." rows={6} />
              <div className="grid gap-4 md:grid-cols-2">
                <TextArea label="Safety notes" value={form.safetyNotes} error={fieldErrors.safetyNotes} onChange={(value) => updateField("safetyNotes", value)} placeholder="Limitations, setup warnings, or regressions." rows={4} />
                <TextArea label="Internal notes" value={form.internalNotes} error={fieldErrors.internalNotes} onChange={(value) => updateField("internalNotes", value)} placeholder="Private context for Marcus/admin only." rows={4} />
              </div>
            </div>
          </section>

          <section className="border-t border-white/8 pt-6">
            <SectionHeading eyebrow="06 / Media reference" title="Optional demonstration media" description="This gate accepts an app-relative or HTTPS reference only. It does not upload or store files." />
            <div className="mt-5">
              <TextField label="Media URL" value={form.mediaUrl} error={fieldErrors.mediaUrl} onChange={(value) => { setMediaBroken(false); updateField("mediaUrl", value); }} placeholder="https://… or /media/…" hint="Use an HTTPS URL or an app-relative path." />
              {form.mediaUrl && (
                <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  {mediaBroken ? (
                    <p className="flex items-center gap-2 text-xs text-amber-200"><WarningCircle size={15} /> The reference could not be previewed. It will still be saved if the server accepts it.</p>
                  ) : (
                    <a href={form.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 break-all text-xs font-bold text-primary hover:underline" onClick={() => setMediaBroken(false)}>
                      <LinkSimple size={14} /> Open media reference
                    </a>
                  )}
                  <img src={form.mediaUrl} alt="" className="mt-3 hidden max-h-40 max-w-full rounded-lg object-contain" onError={() => setMediaBroken(true)} onLoad={() => setMediaBroken(false)} />
                </div>
              )}
            </div>
          </section>

          {!isNew && record && (
            <section className="border-t border-white/8 pt-6">
              <SectionHeading eyebrow="07 / Lifecycle" title="Review and publish deliberately" description="Saving changes never activates a draft. Every lifecycle transition is a separate server-confirmed action." />
              <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">{statusBadge(record.status)} <span className="text-xs text-white/35">{STATUS_CONFIG[record.status].detail}</span></div>
                    <p className="mt-3 max-w-xl text-xs leading-relaxed text-white/45">
                      {record.status === "draft" ? "Activation checks required metadata and makes this definition available to permitted client catalogue consumers." : record.status === "active" ? "Archiving removes this definition from client catalogue results without deleting its history." : "Restoring returns this definition to draft so it can be reviewed before activation."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {record.status === "draft" && <button type="button" onClick={() => void lifecycle("activate")} disabled={action !== null || saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-[10px] font-black uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40">{action === "activate" ? <SpinnerGap className="animate-spin" size={15} /> : <CheckCircle size={15} weight="fill" />} Activate</button>}
                    {record.status === "active" && <button type="button" onClick={() => void lifecycle("archive")} disabled={action !== null || saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100 disabled:opacity-40"><Archive size={15} /> Archive</button>}
                    {record.status === "archived" && <button type="button" onClick={() => void lifecycle("restore")} disabled={action !== null || saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-40"><ArrowCounterClockwise size={15} /> Restore to draft</button>}
                  </div>
                </div>
                {record.status === "active" && (
                  <label className="mt-4 block max-w-xl">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">Archive reason</span>
                    <input value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} maxLength={500} placeholder="Required only when archiving" className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary/60" />
                  </label>
                )}
              </div>
            </section>
          )}

          <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-3 border-t border-white/8 bg-[#0d0d0d]/95 px-5 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between md:-mx-7 md:px-7">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
              {dirty ? <><span className="h-2 w-2 rounded-full bg-amber-300" /> Unsaved changes</> : <><Check size={13} /> All changes saved</>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={close} className="min-h-11 flex-1 rounded-xl border border-white/10 px-4 text-xs font-black uppercase tracking-[0.14em] text-white/60 hover:border-white/25 hover:text-white sm:flex-none">Cancel</button>
              <button type="submit" disabled={saving || action !== null} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-black uppercase tracking-[0.14em] text-black transition-opacity hover:bg-white/90 disabled:opacity-40 sm:flex-none">
                {saving ? <SpinnerGap className="animate-spin" size={16} /> : <FloppyDisk size={16} weight="bold" />}
                {isNew ? "Save draft" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h3 className="mt-1 text-xl font-black text-white">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/40">{description}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  hint,
  disabled,
  className = "",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}{required && <span className="ml-1 text-primary">*</span>}</span>
      <input aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className={`mt-2 min-h-11 w-full rounded-xl border bg-white/[0.04] px-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-40 ${error ? "border-red-400/60" : "border-white/10"}`} />
      {error ? <span className="mt-1 block text-[11px] font-semibold text-red-300">{error}</span> : hint && <span className="mt-1 block text-[11px] text-white/30">{hint}</span>}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  rows,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  rows: number;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}{required && <span className="ml-1 text-primary">*</span>}</span>
      <textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className={`mt-2 w-full resize-y rounded-xl border bg-white/[0.04] px-3 py-3 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/25 focus:border-primary/60 ${error ? "border-red-400/60" : "border-white/10"}`} />
      {error && <span className="mt-1 block text-[11px] font-semibold text-red-300">{error}</span>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="relative block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}{required && <span className="ml-1 text-primary">*</span>}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={`mt-2 min-h-11 w-full appearance-none rounded-xl border bg-white/[0.04] px-3 pr-9 text-sm text-white outline-none transition-colors focus:border-primary/60 ${error ? "border-red-400/60" : "border-white/10"}`}>
        {children}
      </select>
      <CaretDown className="pointer-events-none absolute right-3 top-[2.4rem] text-white/35" size={14} />
      {error && <span className="mt-1 block text-[11px] font-semibold text-red-300">{error}</span>}
    </label>
  );
}

export default ExerciseLibrary;