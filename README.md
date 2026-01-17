# kit-helpers

Helpers, plugins, and tools for [`@solana/kit`](https://github.com/anza-xyz/kit).

## Plugins

| Package                                                           | Description                                                       | Version |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- | ------- |
| [@kit-helpers/transaction-builder](./plugins/transaction-builder) | Fluent API for building, signing, and sending Solana transactions | 0.1.0   |
| [@kit-helpers/local-validator](./plugins/local-validator)         | Plugin for managing local validator lifecycle                     | 0.1.0   |
| [@kit-helpers/airdrop-token](./plugins/airdrop-token)             | Plugin for creating test tokens                                   | 0.1.0   |

## Development

```bash
# Install dependencies
make install

# Build all packages
make build

# Run tests
make test

# Lint & format
make fix
```

See [Makefile](./Makefile) for all available commands.

## Structure

```
kit-helpers/
├── plugins/      # @solana/kit plugins
└── examples/     # Demo apps
```

## License

MIT
