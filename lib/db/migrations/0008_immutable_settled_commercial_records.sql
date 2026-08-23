-- Settlements and value movements are historical facts. Corrections must be
-- recorded as new, auditable compensating ledger entries.

CREATE OR REPLACE FUNCTION prevent_training_value_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'training value ledger entries are immutable; record a compensating entry instead'
    USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS training_value_ledger_immutable ON training_value_ledger;
CREATE TRIGGER training_value_ledger_immutable
  BEFORE UPDATE OR DELETE ON training_value_ledger
  FOR EACH ROW
  EXECUTE FUNCTION prevent_training_value_ledger_mutation();

CREATE OR REPLACE FUNCTION prevent_commercial_settlement_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'commercial settlements are immutable; record a compensating entry instead'
    USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS commercial_settlements_immutable
  ON commercial_settlements;
CREATE TRIGGER commercial_settlements_immutable
  BEFORE UPDATE OR DELETE ON commercial_settlements
  FOR EACH ROW
  EXECUTE FUNCTION prevent_commercial_settlement_mutation();

CREATE OR REPLACE FUNCTION prevent_settled_booking_commercial_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.hold_status = 'settled' THEN
    RAISE EXCEPTION
      'settled booking commercial records are immutable; record a compensating entry instead'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_commercials_settled_immutable
  ON booking_commercials;
CREATE TRIGGER booking_commercials_settled_immutable
  BEFORE UPDATE OR DELETE ON booking_commercials
  FOR EACH ROW
  EXECUTE FUNCTION prevent_settled_booking_commercial_mutation();