.PHONY: install build test test-unit test-integration lint fix format format-check dev clean example-builder example-nonce example-token example-slot kill-validator clear-ledger all

# Install all dependencies
install:
	pnpm install

# Build all packages
build:
	pnpm build

# Run all tests
test:
	pnpm test

# Run unit tests only (fast, no external dependencies)
test-unit:
	pnpm test:unit

# Run integration tests only (requires solana-test-validator)
test-integration:
	pnpm test:integration

# Lint all packages
lint:
	pnpm lint

# Format code with prettier
format:
	pnpm format

# Check formatting
format-check:
	pnpm format:check

# Fix lint/format issues
fix:
	pnpm lint:fix && pnpm format

# Dev mode (watch)
dev:
	pnpm dev

# Clean all dist folders
clean:
	find . -name "dist" -type d -prune -exec rm -rf {} +
	find . -name "node_modules" -type d -prune -exec rm -rf {} +

# Fresh install (clean + install)
fresh: clean install

# Full CI check (install, build, test, lint)
ci: install build test lint

# ─────────────────────────────────────────────────────────────
# Package-specific commands (run from root)
# ─────────────────────────────────────────────────────────────

# Build specific package: make pkg-build p=transaction-builder
pkg-build:
	pnpm --filter "*$(p)*" build

# Test specific package: make pkg-test p=transaction-builder
pkg-test:
	pnpm --filter "*$(p)*" test

# Dev specific package: make pkg-dev p=transaction-builder
pkg-dev:
	pnpm --filter "*$(p)*" dev

# ─────────────────────────────────────────────────────────────
# Examples (uses local plugin for validator management)
# ─────────────────────────────────────────────────────────────

# Run transaction-builder example (manages its own validator via local-validator plugin)
example-builder:
	pnpm --filter transaction-builder-demo demo

# Run durable-nonces example (manages its own validator via local-validator plugin)
example-nonce:
	pnpm --filter durable-nonces-demo demo

# Run tokens example (manages its own validator via local-validator plugin)
example-token:
	pnpm --filter tokens-demo demo

# Run slots example (demonstrates slot warping via local-validator plugin)
example-slot:
	pnpm --filter slots-demo demo

# Kill local validator
kill-validator:
	pkill solana-test-validator

# Clear Local Validator Ledger
clear-ledger:
	rm -rf .test-ledger

# All
all: install build test fix
