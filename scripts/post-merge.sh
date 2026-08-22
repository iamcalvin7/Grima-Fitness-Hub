#!/bin/bash
set -euo pipefail

pnpm install --frozen-lockfile
pnpm run typecheck:libs

# Drizzle's schema push prompts in non-interactive merge runs even when the
# requested constraint already exists. Track the checked-in SQL migrations
# instead, so a merge only applies unapplied changes and never truncates data.
psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 --no-psqlrc -q <<'SQL'
CREATE TABLE IF NOT EXISTS workspace_schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

is_recorded() {
  psql "$DATABASE_URL" --no-psqlrc -Atqc \
    "SELECT EXISTS (SELECT 1 FROM workspace_schema_migrations WHERE filename = '$1')"
}

record_existing() {
  local filename="$1"
  local sentinel_query="$2"
  local exists
  exists="$(psql "$DATABASE_URL" --no-psqlrc -Atqc "$sentinel_query")"
  if [[ "$exists" == "t" ]]; then
    psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 --no-psqlrc -q \
      -c "INSERT INTO workspace_schema_migrations (filename) VALUES ('$filename') ON CONFLICT DO NOTHING"
  fi
}

# This project predates the migration ledger. Establish its baseline only when
# the corresponding database object is already present; new work is applied
# below from the SQL files in order.
record_existing "0001_booking_domain.sql" \
  "SELECT to_regclass('public.bookings') IS NOT NULL"
record_existing "0002_recurring_availability.sql" \
  "SELECT to_regclass('public.recurring_availability_rules') IS NOT NULL"
record_existing "0003_weekly_slots_optional_session_type.sql" \
  "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_sessions' AND column_name = 'session_type_id' AND is_nullable = 'YES')"
record_existing "0004_in_app_notifications.sql" \
  "SELECT to_regclass('public.notifications') IS NOT NULL"
record_existing "0005_timed_session_reminders.sql" \
  "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'delivery_status')"
record_existing "0006_booking_notification_context.sql" \
  "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'training_session_id')"
record_existing "0006_dynamic_pricing_credit_holds.sql" \
  "SELECT to_regclass('public.pricing_plans') IS NOT NULL"

for migration in lib/db/migrations/*.sql; do
  filename="$(basename "$migration")"
  if [[ "$(is_recorded "$filename")" != "t" ]]; then
    echo "Applying database migration: $filename"
    psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 --no-psqlrc -q -f "$migration"
    psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 --no-psqlrc -q \
      -c "INSERT INTO workspace_schema_migrations (filename) VALUES ('$filename')"
  fi
done
