import { createHash } from "node:crypto";
import ts from "typescript";

export const PROGRAMME_IMPORT_VERSION = "programme-templates-v1";
export const EXPECTED_PROGRAMME_SOURCE_SHA256 =
  "c87a5f71890eb3d72f702aa05ad3fa973cdcdb0b9cc6756e3254cf9f188f4a98";

export interface ProgrammeImportPrescription {
  sourceExerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
}
export interface ProgrammeImportDay {
  sourceId: string;
  name: string;
  estimatedMinutes: number;
  exercises: ProgrammeImportPrescription[];
}
export interface ProgrammeImportRecord {
  sourceId: string;
  slug: string;
  name: string;
  description: string;
  difficulty: string;
  goal: string;
  days: ProgrammeImportDay[];
  sourceRecordSha256: string;
}

export interface ProgrammeImportMappingBlocker {
  code: "missing_active_mapping" | "ambiguous_active_mapping";
  sourceExerciseId: string;
  normalizedSlug: string;
  candidateIds: string[];
}

export function buildProgrammeImportBlockerReport(input: {
  sourceSha256: string;
  records: ProgrammeImportRecord[];
  importVersion: string;
  write: boolean;
  blockers: ProgrammeImportMappingBlocker[];
}): {
  sourceSha256: string;
  importVersion: string;
  programmes: number;
  mappings: number;
  created: number;
  skipped: number;
  write: boolean;
  applied: false;
  blockers: ProgrammeImportMappingBlocker[];
  missingActiveMappings: string[];
} {
  return {
    sourceSha256: input.sourceSha256,
    importVersion: input.importVersion,
    programmes: input.records.length,
    mappings: 0,
    created: 0,
    skipped: 0,
    write: input.write,
    applied: false,
    blockers: input.blockers,
    missingActiveMappings: input.blockers
      .filter((blocker) => blocker.code === "missing_active_mapping")
      .map((blocker) => blocker.sourceExerciseId),
  };
}

