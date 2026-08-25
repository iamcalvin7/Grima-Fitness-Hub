DO $$ BEGIN
  CREATE TYPE exercise_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exercise_performance_type AS ENUM (
    'weight_reps',
    'bodyweight_reps',
    'added_weight_reps',
    'assisted_reps',
    'duration',
    'distance_time'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exercise_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exercise_laterality AS ENUM ('bilateral', 'unilateral');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exercise_muscle_role AS ENUM ('primary', 'secondary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status exercise_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  performance_type exercise_performance_type,
  movement_pattern TEXT,
  laterality exercise_laterality,
  description TEXT,
  instructions TEXT,
  difficulty exercise_difficulty,
  default_rest_seconds INTEGER,
  safety_notes TEXT,
  internal_notes TEXT,
  media_url TEXT,
  created_by_user_id UUID NOT NULL,
  updated_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exercises_tenant_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT exercises_tenant_slug_unique UNIQUE (tenant_id, slug),
  CONSTRAINT exercises_tenant_creator_fk
    FOREIGN KEY (tenant_id, created_by_user_id) REFERENCES users(tenant_id, id),
  CONSTRAINT exercises_tenant_updater_fk
    FOREIGN KEY (tenant_id, updated_by_user_id) REFERENCES users(tenant_id, id),
  CONSTRAINT exercises_default_rest_bounds
    CHECK (default_rest_seconds IS NULL OR (default_rest_seconds > 0 AND default_rest_seconds <= 3600)),
  CONSTRAINT exercises_version_positive CHECK (version > 0),
  CONSTRAINT exercises_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE INDEX IF NOT EXISTS exercises_tenant_status_name_idx
  ON exercises (tenant_id, status, name);
CREATE INDEX IF NOT EXISTS exercises_tenant_performance_idx
  ON exercises (tenant_id, performance_type);
CREATE INDEX IF NOT EXISTS exercises_tenant_difficulty_idx
  ON exercises (tenant_id, difficulty);

CREATE TABLE IF NOT EXISTS exercise_muscles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL,
  muscle_key TEXT NOT NULL,
  role exercise_muscle_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exercise_muscles_tenant_exercise_fk
    FOREIGN KEY (tenant_id, exercise_id) REFERENCES exercises(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT exercise_muscles_tenant_exercise_muscle_unique
    UNIQUE (tenant_id, exercise_id, muscle_key),
  CONSTRAINT exercise_muscles_key_nonempty CHECK (length(trim(muscle_key)) > 0),
  CONSTRAINT exercise_muscles_key_valid CHECK (
    muscle_key IN (
      'chest', 'upper_chest', 'front_delts', 'side_delts', 'biceps',
      'forearms', 'abs', 'obliques', 'quads', 'adductors', 'traps',
      'rear_delts', 'lats', 'triceps', 'lower_back', 'glutes',
      'hamstrings', 'calves'
    )
  )
);

CREATE INDEX IF NOT EXISTS exercise_muscles_tenant_muscle_idx
  ON exercise_muscles (tenant_id, muscle_key);
CREATE INDEX IF NOT EXISTS exercise_muscles_exercise_idx
  ON exercise_muscles (tenant_id, exercise_id);

CREATE TABLE IF NOT EXISTS exercise_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL,
  equipment_key TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exercise_equipment_tenant_exercise_fk
    FOREIGN KEY (tenant_id, exercise_id) REFERENCES exercises(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT exercise_equipment_tenant_exercise_key_unique
    UNIQUE (tenant_id, exercise_id, equipment_key),
  CONSTRAINT exercise_equipment_key_nonempty CHECK (length(trim(equipment_key)) > 0),
  CONSTRAINT exercise_equipment_key_format
    CHECK (equipment_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$')
);

CREATE INDEX IF NOT EXISTS exercise_equipment_tenant_key_idx
  ON exercise_equipment (tenant_id, equipment_key);
CREATE INDEX IF NOT EXISTS exercise_equipment_exercise_idx
  ON exercise_equipment (tenant_id, exercise_id);