import { readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  exerciseEquipmentTable,
  exerciseMusclesTable,
  exercisesTable,
  tenantsTable,
  usersTable,
  auditLogsTable,
  type Exercise,
  type AuditLog,
} from "@workspace/db";
import { writeAuditLog } from "../lib/audit.js";
import {
  buildExerciseImportManifest,
  compareImportEntry,
  EXERCISE_IMPORT_VERSION,
  EXPECTED_LEGACY_SOURCE_RECORDS_SHA256,
  EXPECTED_LEGACY_SOURCE_SHA256,
  extractLegacyExercises,
  assertExerciseImportEnvironment,
  assertApprovedLegacyExerciseSource,
  buildExerciseImportProvenance,
  normalizedLegacySourceSha256,
  EXERCISE_PROVENANCE_ATTESTATION_ACTION,
  planExerciseImport,
  summarizeExerciseImport,
  type ExistingImportExercise,
} from "../lib/exerciseCatalogueImport.js";
import {
  EXERCISE_PERFORMANCE_TYPES,
  parseExerciseWriteInput,
} from "../lib/exercises.js";
import { DEFAULT_TENANT_SLUG } from "../lib/tenant.js";

interface CliOptions {
  apply: boolean;
  reconcile: boolean;
  attestProvenance: boolean;
  tenantSlug: string;
  actorId: string;
  sourcePath: string;
  mediaDir: string;
  confirmedDevelopmentOnly: boolean;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function argumentValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function parseImportArgs(args: string[], cwd = process.cwd()): CliOptions {
  if (args.includes("--source")) {
    throw new Error("Gate 2C uses only the bundled authoritative programme source");
  }
  const actorId = argumentValue(args, "--actor-id");
  const tenantSlug = argumentValue(args, "--tenant");
  if (!actorId || !UUID_RE.test(actorId)) {
    throw new Error("--actor-id must be the UUID of an existing tenant admin");
  }
  if (!tenantSlug) throw new Error("--tenant is required");
  if (tenantSlug !== DEFAULT_TENANT_SLUG) {
    throw new Error(`Gate 2C may target only the '${DEFAULT_TENANT_SLUG}' tenant`);
  }
  const apply = args.includes("--apply");
  const reconcile = args.includes("--reconcile");
  const attestProvenance = args.includes("--attest-provenance");
  const confirmedDevelopmentOnly = args.includes("--confirm-development-only");
  if ((apply || reconcile || attestProvenance) && !confirmedDevelopmentOnly) {
    throw new Error(
      `${reconcile ? "--reconcile" : attestProvenance ? "--attest-provenance" : "--apply"} requires --confirm-development-only`,
    );
  }
  if ([apply, reconcile, attestProvenance].filter(Boolean).length > 1) {
    throw new Error(
      "--apply, --reconcile, and --attest-provenance are mutually exclusive",
    );
  }
  return {
    apply,
    reconcile,
    attestProvenance,
    tenantSlug,
    actorId,
    sourcePath:
      argumentValue(args, "--source") ??
      path.resolve(cwd, "../marcus-grima/src/data/programs.ts"),
    mediaDir:
      argumentValue(args, "--media-dir") ??
      path.resolve(cwd, "../marcus-grima/public"),
    confirmedDevelopmentOnly,
  };
}

type ReadClient = Pick<typeof db, "select">;
type LockClient = Pick<typeof db, "execute">;

async function acquireImportLock(
  client: LockClient,
  tenantId: string,
): Promise<void> {
  const result = await client.execute(
    sql`select pg_try_advisory_xact_lock(hashtext(${`exercise-import:${tenantId}:${EXERCISE_IMPORT_VERSION}`})) as acquired`,
  );
  const acquired = (result as unknown as { rows: { acquired: boolean }[] }).rows[0]
    ?.acquired;
  if (!acquired) {
    throw new Error(
      "Exercise catalogue import is already running for the target tenant",
    );
  }
}

async function loadActor(
  client: ReadClient,
  tenantId: string,
  actorId: string,
): Promise<{ id: string; role: "admin" }> {
  const [actor] = await client
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.id, actorId),
        eq(usersTable.tenantId, tenantId),
        eq(usersTable.role, "admin"),
        eq(usersTable.isActive, true),
      ),
    )
    .limit(1);
  if (!actor) throw new Error("Actor must be an active admin in the target tenant");
  return actor as { id: string; role: "admin" };
}

export async function lockAndLoadCurrentOperator(
  client: ReadClient & LockClient,
  tenantId: string,
  actorId: string,
): Promise<{ id: string; role: "admin" }> {
  await client.execute(
    sql`select id from users where id = ${actorId} and tenant_id = ${tenantId} for update`,
  );
  return loadActor(client, tenantId, actorId);
}

async function loadTenantAudits(
  client: ReadClient,
  tenantId: string,
): Promise<AuditLog[]> {
  return client
    .select()
    .from(auditLogsTable)
    .where(eq(auditLogsTable.tenantId, tenantId));
}

async function loadExisting(
  client: ReadClient,
  tenantId: string,
): Promise<(ExistingImportExercise & Exercise)[]> {
  const exercises = await client
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.tenantId, tenantId))
    .orderBy(asc(exercisesTable.slug));
  if (exercises.length === 0) return [];
  const ids = exercises.map((exercise) => exercise.id);
  const [muscles, equipment] = await Promise.all([
    client
      .select()
      .from(exerciseMusclesTable)
      .where(
        and(
          eq(exerciseMusclesTable.tenantId, tenantId),
          inArray(exerciseMusclesTable.exerciseId, ids),
        ),
      ),
    client
      .select()
      .from(exerciseEquipmentTable)
      .where(
        and(
          eq(exerciseEquipmentTable.tenantId, tenantId),
          inArray(exerciseEquipmentTable.exerciseId, ids),
        ),
      ),
  ]);
  return exercises.map((exercise) => ({
    ...exercise,
    muscles: muscles
      .filter((item) => item.exerciseId === exercise.id)
      .map(({ muscleKey, role }) => ({ muscleKey: muscleKey as any, role })),
    equipment: equipment
      .filter((item) => item.exerciseId === exercise.id)
      .map(({ equipmentKey, required }) => ({ equipmentKey, required })),
  }));
}

