#!/usr/bin/env bash
set -eux

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Build the renderer first.
cd "$PROJECT_DIR"
pnpm build

# Clean previous output.
rm -rf "$SCRIPT_DIR/output"

# Generate docs.
node "$SCRIPT_DIR/generate.cjs"

DOCS_DIR="$SCRIPT_DIR/output/docs"

# Verify expected files exist.
test -f "$DOCS_DIR/index.md"
test -f "$DOCS_DIR/accounts/counter.md"
test -f "$DOCS_DIR/instructions/increment.md"
test -f "$DOCS_DIR/pdas/counter.md"
test -f "$DOCS_DIR/errors.md"

# Verify key content in each file.
grep -q "# Counter" "$DOCS_DIR/index.md"
grep -q "## Accounts" "$DOCS_DIR/index.md"
grep -q "## Instructions" "$DOCS_DIR/index.md"
grep -q "counter-client" "$DOCS_DIR/index.md"

grep -q "# Counter" "$DOCS_DIR/accounts/counter.md"
grep -q "fetchCounter" "$DOCS_DIR/accounts/counter.md"
grep -q "decodeCounter" "$DOCS_DIR/accounts/counter.md"
grep -q "| Field" "$DOCS_DIR/accounts/counter.md"

grep -q "# Increment" "$DOCS_DIR/instructions/increment.md"
grep -q "getIncrementInstruction" "$DOCS_DIR/instructions/increment.md"

grep -q "# Counter" "$DOCS_DIR/pdas/counter.md"
grep -q "findCounterPda" "$DOCS_DIR/pdas/counter.md"

grep -q "Counter Errors" "$DOCS_DIR/errors.md"
grep -q "invalidAuthority" "$DOCS_DIR/errors.md"

echo "✅ E2E test passed: all expected docs generated with correct content"
