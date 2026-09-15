-- Programme template hardening. This migration intentionally leaves 0012
-- unchanged: it closes ancestry and pointer-integrity gaps in place.

-- These deferred composite FKs enforce tenant ownership of both pointers while
-- still allowing a revision to be inserted before the template pointer is set.
ALTER TABLE programme_templates
  ADD CONSTRAINT programme_templates_current_draft_revision_fk
  FOREIGN KEY (tenant_id, current_draft_revision_id)
  REFERENCES programme_revisions (tenant_id, id)
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE programme_templates
  ADD CONSTRAINT programme_templates_current_published_revision_fk
  FOREIGN KEY (tenant_id, current_published_revision_id)
  REFERENCES programme_revisions (tenant_id, id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION prevent_published_programme_child_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_revision_status programme_lifecycle;
  new_revision_status programme_lifecycle;
BEGIN
  IF TG_TABLE_NAME = 'programme_days' THEN
    SELECT status INTO old_revision_status
      FROM programme_revisions WHERE id = OLD.revision_id;
    IF TG_OP <> 'DELETE' THEN
      SELECT status INTO new_revision_status
        FROM programme_revisions WHERE id = NEW.revision_id;
    END IF;
  ELSE
    SELECT r.status INTO old_revision_status
      FROM programme_days d
      JOIN programme_revisions r ON r.id = d.revision_id
      WHERE d.id = OLD.day_id;
    IF TG_OP <> 'DELETE' THEN
      SELECT r.status INTO new_revision_status
        FROM programme_days d
        JOIN programme_revisions r ON r.id = d.revision_id
        WHERE d.id = NEW.day_id;
    END IF;
  END IF;

  IF old_revision_status = 'published' OR new_revision_status = 'published' THEN
    RAISE EXCEPTION 'children of published programme revisions are immutable'
      USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_programme_template_pointers()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  draft_template_id UUID;
  draft_status programme_lifecycle;
  published_template_id UUID;
  published_status programme_lifecycle;
  pointer_template programme_templates%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'programme_templates' THEN
    IF NEW.current_draft_revision_id IS NOT NULL THEN
      SELECT template_id, status INTO draft_template_id, draft_status
        FROM programme_revisions
        WHERE tenant_id = NEW.tenant_id AND id = NEW.current_draft_revision_id;
      IF draft_template_id IS NULL OR draft_template_id <> NEW.id OR draft_status <> 'draft' THEN
        RAISE EXCEPTION 'current draft revision must belong to this template and be draft'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    IF NEW.current_published_revision_id IS NOT NULL THEN
      SELECT template_id, status INTO published_template_id, published_status
        FROM programme_revisions
        WHERE tenant_id = NEW.tenant_id AND id = NEW.current_published_revision_id;
      IF published_template_id IS NULL OR published_template_id <> NEW.id OR published_status <> 'published' THEN
        RAISE EXCEPTION 'current published revision must belong to this template and be published'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    IF NEW.status = 'published' AND NEW.current_published_revision_id IS NULL THEN
      RAISE EXCEPTION 'published programme templates require a current published revision'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'archived' AND NEW.current_draft_revision_id IS NOT NULL THEN
      RAISE EXCEPTION 'archived programme templates cannot have a current draft revision'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  FOR pointer_template IN
    SELECT *
    FROM programme_templates
    WHERE (current_draft_revision_id = COALESCE(NEW.id, OLD.id)
       OR current_published_revision_id = COALESCE(NEW.id, OLD.id))
  LOOP
    IF pointer_template.current_draft_revision_id = COALESCE(NEW.id, OLD.id) THEN
      SELECT template_id, status INTO draft_template_id, draft_status
        FROM programme_revisions
        WHERE tenant_id = pointer_template.tenant_id AND id = pointer_template.current_draft_revision_id;
      IF draft_template_id IS NULL OR draft_template_id <> pointer_template.id OR draft_status <> 'draft' THEN
        RAISE EXCEPTION 'current draft revision pointer is inconsistent'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    IF pointer_template.current_published_revision_id = COALESCE(NEW.id, OLD.id) THEN
      SELECT template_id, status INTO published_template_id, published_status
        FROM programme_revisions
        WHERE tenant_id = pointer_template.tenant_id AND id = pointer_template.current_published_revision_id;
      IF published_template_id IS NULL OR published_template_id <> pointer_template.id OR published_status <> 'published' THEN
        RAISE EXCEPTION 'current published revision pointer is inconsistent'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS programme_templates_pointer_consistency ON programme_templates;
CREATE CONSTRAINT TRIGGER programme_templates_pointer_consistency
  AFTER INSERT OR UPDATE ON programme_templates
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION validate_programme_template_pointers();

DROP TRIGGER IF EXISTS programme_revisions_pointer_consistency ON programme_revisions;
CREATE CONSTRAINT TRIGGER programme_revisions_pointer_consistency
  AFTER INSERT OR UPDATE OR DELETE ON programme_revisions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION validate_programme_template_pointers();