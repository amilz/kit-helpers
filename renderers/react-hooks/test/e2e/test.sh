#!/usr/bin/env bash
set -eux

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Build the renderer first.
cd "$PROJECT_DIR"
pnpm build

# Clean previous output.
rm -rf "$SCRIPT_DIR/output"

# Generate JS client + React hooks.
node "$SCRIPT_DIR/generate.cjs"

# Install deps for type checking.
cd "$SCRIPT_DIR"
pnpm install

# Type check the generated output.
pnpm tsc --noEmit -p tsconfig.json

echo "✅ E2E test passed: generated JS client + React hooks compile together"
