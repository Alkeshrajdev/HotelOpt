#!/usr/bin/env bash
# Copies the calculation engine, the services and the i18n layer from hotel-optimizer-v2
# into this front end. v2 is the source of truth for every figure; this front end renders.
#
#   ./scripts/sync-core.sh [path-to-hotel-optimizer-v2]     (default: ../hotel-optimizer-v2)
#
# What is NOT copied, and why: anything that only runs on a server — the Next.js API layer
# (cookies, route registry), mail, the scheduler, the model callers for OCR and
# classification, the PDF renderer and the reports port that calls it, the token hashing
# that needs node:crypto, the screen-state stubs — and every test file, which stays with
# the code it tests in v2.
set -euo pipefail
SRC="${1:-$(dirname "$0")/../../hotel-optimizer-v2}/app/src"
DST="$(dirname "$0")/../src"
[ -d "$SRC/engine" ] || { echo "no v2 checkout at $SRC" >&2; exit 1; }

rm -rf "$DST/engine" "$DST/services" "$DST/i18n"
cp -R "$SRC/engine" "$DST/engine"
cp -R "$SRC/services" "$DST/services"
cp -R "$SRC/i18n" "$DST/i18n"
rm -rf "$DST/engine/ingestion" \
       "$DST/services/api" "$DST/services/classify" "$DST/services/extract" \
       "$DST/services/mail" "$DST/services/scheduler" \
       "$DST/services/capture/token.ts" "$DST/services/reports/pdf.ts" \
       "$DST/services/reports/ports.supabase.ts" \
       "$DST/i18n/server.ts"
# The one API-layer helper the read ports share: how a to-one embed is read back.
mkdir -p "$DST/services/api" && cp "$SRC/services/api/embed.ts" "$DST/services/api/embed.ts"
# Stubs belong to v2's screen-state harness (src/ui/stub), which is not here.
find "$DST/engine" "$DST/services" "$DST/i18n" \
  \( -name '*.test.ts' -o -name '*.test.tsx' -o -name 'stub.ts' -o -name '*-stub.ts' \) -delete

cat > "$DST/engine/README.md" <<'MD'
Copied from hotel-optimizer-v2 by scripts/sync-core.sh. Do not edit here; change v2 and re-run the script.
MD
cp "$DST/engine/README.md" "$DST/services/README.md"
cp "$DST/engine/README.md" "$DST/i18n/README.md"
echo "synced from $SRC: $(find "$DST/engine" "$DST/services" "$DST/i18n" -name '*.ts' | wc -l) files"