async function verifyMedia(
  mediaDir: string,
  entries: ReturnType<typeof buildExerciseImportManifest>,
): Promise<void> {
  for (const entry of entries) {
    if (!entry.payload.mediaUrl) continue;
    await access(path.join(mediaDir, entry.payload.mediaUrl.replace(/^\//, "")));
  }
}

interface OwnershipProof {
  owned: Map<string, ExistingImportExercise & Exercise>;
  missing: string[];
  /** Evidence is invalid; this is distinct from a legitimate later edit. */
  changed: string[];
  /** Canonical-content drift on otherwise valid historical ownership. */
  contentDrift: string[];
  notOwned: string[];
  unexpected: string[];
}

function isCanonicalReconciliationAudit(
  audit: AuditLog,
  entry: ReturnType<typeof buildExerciseImportManifest>[number],
  sourceSha256: string,
  normalizedSourceSha256: string,
  exerciseId: string,
): boolean {
  const metadata = audit.metadata;
  if (!metadata || !Array.isArray(metadata.differences) || metadata.differences.length === 0) return false;
  if (metadata.differences.some((field) => typeof field !== "string") ||
      new Set(metadata.differences).size !== metadata.differences.length) return false;
  const expected = {
    slug: entry.payload.slug, source: "bundled-programmes",
    sourceId: entry.source.sourceId, importVersion: EXERCISE_IMPORT_VERSION,
    sourceSha256, normalizedSourceSha256, exerciseId,
    manifestRecordSha256: buildExerciseImportProvenance(
      entry, sourceSha256, normalizedSourceSha256, exerciseId, 2,
    ).manifestRecordSha256,
    fromVersion: 1, toVersion: 2,
  };
  return Object.keys(metadata).sort().join(",") ===
      [...Object.keys(expected), "differences"].sort().join(",") &&
    Object.entries(expected).every(([key, value]) => metadata[key] === value);
}

function isLegacyCreateAudit(
  audit: AuditLog,
  entry: ReturnType<typeof buildExerciseImportManifest>[number],
): boolean {
  return auditMetadataMatches(audit, {
    slug: entry.payload.slug,
    source: "bundled-programmes",
    sourceId: entry.source.sourceId,
    importVersion: EXERCISE_IMPORT_VERSION,
  });
}

function isLegacyReconciliationAudit(
  audit: AuditLog,
  entry: ReturnType<typeof buildExerciseImportManifest>[number],
  sourceSha256: string,
): boolean {
  const differences = audit.metadata?.differences;
  if (!Array.isArray(differences) || differences.length === 0 ||
      differences.some((field) => typeof field !== "string") ||
      new Set(differences).size !== differences.length) return false;
  return auditMetadataMatches(audit, {
    source: "bundled-programmes",
    sourceId: entry.source.sourceId,
    slug: entry.payload.slug,
    importVersion: EXERCISE_IMPORT_VERSION,
    sourceSha256,
    fromVersion: 1,
    toVersion: 2,
    differences,
  });
}

export function proveImportOwnership(
  manifest: ReturnType<typeof buildExerciseImportManifest>,
  existing: (ExistingImportExercise & Exercise)[],
  audits: AuditLog[],
  _currentOperatorId?: string,
): OwnershipProof {
  assertApprovedLegacyExerciseSource(
    manifest.map((entry) => entry.source),
    EXPECTED_LEGACY_SOURCE_SHA256,
  );
  const canonicalManifest = buildExerciseImportManifest(
    manifest.map((entry) => entry.source),
  );
  if (JSON.stringify(canonicalManifest) !== JSON.stringify(manifest)) {
    throw new Error("Ownership proof requires the complete canonical Gate 2C manifest");
  }
  const sourceSha256 = EXPECTED_LEGACY_SOURCE_SHA256;
  const normalizedSourceSha256 = EXPECTED_LEGACY_SOURCE_RECORDS_SHA256;
  const bySlug = new Map(existing.map((exercise) => [exercise.slug, exercise]));
  const expectedSlugs = new Set(manifest.map((entry) => entry.payload.slug));
  const owned = new Map<string, ExistingImportExercise & Exercise>();
  const missing: string[] = [];
  const changed: string[] = [];
  const contentDrift: string[] = [];
  const notOwned: string[] = [];

  for (const entry of manifest) {
    const slug = entry.payload.slug;
    const current = bySlug.get(slug);
    if (!current) {
      missing.push(entry.source.sourceId);
      continue;
    }
    // A foreign audit may coincidentally use this UUID as its target.  It is
    // not exercise provenance and must not poison ownership.  Conversely, an
    // exercise provenance/lifecycle action with this ID but the wrong target
    // type is forged evidence and is deliberately retained for fail-closed
    // replay below.
    const exerciseEvidenceActions = new Set([
      "exercise:create",
      "exercise:reconcile",
      EXERCISE_PROVENANCE_ATTESTATION_ACTION,
      "exercise:update",
      "exercise:activate",
      "exercise:archive",
      "exercise:restore",
      "exercise:performance_type_change",
      "exercise:safety_change",
    ]);
    const targetAudits = audits.filter(
      (audit) => audit.targetId === current.id &&
        (audit.targetType === "exercise" || exerciseEvidenceActions.has(audit.action)),
    );
    const candidateCreateAudits = targetAudits.filter(
      (audit) =>
        audit.tenantId === current.tenantId &&
        audit.targetType === "exercise" &&
        audit.action === "exercise:create" &&
        audit.actorType === "cli" &&
        audit.metadata?.importVersion === EXERCISE_IMPORT_VERSION &&
        audit.metadata?.sourceId === entry.source.sourceId,
    );
    const createAudits = candidateCreateAudits.filter((audit) => {
      const expected = buildExerciseImportProvenance(
        entry,
        sourceSha256,
        normalizedSourceSha256,
        current.id,
        1,
      );
      return auditMetadataMatches(audit, { ...expected });
    });
    const legacyCreateAudits = candidateCreateAudits.filter((audit) =>
      isLegacyCreateAudit(audit, entry),
    );
    const createAudit =
      createAudits.length === 1 || legacyCreateAudits.length === 1
        ? createAudits[0] ?? legacyCreateAudits[0]
        : undefined;
    // The creator is historical evidence, never a claim made by today's CLI
    // operator. Reconciliation may legitimately be performed by a replacement.
    const historicalActorId = createAudit?.actorId;
    const reconciliationAudits = targetAudits.filter(
      (audit) =>
        audit.tenantId === current.tenantId &&
        audit.targetType === "exercise" &&
        audit.action === "exercise:reconcile" &&
        audit.actorType === "cli" &&
        audit.metadata?.source === "bundled-programmes" &&
        audit.metadata?.sourceId === entry.source.sourceId &&
        audit.metadata?.slug === entry.payload.slug &&
        audit.metadata?.importVersion === EXERCISE_IMPORT_VERSION &&
        audit.metadata?.sourceSha256 === sourceSha256 &&
        audit.metadata?.fromVersion === 1 &&
        audit.metadata?.toVersion === 2,
    );
    const completeReconciliationAudits = reconciliationAudits.filter((audit) =>
      isCanonicalReconciliationAudit(
        audit, entry, sourceSha256, normalizedSourceSha256, current.id,
      ),
    );
    const legacyReconciliationAudits = reconciliationAudits.filter(
      (audit) =>
        audit.actorId === historicalActorId &&
        isLegacyReconciliationAudit(audit, entry, sourceSha256),
    );
    const expectedAttestationMetadata =
      legacyCreateAudits.length === 1 && legacyReconciliationAudits.length === 1
        ? attestationMetadata(
            entry,
            sourceSha256,
            normalizedSourceSha256,
            current.id,
            legacyCreateAudits[0].id,
            legacyReconciliationAudits[0].id,
          )
        : undefined;
    const anyAttestationAudits = targetAudits.filter(
      (audit) =>
        audit.action === EXERCISE_PROVENANCE_ATTESTATION_ACTION,
    );
    const attestationAudits = anyAttestationAudits.filter(
      (audit) =>
        audit.tenantId === current.tenantId &&
        audit.targetType === "exercise" &&
        audit.actorType === "cli" &&
        expectedAttestationMetadata !== undefined &&
        auditMetadataMatches(audit, expectedAttestationMetadata),
    );
    const ownershipReasons: string[] = [];
    const hasCompleteCreate =
      createAudits.length === 1 &&
      ((current.version === 1 && reconciliationAudits.length === 0) ||
        (current.version >= 2 &&
          completeReconciliationAudits.length === 1 &&
          reconciliationAudits.length === 1));
    const hasLegacyAttestation =
      legacyCreateAudits.length === 1 &&
      legacyReconciliationAudits.length === 1 &&
      attestationAudits.length === 1 &&
      anyAttestationAudits.length === 1 &&
      current.version >= 2;
    if (!hasCompleteCreate && !hasLegacyAttestation) {
      ownershipReasons.push("missing complete import provenance");
    }
    if (
      candidateCreateAudits.length !== 1 ||
      (candidateCreateAudits.length === 1 &&
        !hasCompleteCreate &&
        legacyCreateAudits.length !== 1)
    ) {
      ownershipReasons.push("missing or duplicate import audit");
    }
    if (current.version < 1) ownershipReasons.push("version predates imported version");
    if (current.version === 1 && current.status !== "draft") {
      ownershipReasons.push("version-1 import is not draft");
    }
    if (hasLegacyAttestation && current.version < 2) {
      ownershipReasons.push("attested reconciliation has an unexpected current version");
    }
    if (
      anyAttestationAudits.length > 0 &&
      (!hasLegacyAttestation || anyAttestationAudits.length !== 1)
    ) {
      ownershipReasons.push("conflicting or duplicate provenance attestation");
    }
    if (current.createdByUserId !== historicalActorId) ownershipReasons.push("creator does not match historical import actor");
    if (current.version === 1 && current.updatedByUserId !== historicalActorId) {
      ownershipReasons.push("updater does not match historical import actor");
    }
    const reconciliationAudit =
      completeReconciliationAudits[0] ?? legacyReconciliationAudits[0];
    if (
      current.version === 2 &&
      reconciliationAudit &&
      current.updatedByUserId !== reconciliationAudit.actorId
    ) {
      ownershipReasons.push("updater does not match reconciliation actor");
    }
    if (
      hasCompleteCreate &&
      current.version === 1 &&
      current.updatedAt.getTime() !== current.createdAt.getTime()
    ) {
      ownershipReasons.push("updated timestamp differs from creation timestamp");
    }
    if (createAudit && current.createdAt.getTime() > createAudit.createdAt.getTime()) {
      ownershipReasons.push("creation audit predates the exercise row");
    }
    const v2Audit =
      completeReconciliationAudits[0] ?? legacyReconciliationAudits[0];
    if (current.version >= 2 && (!v2Audit || !createAudit ||
      v2Audit.createdAt.getTime() <= createAudit.createdAt.getTime())) {
      ownershipReasons.push("reconciliation audit does not follow the original import audit");
    }
    if (hasLegacyAttestation) {
      const attestation = attestationAudits[0];
      if (attestation.createdAt.getTime() <= createAudit!.createdAt.getTime() ||
          attestation.createdAt.getTime() <= v2Audit!.createdAt.getTime()) {
        ownershipReasons.push("attestation does not follow historical provenance");
      }
    }
    if (current.version === 1) {
      if (targetAudits.some((audit) => audit.id !== createAudit?.id)) {
        ownershipReasons.push("unexplained post-import activity exists");
      }
    }

    /*
     * Versions one and two are immutable import evidence.  Version three is
     * the one historical reviewed-edit shape written before transition
     * metadata existed; every later mutation must use the new strict shape.
     */
    if (createAudit && v2Audit) {
      const baseAuditIds = new Set([
        createAudit.id, v2Audit.id, ...attestationAudits.map((audit) => audit.id),
      ]);
      const afterReconciliation = targetAudits
        .filter((audit) => !baseAuditIds.has(audit.id))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      if (targetAudits.some((audit) =>
        audit.id !== createAudit.id && audit.id !== v2Audit.id &&
        audit.createdAt.getTime() >= createAudit.createdAt.getTime() &&
        audit.createdAt.getTime() <= v2Audit.createdAt.getTime(),
      )) {
        ownershipReasons.push("disqualifying audit exists at an import boundary");
      }
      if (attestationAudits.some((audit) =>
        audit.createdAt.getTime() >= (afterReconciliation[0]?.createdAt.getTime() ?? Infinity),
      )) ownershipReasons.push("attestation does not precede reviewed update");

      let version = 2;
      let status: Exercise["status"] = "draft";
      let performanceType = entry.payload.performanceType ?? null;
      let updater = v2Audit.actorId;
      let previousTime = v2Audit.createdAt.getTime();
      const explainedFields = new Set<string>();
      let valid = true;
      const auditGroups = new Map<number, AuditLog[]>();
      for (const audit of afterReconciliation) {
        const time = audit.createdAt.getTime();
        auditGroups.set(time, [...(auditGroups.get(time) ?? []), audit]);
      }
      for (const [time, group] of [...auditGroups.entries()].sort(([a], [b]) => a - b)) {
        if (time <= previousTime) { valid = false; continue; }
        const primaries = group.filter((audit) =>
          ["exercise:update", "exercise:activate", "exercise:archive", "exercise:restore"]
            .includes(audit.action),
        );
        if (primaries.length !== 1) { valid = false; continue; }
        const primary = primaries[0];
        const actorId = typeof primary.actorId === "string" ? primary.actorId : undefined;
        const linked = primary.tenantId === current.tenantId &&
          primary.targetType === "exercise" && primary.targetId === current.id &&
          primary.actorType === "user" && actorId !== undefined;
        const fields = primary.metadata?.fields;
        const isFields = Array.isArray(fields) && fields.length > 0 &&
          fields.every((field) => typeof field === "string") &&
          new Set(fields).size === fields.length;
        let primaryValid = linked;
        if (primary.action === "exercise:update") {
          const legacyV3 = version === 2 && auditMetadataMatches(primary, { fields });
          const strict = isFields && auditMetadataMatches(primary, {
            fields, fromVersion: version, toVersion: version + 1,
          });
          primaryValid &&= status !== "archived" && isFields && (legacyV3 || strict);
          if (primaryValid) {
            (fields as string[]).forEach((field) => explainedFields.add(field));
          }
        } else {
          const transitions: Record<string, [Exercise["status"], Exercise["status"]]> = {
            "exercise:activate": ["draft", "active"],
            "exercise:archive": ["active", "archived"],
            "exercise:restore": ["archived", "draft"],
          };
          const transition = transitions[primary.action];
          const expected = transition && {
            fromVersion: version, toVersion: version + 1,
            fromStatus: transition[0], toStatus: transition[1],
            ...(primary.action === "exercise:archive" ? { reason: primary.metadata?.reason } : {}),
          };
          primaryValid &&= !!transition && status === transition[0] && !!expected &&
            (primary.action !== "exercise:archive" ||
              (typeof primary.metadata?.reason === "string" && !!primary.metadata.reason)) &&
            auditMetadataMatches(primary, expected);
          if (primaryValid) status = transition![1];
        }
        const companionActions = new Set<string>();
        let performanceCompanion: AuditLog | undefined;
        for (const companion of group.filter((audit) => audit !== primary)) {
          const companionField = companion.action === "exercise:performance_type_change"
            ? "performanceType"
            : companion.action === "exercise:safety_change" ? "safetyNotes" : undefined;
          const validCompanionMetadata = companion.action === "exercise:safety_change"
            ? auditMetadataMatches(companion, { changed: true })
            : companion.action === "exercise:performance_type_change" &&
              Object.keys(companion.metadata ?? {}).sort().join(",") === "from,to" &&
              (companion.metadata?.from === null ||
                typeof companion.metadata?.from === "string") &&
              (companion.metadata?.to === null ||
                typeof companion.metadata?.to === "string");
          if (!companionField || primary.action !== "exercise:update" ||
              companionActions.has(companion.action) ||
              companion.tenantId !== current.tenantId ||
              companion.targetType !== "exercise" || companion.targetId !== current.id ||
              companion.actorType !== "user" || companion.actorId !== actorId ||
              !Array.isArray(fields) || !fields.includes(companionField) ||
              !validCompanionMetadata) primaryValid = false;
          if (companion.action === "exercise:performance_type_change") {
            performanceCompanion = companion;
          }
          companionActions.add(companion.action);
        }
        if (primary.action === "exercise:update" && Array.isArray(fields)) {
          const changesPerformance = fields.includes("performanceType");
          const changesSafety = fields.includes("safetyNotes");
          primaryValid &&=
            companionActions.has("exercise:performance_type_change") === changesPerformance &&
            companionActions.has("exercise:safety_change") === changesSafety;
          if (changesPerformance && performanceCompanion) {
            const from = performanceCompanion.metadata?.from;
            const to = performanceCompanion.metadata?.to;
            primaryValid &&= from === performanceType &&
              (to === null ||
                (typeof to === "string" &&
                  EXERCISE_PERFORMANCE_TYPES.includes(
                    to as (typeof EXERCISE_PERFORMANCE_TYPES)[number],
                  )));
            if (primaryValid) performanceType = to as Exercise["performanceType"];
          }
        }
        if (!primaryValid) { valid = false; continue; }
        version += 1;
        updater = actorId!;
        previousTime = time;
      }
      if (current.version === 1 && afterReconciliation.length) valid = false;
      if (current.version === 2 && afterReconciliation.length) valid = false;
      if (current.version >= 3 && version !== current.version) valid = false;
      if (current.version >= 2 &&
          (status !== current.status || updater !== current.updatedByUserId)) valid = false;
      if (current.version >= 2 && performanceType !== current.performanceType) valid = false;
      if (!compareImportEntry(entry, current).every((field) => explainedFields.has(field))) {
        valid = false;
      }
      if (!valid) ownershipReasons.push("invalid ordered post-reconciliation audit evidence");
    }
    if (ownershipReasons.length > 0) {
      (createAudit ? changed : notOwned).push(
        `${entry.source.sourceId}: ${ownershipReasons.join(", ")}`,
      );
      continue;
    }
    if (current.version >= 3 && compareImportEntry(entry, current).length > 0) {
      contentDrift.push(`${entry.source.sourceId}: later reviewed content differs from canonical manifest`);
    }
    owned.set(entry.source.sourceId, current);
  }

  return {
    owned,
    missing,
    changed,
    contentDrift,
    notOwned,
    unexpected: existing
      .filter((exercise) => !expectedSlugs.has(exercise.slug))
      .map((exercise) => exercise.slug),
  };
}

function incrementCategory(
  categories: Record<string, number>,
  field: string,
): void {
  categories[field] = (categories[field] ?? 0) + 1;
}

function auditMetadataMatches(
  audit: AuditLog | undefined,
  expected: Record<string, unknown>,
): boolean {
  if (!audit?.metadata) return false;
  const actualKeys = Object.keys(audit.metadata).sort();
  const expectedKeys = Object.keys(expected).sort();
  return (
    JSON.stringify(actualKeys) === JSON.stringify(expectedKeys) &&
    Object.entries(expected).every(
      ([key, value]) => audit.metadata?.[key] === value,
    )
  );
}

function attestationMetadata(
  entry: ReturnType<typeof buildExerciseImportManifest>[number],
  sourceSha256: string,
  normalizedSourceSha256: string,
  exerciseId: string,
  createAuditId: string,
  reconciliationAuditId: string,
): Record<string, unknown> {
  return {
    ...buildExerciseImportProvenance(
      entry,
      sourceSha256,
      normalizedSourceSha256,
      exerciseId,
      2,
    ),
    originalCreateAuditId: createAuditId,
    reconciliationAuditId,
  };
}

export async function attestDevelopmentImport(
  manifest: ReturnType<typeof buildExerciseImportManifest>,
  tenantId: string,
  actorId: string,
  sourceSha256: string,
  confirmedDevelopmentOnly: boolean,
) {
  assertExerciseImportEnvironment(process.env);
  if (!confirmedDevelopmentOnly) {
    throw new Error(
      "Provenance attestation requires explicit development-only confirmation",
    );
  }
  const normalizedSourceSha256 = normalizedLegacySourceSha256(
    manifest.map((entry) => entry.source),
  );
  assertApprovedLegacyExerciseSource(
    manifest.map((entry) => entry.source),
    sourceSha256,
  );
  const canonicalManifest = buildExerciseImportManifest(
    manifest.map((entry) => entry.source),
  );
  if (JSON.stringify(canonicalManifest) !== JSON.stringify(manifest)) {
    throw new Error(
      "Provenance attestation requires the complete canonical Gate 2C manifest",
    );
  }

  return db.transaction(async (tx) => {
    const [targetTenant] = await tx
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(
        and(
          eq(tenantsTable.id, tenantId),
          eq(tenantsTable.slug, DEFAULT_TENANT_SLUG),
        ),
      )
      .limit(1);
    if (!targetTenant) {
      throw new Error(
        `Gate 2C provenance attestation may target only the '${DEFAULT_TENANT_SLUG}' tenant`,
      );
    }
    await acquireImportLock(tx, tenantId);
    await tx.execute(
      sql`lock table exercises, exercise_muscles, exercise_equipment, audit_logs in share row exclusive mode`,
    );
    await lockAndLoadCurrentOperator(tx, tenantId, actorId);

    const existing = await loadExisting(tx, tenantId);
    const audits = await loadTenantAudits(tx, tenantId);
    const bySlug = new Map(existing.map((exercise) => [exercise.slug, exercise]));
    const expectedSlugs = new Set(manifest.map((entry) => entry.payload.slug));
    const pending: {
      entry: ReturnType<typeof buildExerciseImportManifest>[number];
      exercise: Exercise;
      metadata: Record<string, unknown>;
    }[] = [];
    const blockers: string[] = [];

    for (const entry of manifest) {
      const exercise = bySlug.get(entry.payload.slug);
      if (!exercise) {
        blockers.push(`${entry.source.sourceId}: missing exercise`);
        continue;
      }
      const targetAudits = audits.filter(
        (audit) =>
          audit.targetType === "exercise" && audit.targetId === exercise.id,
      );
      const createAudits = targetAudits.filter(
        (audit) =>
          audit.tenantId === exercise.tenantId &&
          audit.action === "exercise:create" &&
          audit.actorType === "cli" &&
          isLegacyCreateAudit(audit, entry),
      );
      const reconciliationAudits = targetAudits.filter(
        (audit) =>
          audit.tenantId === exercise.tenantId &&
          audit.action === "exercise:reconcile" &&
          audit.actorType === "cli" &&
          audit.actorId === createAudits[0]?.actorId &&
          isLegacyReconciliationAudit(audit, entry, sourceSha256),
      );
      const createAudit = createAudits.length === 1 ? createAudits[0] : undefined;
      const reconciliationAudit =
        reconciliationAudits.length === 1
          ? reconciliationAudits[0]
          : undefined;
      const expectedMetadata =
        createAudit && reconciliationAudit
          ? attestationMetadata(
              entry,
              sourceSha256,
              normalizedSourceSha256,
              exercise.id,
              createAudit.id,
              reconciliationAudit.id,
            )
          : undefined;
      const exactAttestations = targetAudits.filter(
        (audit) =>
          audit.action === EXERCISE_PROVENANCE_ATTESTATION_ACTION &&
          audit.tenantId === exercise.tenantId &&
          audit.actorType === "cli" &&
          expectedMetadata !== undefined &&
          auditMetadataMatches(audit, expectedMetadata),
      );
      const anyAttestations = targetAudits.filter(
        (audit) => audit.action === EXERCISE_PROVENANCE_ATTESTATION_ACTION,
      );

      const reasons: string[] = [];
      if (exercise.status !== "draft") reasons.push("status is not draft");
      if (exercise.version !== 2) reasons.push("version is not reconciled version 2");
      const historicalActorId = createAudit?.actorId;
      if (exercise.createdByUserId !== historicalActorId) {
        reasons.push("creator does not match historical import actor");
      }
      if (exercise.updatedByUserId !== historicalActorId) {
        reasons.push("updater does not match historical import actor");
      }
      if (compareImportEntry(entry, exercise).length > 0) {
        reasons.push("exercise content or mappings differ from manifest");
      }
      if (createAudits.length !== 1) {
        reasons.push("missing or duplicate original import audit");
      }
      if (reconciliationAudits.length !== 1) {
        reasons.push("missing or duplicate reconciliation audit");
      }
      if (createAudit && reconciliationAudit) {
        if (reconciliationAudit.createdAt.getTime() <= createAudit.createdAt.getTime()) {
          reasons.push("reconciliation audit does not follow create audit");
        }
        if (exercise.createdAt.getTime() > createAudit.createdAt.getTime()) {
          reasons.push("create audit predates exercise row");
        }
      }
      if (anyAttestations.length > 1) {
        reasons.push("duplicate provenance attestations exist");
      } else if (anyAttestations.length === 1 && exactAttestations.length !== 1) {
        reasons.push("existing provenance attestation conflicts with canonical provenance");
      }
      const allowedAuditIds = new Set(
        [createAudit?.id, reconciliationAudit?.id, ...anyAttestations.map((audit) => audit.id)].filter(
          (id): id is string => Boolean(id),
        ),
      );
      if (
        targetAudits.some(
          (audit) =>
            !allowedAuditIds.has(audit.id) &&
            audit.createdAt.getTime() > (createAudit?.createdAt.getTime() ?? 0),
        )
      ) {
        reasons.push("later disqualifying audit activity exists");
      }
      if (reasons.length > 0) {
        blockers.push(`${entry.source.sourceId}: ${reasons.join(", ")}`);
      } else if (exactAttestations.length === 0) {
        pending.push({
          entry,
          exercise,
          metadata: expectedMetadata!,
        });
      }
    }

    const unexpected = existing
      .filter((exercise) => !expectedSlugs.has(exercise.slug))
      .map((exercise) => exercise.slug);
    if (unexpected.length > 0) {
      blockers.push(...unexpected.map((slug) => `${slug}: unexpected exercise slug`));
    }
    if (blockers.length > 0) {
      throw new Error(
        `BLOCKED — GATE 2C PROVENANCE REPAIR (${blockers.join("; ")})`,
      );
    }

    for (const item of pending) {
      await writeAuditLog(
        {
          tenantId,
          actorType: "cli",
          actorId,
          action: EXERCISE_PROVENANCE_ATTESTATION_ACTION,
          targetType: "exercise",
          targetId: item.exercise.id,
          metadata: item.metadata,
        },
        tx as Parameters<typeof writeAuditLog>[1],
      );
    }
    return {
      provenanceAttestationsCreated: pending.length,
      exactAttestationsSkipped: manifest.length - pending.length,
      exerciseRowsChanged: 0,
      versionsChanged: 0,
      mappingsChanged: 0,
      historicalAuditsChanged: 0,
    };
  });
}

export async function reconcileDevelopmentImport(
  manifest: ReturnType<typeof buildExerciseImportManifest>,
  tenantId: string,
  actorId: string,
  sourceSha256: string,
  confirmedDevelopmentOnly: boolean,
) {
  assertExerciseImportEnvironment(process.env);
  if (!confirmedDevelopmentOnly) {
    throw new Error("Reconciliation requires explicit development-only confirmation");
  }
  assertApprovedLegacyExerciseSource(
    manifest.map((entry) => entry.source),
    sourceSha256,
  );
  const normalizedSourceSha256 = normalizedLegacySourceSha256(
    manifest.map((entry) => entry.source),
  );
  const canonicalManifest = buildExerciseImportManifest(
    manifest.map((entry) => entry.source),
  );
  if (JSON.stringify(canonicalManifest) !== JSON.stringify(manifest)) {
    throw new Error("Reconciliation requires the complete canonical Gate 2C manifest");
  }
  return db.transaction(async (tx) => {
    const [targetTenant] = await tx
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(
        and(
          eq(tenantsTable.id, tenantId),
          eq(tenantsTable.slug, DEFAULT_TENANT_SLUG),
        ),
      )
      .limit(1);
    if (!targetTenant) {
      throw new Error(
        `Gate 2C reconciliation may target only the '${DEFAULT_TENANT_SLUG}' tenant`,
      );
    }
    await acquireImportLock(tx, tenantId);
    await lockAndLoadCurrentOperator(tx, tenantId, actorId);
    const lockedExisting = await loadExisting(tx, tenantId);
    const lockedAudits = await loadTenantAudits(tx, tenantId);
    const proof = proveImportOwnership(
      manifest,
      lockedExisting,
      lockedAudits,
      actorId,
    );
    const blockers = [
      ...proof.changed,
      ...proof.contentDrift,
      ...proof.notOwned,
      ...proof.missing.map((sourceId) => `${sourceId}: missing`),
      ...proof.unexpected.map((slug) => `${slug}: unexpected exercise slug`),
    ];
    if (blockers.length > 0) {
      throw new Error(
        `BLOCKED — GATE 2C DATA DECISION REQUIRED (${blockers.join("; ")})`,
      );
    }
    let rowsAlreadyExact = 0;
    let rowsSafelyReconciled = 0;
    let reconciliationAuditEvents = 0;
    const fieldsCorrectedByCategory: Record<string, number> = {};
    for (const entry of manifest) {
      const current = proof.owned.get(entry.source.sourceId);
      if (!current) throw new Error(`Missing ownership proof for ${entry.source.sourceId}`);
      const differences = compareImportEntry(entry, current);
      if (differences.length === 0) {
        rowsAlreadyExact += 1;
        continue;
      }

      const input = parseExerciseWriteInput(entry.payload, "create");
      const { muscles = [], equipment = [], ...fields } = input;
      const [updated] = await tx
        .update(exercisesTable)
        .set({
          ...fields,
          updatedByUserId: actorId,
          version: sql`${exercisesTable.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(exercisesTable.tenantId, tenantId),
            eq(exercisesTable.id, current.id),
            eq(exercisesTable.status, "draft"),
            eq(exercisesTable.version, current.version),
          ),
        )
        .returning();
      if (!updated) {
        throw new Error(
          `Reconciliation lost the version check for ${entry.source.sourceId}`,
        );
      }
      await tx
        .delete(exerciseMusclesTable)
        .where(
          and(
            eq(exerciseMusclesTable.tenantId, tenantId),
            eq(exerciseMusclesTable.exerciseId, current.id),
          ),
        );
      if (muscles.length > 0) {
        await tx.insert(exerciseMusclesTable).values(
          muscles.map((muscle) => ({
            tenantId,
            exerciseId: current.id,
            ...muscle,
          })),
        );
      }
      await tx
        .delete(exerciseEquipmentTable)
        .where(
          and(
            eq(exerciseEquipmentTable.tenantId, tenantId),
            eq(exerciseEquipmentTable.exerciseId, current.id),
          ),
        );
      if (equipment.length > 0) {
        await tx.insert(exerciseEquipmentTable).values(
          equipment.map((item) => ({
            tenantId,
            exerciseId: current.id,
            ...item,
          })),
        );
      }
      for (const difference of differences) {
        incrementCategory(fieldsCorrectedByCategory, difference);
      }
      await writeAuditLog(
        {
          tenantId,
          actorType: "cli",
          actorId,
          action: "exercise:reconcile",
          targetType: "exercise",
          targetId: current.id,
          metadata: {
            slug: entry.payload.slug,
            source: "bundled-programmes",
            sourceId: entry.source.sourceId,
            importVersion: EXERCISE_IMPORT_VERSION,
            sourceSha256,
            normalizedSourceSha256,
            exerciseId: current.id,
            manifestRecordSha256: buildExerciseImportProvenance(
              entry,
              sourceSha256,
              normalizedSourceSha256,
              current.id,
              updated.version,
            ).manifestRecordSha256,
            differences,
            fromVersion: current.version,
            toVersion: updated.version,
          },
        },
        tx as Parameters<typeof writeAuditLog>[1],
      );
      rowsSafelyReconciled += 1;
      reconciliationAuditEvents += 1;
    }

    const finalRows = await loadExisting(tx, tenantId);
    const finalVersionDistribution = finalRows.reduce<Record<string, number>>(
      (distribution, exercise) => {
        const key = String(exercise.version);
        distribution[key] = (distribution[key] ?? 0) + 1;
        return distribution;
      },
      {},
    );
    return {
      rowsAlreadyExact,
      rowsSafelyReconciled,
      fieldsCorrectedByCategory,
      rowsPreservedBecauseOfConflicts: 0,
      finalVersionDistribution,
      reconciliationAuditEvents,
      ownership: {
        provenImportOwnedUnchanged: proof.owned.size,
        importOwnedButChanged: proof.changed.length,
        contentDrift: proof.contentDrift.length,
        notProvablyImportOwned: proof.notOwned.length,
        missing: proof.missing.length,
        unexpected: proof.unexpected.length,
      },
    };
  });
}

async function main(): Promise<void> {
  assertExerciseImportEnvironment(process.env);
  const options = parseImportArgs(process.argv.slice(2));
  const [sourceText] = await Promise.all([readFile(options.sourcePath, "utf8")]);
  const sourceSha256 = createHash("sha256").update(sourceText).digest("hex");
  const sources = extractLegacyExercises(sourceText);
  assertApprovedLegacyExerciseSource(sources, sourceSha256);
  const normalizedSourceSha256 = normalizedLegacySourceSha256(sources);
  const manifest = buildExerciseImportManifest(sources);
  await verifyMedia(options.mediaDir, manifest);
  for (const entry of manifest) parseExerciseWriteInput(entry.payload, "create");

  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, options.tenantSlug))
    .limit(1);
  if (!tenant) throw new Error(`Tenant '${options.tenantSlug}' does not exist`);
  const actor = await loadActor(db, tenant.id, options.actorId);

  const existing = await loadExisting(db, tenant.id);
  const plan = planExerciseImport(manifest, existing);
  const summary = summarizeExerciseImport(plan);
  const ownership = proveImportOwnership(
    manifest,
    existing,
    await loadTenantAudits(db, tenant.id),
    actor.id,
  );
  const report = {
    mode: options.reconcile
      ? "reconcile"
      : options.attestProvenance
        ? "attest-provenance"
        : options.apply
          ? "apply"
          : "dry-run",
    importVersion: EXERCISE_IMPORT_VERSION,
    sourceSha256,
    normalizedSourceSha256,
    tenant: tenant.slug,
    summary,
    ownership: {
      proven: ownership.owned.size,
      invalidEvidence: ownership.changed.length,
      changed: ownership.changed.length,
      contentDrift: ownership.contentDrift.length,
      notOwned: ownership.notOwned.length,
      missing: ownership.missing.length,
      unexpected: ownership.unexpected.length,
    },
    records: plan.map((item) => ({
      sourceId: item.entry.source.sourceId,
      name: item.entry.payload.name,
      slug: item.entry.payload.slug,
      disposition: item.entry.disposition,
      outcome: item.outcome,
      differences: item.differences,
      reviewReasons: item.entry.reviewReasons,
      sourcePrescription: {
        sets: item.entry.source.sets,
        reps: item.entry.source.reps,
        restSeconds: item.entry.source.restSeconds,
      },
      payload: item.entry.payload,
    })),
  };

  if (options.reconcile) {
    console.log(
      JSON.stringify(
        {
          ...report,
          reconciliation: await reconcileDevelopmentImport(
            manifest,
            tenant.id,
            actor.id,
            sourceSha256,
            options.confirmedDevelopmentOnly,
          ),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (options.attestProvenance) {
    console.log(
      JSON.stringify(
        {
          ...report,
          attestation: await attestDevelopmentImport(
            manifest,
            tenant.id,
            actor.id,
            sourceSha256,
            options.confirmedDevelopmentOnly,
          ),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!options.apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (summary.conflict > 0) {
    console.log(JSON.stringify(report, null, 2));
    throw new Error("Import refused because existing slugs differ from the manifest");
  }

  const applied = await db.transaction(async (tx) => {
    await acquireImportLock(tx, tenant.id);
    await lockAndLoadCurrentOperator(tx, tenant.id, actor.id);
    const lockedPlan = planExerciseImport(manifest, await loadExisting(tx, tenant.id));
    const lockedSummary = summarizeExerciseImport(lockedPlan);
    if (lockedSummary.conflict > 0) {
      throw new Error("Import refused because existing slugs changed during apply");
    }
    let created = 0;
    for (const item of lockedPlan) {
      if (item.outcome === "skip") continue;
      const input = parseExerciseWriteInput(item.entry.payload, "create");
      const { muscles = [], equipment = [], ...fields } = input;
      const [exercise] = await tx
        .insert(exercisesTable)
        .values({
          ...fields,
          name: input.name!,
          slug: input.slug!,
          tenantId: tenant.id,
          createdByUserId: actor.id,
          updatedByUserId: actor.id,
          status: "draft",
        })
        .returning();
      if (muscles.length > 0) {
        await tx.insert(exerciseMusclesTable).values(
          muscles.map((muscle) => ({
            tenantId: tenant.id,
            exerciseId: exercise.id,
            ...muscle,
          })),
        );
      }
      if (equipment.length > 0) {
        await tx.insert(exerciseEquipmentTable).values(
          equipment.map((item) => ({
            tenantId: tenant.id,
            exerciseId: exercise.id,
            ...item,
          })),
        );
      }
      await writeAuditLog(
        {
          tenantId: tenant.id,
          actorType: "cli",
          actorId: actor.id,
          action: "exercise:create",
          targetType: "exercise",
          targetId: exercise.id,
          metadata: {
            slug: exercise.slug,
            source: "bundled-programmes",
            sourceId: item.entry.source.sourceId,
            importVersion: EXERCISE_IMPORT_VERSION,
            sourceSha256,
            normalizedSourceSha256,
            exerciseId: exercise.id,
            currentExerciseVersion: exercise.version,
            manifestRecordSha256: buildExerciseImportProvenance(
              item.entry,
              sourceSha256,
              normalizedSourceSha256,
              exercise.id,
              exercise.version,
            ).manifestRecordSha256,
          },
        },
        tx as Parameters<typeof writeAuditLog>[1],
      );
      created += 1;
    }
    return { created, skipped: lockedSummary.skip, activated: 0 };
  });

  console.log(
    JSON.stringify(
      {
        ...report,
        applied,
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}