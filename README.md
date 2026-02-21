# kit-helpers

Helpers, plugins, and tools for [`@solana/kit`](https://github.com/anza-xyz/kit).

## Plugins

| Package                                                           | Description                                                                | Version |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ------- |
| [@kit-helpers/client](./plugins/client)                           | Batteries-included Solana client with all kit-helpers plugins              | 0.1.0   |
| [@kit-helpers/action](./plugins/action)                           | Transaction lifecycle plugin — send, simulate, sign                        | 0.1.0   |
| [@kit-helpers/query](./plugins/query)                             | Framework-agnostic query definitions for Solana data fetching              | 0.1.0   |
| [@kit-helpers/wallet](./plugins/wallet)                           | Framework-agnostic wallet plugin with Wallet Standard support              | 0.1.0   |
| [@kit-helpers/transaction-builder](./plugins/transaction-builder) | Fluent API for building, signing, and sending Solana transactions          | 0.1.0   |
| [@kit-helpers/asset](./plugins/asset)                             | Well-known Solana asset addresses                                          | 0.1.0   |
| [@kit-helpers/jito](./plugins/jito)                               | Jito bundle plugin — bundle submission, tip accounts, and status polling   | 0.1.0   |
| [@kit-helpers/local-validator](./plugins/local-validator)         | Solana test validator lifecycle management                                 | 0.1.0   |
| [@kit-helpers/airdrop-token](./plugins/airdrop-token)             | Airdrop utility for creating token mints, ATAs, and minting tokens         | 0.1.0   |

> **Note:** The `@kit-helpers/program-system` and `@kit-helpers/program-token` packages have been removed. Their functionality is now provided by the native [`@solana-program/system`](https://www.npmjs.com/package/@solana-program/system) and [`@solana-program/token`](https://www.npmjs.com/package/@solana-program/token) plugins, composed automatically by `@kit-helpers/client` under `client.program.system` and `client.program.token`.

## Renderers

| Package                                                      | Description                                          | Version |
| ------------------------------------------------------------ | ---------------------------------------------------- | ------- |
| [@kit-helpers/renderer-react-hooks](./renderers/react-hooks) | Codama renderer for generating React hooks from IDLs | 0.1.0   |
| [@kit-helpers/renderer-js-docs](./renderers/js-docs)         | Codama renderer for generating docs from IDLs        | 0.1.0   |

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
├── renderers/    # Codama renderers
└── examples/     # Demo apps
```

## License

MIT
