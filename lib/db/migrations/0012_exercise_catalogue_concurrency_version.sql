BEGIN;

DO $$
DECLARE
  version_type TEXT;
  version_default TEXT;
  version_nullable BOOLEAN;
BEGIN
  SELECT
    format_type(a.atttypid, a.atttypmod),
    pg_get_expr(d.adbin, d.adrelid),
    a.attnotnull
  INTO version_type, version_default, version_nullable
  FROM pg_attribute a
  LEFT JOIN pg_attrdef d
    ON d.adrelid = a.attrelid
   AND d.adnum = a.attnum
  WHERE a.attrelid = 'exercises'::regclass
    AND a.attname = 'version'
    AND NOT a.attisdropped;

  IF version_type IS NULL THEN
    ALTER TABLE exercises
      ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  ELSIF version_type <> 'integer'
     OR version_default <> '1'
     OR NOT version_nullable THEN
    RAISE EXCEPTION
      'incompatible exercises.version definition: type=%, default=%, not_null=%',
      version_type, version_default, version_nullable;
  END IF;
END
$$;

DO $$
DECLARE
  matching_constraints INTEGER;
  named_constraints INTEGER;
BEGIN
  SELECT count(*)
  INTO named_constraints
  FROM pg_constraint
  WHERE conrelid = 'exercises'::regclass
    AND conname = 'exercises_version_positive';

  SELECT count(*)
  INTO matching_constraints
  FROM pg_constraint
  WHERE conrelid = 'exercises'::regclass
    AND conname = 'exercises_version_positive'
    AND contype = 'c'
    AND pg_get_constraintdef(oid) = 'CHECK ((version > 0))';

  IF named_constraints = 0 THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_version_positive CHECK (version > 0);
  ELSIF named_constraints <> 1 OR matching_constraints <> 1 THEN
    RAISE EXCEPTION
      'incompatible exercises_version_positive constraint definition';
  END IF;
END
$$;

COMMIT;