function propertyName(name: ts.PropertyName | undefined): string | undefined {
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}
function property(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  const item = object.properties.find((candidate): candidate is ts.PropertyAssignment =>
    ts.isPropertyAssignment(candidate) && propertyName(candidate.name) === name);
  return item?.initializer;
}
function stringValue(node: ts.Expression | undefined): string | undefined {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
}
function numberValue(node: ts.Expression | undefined): number | undefined {
  return node && ts.isNumericLiteral(node) ? Number(node.text) : undefined;
}
function objects(node: ts.Expression | undefined): ts.ObjectLiteralExpression[] {
  if (!node || !ts.isArrayLiteralExpression(node)) return [];
  return node.elements.filter(ts.isObjectLiteralExpression);
}
function slug(value: string): string {
  return value.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function programmeSourceSha256(sourceText: string): string {
  return createHash("sha256").update(sourceText).digest("hex");
}

export function parseProgrammeImportSource(sourceText: string): ProgrammeImportRecord[] {
  const file = ts.createSourceFile("programs.ts", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const records: ProgrammeImportRecord[] = [];
  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "PROGRAMS") {
      const programs = objects(node.initializer);
      for (const program of programs) {
        const sourceId = stringValue(property(program, "id"));
        if (!sourceId) throw new Error("Every programme must have a literal id");
        const workouts = objects(property(program, "workouts"));
        if (!workouts.length) throw new Error(`Programme ${sourceId} has no workouts`);
        const days = workouts.map((workout, dayIndex) => {
          const daySourceId = stringValue(property(workout, "id")) ?? `${sourceId}-day-${dayIndex + 1}`;
          const exercises = objects(property(workout, "exercises")).map((exercise) => {
            const id = stringValue(property(exercise, "id"));
            const sets = numberValue(property(exercise, "sets"));
            const reps = stringValue(property(exercise, "reps"));
            const restSeconds = numberValue(property(exercise, "restSeconds"));
            const cuesNode = property(exercise, "cues");
            const cues = cuesNode && ts.isArrayLiteralExpression(cuesNode)
              ? cuesNode.elements.map(stringValue).filter((item): item is string => !!item)
              : [];
            if (!id || sets === undefined || !reps || restSeconds === undefined) {
              throw new Error(`Programme ${sourceId} contains an invalid exercise prescription`);
            }
            return { sourceExerciseId: id, sets, reps, restSeconds, notes: cues.join("\n") };
          });
          return {
            sourceId: daySourceId,
            name: stringValue(property(workout, "name")) ?? `Day ${dayIndex + 1}`,
            estimatedMinutes: numberValue(property(workout, "estimatedMinutes")) ?? 0,
            exercises,
          };
        });
        const name = stringValue(property(program, "name")) ?? sourceId.replace(/-/g, " ");
        const description = stringValue(property(program, "description")) ?? "";
        const difficulty = stringValue(property(program, "difficulty")) ?? "";
        const goal = stringValue(property(program, "goal")) ?? "";
        const record = { sourceId, slug: slug(sourceId), name, description, difficulty, goal, days };
        records.push({
          ...record,
          sourceRecordSha256: createHash("sha256").update(JSON.stringify(record)).digest("hex"),
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (!records.length) throw new Error("Bundled programme source does not contain PROGRAMS");
  const sourceIds = new Set<string>();
  for (const record of records) {
    if (sourceIds.has(record.sourceId)) throw new Error(`Duplicate programme source id: ${record.sourceId}`);
    sourceIds.add(record.sourceId);
  }
  return records;
}

export function mapProgrammeExercises(
  records: ProgrammeImportRecord[],
  exercises: { id: string; slug: string; status: string }[],
): Map<string, string> {
  const blockers = findProgrammeExerciseMappingBlockers(records, exercises);
  if (blockers.length) {
    const blocker = blockers[0];
    if (!blocker) throw new Error("Programme exercise mapping blockers were not reported");
    if (blocker.code === "missing_active_mapping") {
      throw new Error(`Missing active exercise mapping for ${blocker.sourceExerciseId}`);
    }
    throw new Error(`Ambiguous active exercise mapping for ${blocker.sourceExerciseId}`);
  }
  const bySlug = new Map(exercises.filter((exercise) => exercise.status === "active")
    .map((exercise) => [exercise.slug, exercise]));
  const result = new Map<string, string>();
  for (const record of records) {
    for (const day of record.days) {
      for (const prescription of day.exercises) {
        const mapped = bySlug.get(slug(prescription.sourceExerciseId));
        if (!mapped) throw new Error(`Missing active exercise mapping for ${prescription.sourceExerciseId}`);
        const previous = result.get(prescription.sourceExerciseId);
        if (previous && previous !== mapped.id) throw new Error(`Ambiguous exercise mapping for ${prescription.sourceExerciseId}`);
        result.set(prescription.sourceExerciseId, mapped.id);
      }
    }
  }
  return result;
}

export function findProgrammeExerciseMappingBlockers(
  records: ProgrammeImportRecord[],
  exercises: { id: string; slug: string; status: string }[],
): ProgrammeImportMappingBlocker[] {
  const candidatesBySlug = new Map<string, { id: string; slug: string; status: string }[]>();
  for (const exercise of exercises) {
    const normalizedSlug = slug(exercise.slug);
    const candidates = candidatesBySlug.get(normalizedSlug) ?? [];
    candidates.push(exercise);
    candidatesBySlug.set(normalizedSlug, candidates);
  }
  const seen = new Set<string>();
  const blockers: ProgrammeImportMappingBlocker[] = [];
  for (const record of records) {
    for (const day of record.days) {
      for (const prescription of day.exercises) {
        if (seen.has(prescription.sourceExerciseId)) continue;
        seen.add(prescription.sourceExerciseId);
        const normalizedSlug = slug(prescription.sourceExerciseId);
        const candidates = candidatesBySlug.get(normalizedSlug) ?? [];
        const active = candidates.filter((candidate) => candidate.status === "active");
        if (!active.length) {
          blockers.push({
            code: "missing_active_mapping",
            sourceExerciseId: prescription.sourceExerciseId,
            normalizedSlug,
            candidateIds: candidates.map((candidate) => candidate.id),
          });
        } else if (active.length > 1) {
          blockers.push({
            code: "ambiguous_active_mapping",
            sourceExerciseId: prescription.sourceExerciseId,
            normalizedSlug,
            candidateIds: active.map((candidate) => candidate.id),
          });
        }
      }
    }
  }
  return blockers;
}