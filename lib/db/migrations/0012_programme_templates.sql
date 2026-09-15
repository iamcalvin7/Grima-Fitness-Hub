-- Stable programme identities, immutable revisions, ordered content and
-- development-only provenance for programme publishing.
DO $$ BEGIN
  CREATE TYPE programme_lifecycle AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS programme_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  status programme_lifecycle NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  current_draft_revision_id UUID,
  current_published_revision_id UUID,
  created_by_user_id UUID NOT NULL,
  updated_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT programme_templates_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT programme_templates_tenant_slug_unique UNIQUE (tenant_id, slug),
  CONSTRAINT programme_templates_tenant_creator_fk
    FOREIGN KEY (tenant_id, created_by_user_id) REFERENCES users(tenant_id, id),
  CONSTRAINT programme_templates_tenant_updater_fk
    FOREIGN KEY (tenant_id, updated_by_user_id) REFERENCES users(tenant_id, id),
  CONSTRAINT programme_templates_version_positive CHECK (version > 0),
  CONSTRAINT programme_templates_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
CREATE INDEX IF NOT EXISTS programme_templates_tenant_status_idx
  ON programme_templates (tenant_id, status);

CREATE TABLE IF NOT EXISTS programme_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL,
  revision_number INTEGER NOT NULL,
  status programme_lifecycle NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT,
  goal TEXT,
  source_metadata JSONB,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT programme_revisions_tenant_template_fk
    FOREIGN KEY (tenant_id, template_id)
    REFERENCES programme_templates(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT programme_revisions_tenant_creator_fk
    FOREIGN KEY (tenant_id, created_by_user_id) REFERENCES users(tenant_id, id),
  CONSTRAINT programme_revisions_template_number_unique UNIQUE (template_id, revision_number),
  CONSTRAINT programme_revisions_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT programme_revisions_number_positive CHECK (revision_number > 0),
  CONSTRAINT programme_revisions_version_positive CHECK (version > 0)
);
CREATE INDEX IF NOT EXISTS programme_revisions_tenant_status_idx
  ON programme_revisions (tenant_id, status);

CREATE TABLE IF NOT EXISTS programme_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL,
  day_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  estimated_minutes INTEGER,
  source_metadata JSONB,
  CONSTRAINT programme_days_tenant_revision_fk
    FOREIGN KEY (tenant_id, revision_id)
    REFERENCES programme_revisions(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT programme_days_revision_number_unique UNIQUE (revision_id, day_number),
  CONSTRAINT programme_days_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT programme_days_number_positive CHECK (day_number > 0),
  CONSTRAINT programme_days_minutes_bounds
    CHECK (estimated_minutes IS NULL OR (estimated_minutes > 0 AND estimated_minutes <= 1440))
);
CREATE INDEX IF NOT EXISTS programme_days_revision_idx
  ON programme_days (tenant_id, revision_id, day_number);

CREATE TABLE IF NOT EXISTS programme_exercise_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_id UUID NOT NULL,
  exercise_id UUID NOT NULL,
  position INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL,
  rest_seconds INTEGER,
  notes TEXT,
  source_exercise_id TEXT,
  source_metadata JSONB,
  CONSTRAINT programme_prescriptions_tenant_day_fk
    FOREIGN KEY (tenant_id, day_id)
    REFERENCES programme_days(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT programme_prescriptions_tenant_exercise_fk
    FOREIGN KEY (tenant_id, exercise_id)
    REFERENCES exercises(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT programme_prescriptions_day_position_unique UNIQUE (day_id, position),
  CONSTRAINT programme_prescriptions_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT programme_prescriptions_position_positive CHECK (position > 0),
  CONSTRAINT programme_prescriptions_sets_positive CHECK (sets > 0),
  CONSTRAINT programme_prescriptions_rest_bounds
    CHECK (rest_seconds IS NULL OR (rest_seconds >= 0 AND rest_seconds <= 3600))
);
CREATE INDEX IF NOT EXISTS programme_prescriptions_day_idx
  ON programme_exercise_prescriptions (tenant_id, day_id, position);

-- A published revision and all of its children are historical facts. A
-- transition into published is allowed, but no subsequent mutation is.
CREATE OR REPLACE FUNCTION prevent_published_programme_revision_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'published' THEN
    RAISE EXCEPTION 'published programme revisions are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS programme_revisions_published_immutable ON programme_revisions;
CREATE TRIGGER programme_revisions_published_immutable
  BEFORE UPDATE OR DELETE ON programme_revisions
  FOR EACH ROW EXECUTE FUNCTION prevent_published_programme_revision_mutation();

CREATE OR REPLACE FUNCTION prevent_published_programme_child_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision_status programme_lifecycle;
BEGIN
  IF TG_TABLE_NAME = 'programme_days' THEN
    SELECT status INTO revision_status FROM programme_revisions WHERE id = OLD.revision_id;
  ELSE
    SELECT r.status INTO revision_status
      FROM programme_days d JOIN programme_revisions r ON r.id = d.revision_id
      WHERE d.id = OLD.day_id;
  END IF;
  IF revision_status = 'published' THEN
    RAISE EXCEPTION 'children of published programme revisions are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS programme_days_published_immutable ON programme_days;
CREATE TRIGGER programme_days_published_immutable
  BEFORE UPDATE OR DELETE ON programme_days
  FOR EACH ROW EXECUTE FUNCTION prevent_published_programme_child_mutation();
DROP TRIGGER IF EXISTS programme_prescriptions_published_immutable ON programme_exercise_prescriptions;
CREATE TRIGGER programme_prescriptions_published_immutable
  BEFORE UPDATE OR DELETE ON programme_exercise_prescriptions
  FOR EACH ROW EXECUTE FUNCTION prevent_published_programme_child_mutation();

CREATE OR REPLACE FUNCTION prevent_published_programme_child_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision_status programme_lifecycle;
BEGIN
  IF TG_TABLE_NAME = 'programme_days' THEN
    SELECT status INTO revision_status FROM programme_revisions WHERE id = NEW.revision_id;
  ELSE
    SELECT r.status INTO revision_status
      FROM programme_days d JOIN programme_revisions r ON r.id = d.revision_id
      WHERE d.id = NEW.day_id;
  END IF;
  IF revision_status = 'published' THEN
    RAISE EXCEPTION 'children of published programme revisions are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS programme_days_published_insert_guard ON programme_days;
CREATE TRIGGER programme_days_published_insert_guard
  BEFORE INSERT ON programme_days
  FOR EACH ROW EXECUTE FUNCTION prevent_published_programme_child_insert();
DROP TRIGGER IF EXISTS programme_prescriptions_published_insert_guard ON programme_exercise_prescriptions;
CREATE TRIGGER programme_prescriptions_published_insert_guard
  BEFORE INSERT ON programme_exercise_prescriptions
  FOR EACH ROW EXECUTE FUNCTION prevent_published_programme_child_insert();