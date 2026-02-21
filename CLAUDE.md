# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Project Overview

Monorepo of helpers, plugins, and tools for `@solana/kit`. Uses pnpm workspaces.

## Structure

```
kit-helpers/
├── plugins/         # @solana/kit plugins
├── renderers/       # Codama renderers
└── examples/        # Demo apps, templates
```

## Commands

```bash
# Root workspace commands
make install         # Install all deps
make build           # Build all packages
make test            # Test all packages
make lint            # Lint all packages
make lint:fix        # Fix lint issues
make format          # Format code
make format-check    # Check formatting

# Package-specific (from package dir)
pnpm build           # Build single package
pnpm test            # Test single package
pnpm dev             # Watch mode
```

## Package Naming

| Directory    | Pattern                        | Example                             |
| ------------ | ------------------------------ | ----------------------------------- |
| plugins/\*   | `@kit-helpers/{name}`          | `@kit-helpers/transaction-builder`  |
| renderers/\* | `@kit-helpers/renderer-{name}` | `@kit-helpers/renderer-react-hooks` |

## Adding New Packages

1. Create dir in appropriate category
2. Add `package.json` with correct naming
3. Extend `../../tsconfig.base.json` in local tsconfig
4. Add to workspace (auto-discovered via `pnpm-workspace.yaml`)

## Plugins

Each plugin in `plugins/` is a `@solana/kit` plugin. See `plugins/transaction-builder/` for reference:

- Multi-platform builds (node, browser, react-native)
- Multi-platform tests via vitest projects
- tsup for bundling, tsc for declarations

## Examples

Each example in `examples/` is a standalone app that uses the plugins (and leverages the local plugin for validator management). See `examples/transaction-builder/` for reference:
