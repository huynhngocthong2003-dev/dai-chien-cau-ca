#!/usr/bin/env bash
# Chạy migration Supabase trên PostgreSQL tạm thời và kiểm thử RLS.
# Cần PostgreSQL 15+ (initdb, pg_ctl, psql). Dùng: bash tests/db/run.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-5499}"
RUNAS=""
if [ "$(id -u)" = "0" ]; then
  id dccc_pg >/dev/null 2>&1 || useradd -M dccc_pg
  chown dccc_pg "$TMP"
  RUNAS="runuser -u dccc_pg --"
fi
cleanup() { $RUNAS "$PGBIN/pg_ctl" -D "$TMP/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
$RUNAS "$PGBIN/initdb" -D "$TMP/data" -U postgres --auth=trust >/dev/null
$RUNAS "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/tests/db/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -t -f "$ROOT/tests/db/rls_test.sql"
