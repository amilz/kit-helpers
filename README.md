# kit-helpers

Helpers, plugins, and tools for [`@solana/kit`](https://github.com/anza-xyz/kit).

## Plugins

| Package                                                           | Description                                                              | Version |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ | ------- |
| [@kit-helpers/client](./plugins/client)                           | Batteries-included Solana client with all kit-helpers plugins            | 0.2.0   |
| [@kit-helpers/action](./plugins/action)                           | Transaction lifecycle plugin — send, simulate, sign                      | 0.2.0   |
| [@kit-helpers/query](./plugins/query)                             | Framework-agnostic query definitions for Solana data fetching            | 0.2.0   |
| [@kit-helpers/wallet](./plugins/wallet)                           | Framework-agnostic wallet plugin with Wallet Standard support            | 0.2.0   |
| [@kit-helpers/transaction-builder](./plugins/transaction-builder) | Fluent API for building, signing, and sending Solana transactions        | 0.2.0   |
| [@kit-helpers/asset](./plugins/asset)                             | Well-known Solana asset addresses                                        | 0.2.0   |
| [@kit-helpers/jito](./plugins/jito)                               | Jito bundle plugin — bundle submission, tip accounts, and status polling | 0.2.0   |
| [@kit-helpers/local-validator](./plugins/local-validator)         | Solana test validator lifecycle management                               | 0.2.0   |
| [@kit-helpers/airdrop-token](./plugins/airdrop-token)             | Airdrop utility for creating token mints, ATAs, and minting tokens       | 0.2.0   |

> **Note:** The `@kit-helpers/program-system` and `@kit-helpers/program-token` packages have been removed. Their functionality is now provided by the native [`@solana-program/system`](https://www.npmjs.com/package/@solana-program/system) and [`@solana-program/token`](https://www.npmjs.com/package/@solana-program/token) plugins, composed automatically by `@kit-helpers/client` under `client.program.system` and `client.program.token`.

## Transaction v1

**The plugins build version 1 transactions by default.** Version 1 raises the
maximum transaction size from 1232 to 4096 bytes and carries the compute unit
limit, loaded accounts data size limit, and priority fee in the message config
instead of ComputeBudget instructions. Both limits default to zero, so the
plugins estimate whichever one you leave unset.

Version 1 needs a cluster with the `txv1` feature gate active (mainnet, devnet,
testnet, and `solana-test-validator` 4.2+) and cannot use address lookup tables.
Pass `version: 0` to opt out:

- `@kit-helpers/transaction-builder` — `transactionBuilderPlugin({ version: 0 })`
- `@kit-helpers/action` — `actionPlugin({ version: 0 })`, or `version` per call
- `@kit-helpers/client` — `createSolanaClient({ version: 0, ... })`
- `@kit-helpers/wallet` — `client.wallet.supportedTransactionVersions` reports
  which versions a connected wallet will sign; the action namespace builds
  version 0 for a wallet that does not advertise version 1

Priority fee units differ by version: version 0 takes a price per compute unit,
version 1 a total in lamports. Passing the wrong option throws.

Reading transactions back requires `maxSupportedTransactionVersion: 1` on
`getTransaction` and `getBlock`; a version 1 transaction's limits appear under
`transactionConfig`. See
[SIMD-0296](https://github.com/solana-foundation/solana-improvement-documents/blob/main/proposals/0296-larger-transactions.md)
and [SIMD-0385](https://github.com/solana-foundation/solana-improvement-documents/blob/main/proposals/0385-transaction-v1.md).

## Renderers

| Package                                                      | Description                                          | Version |
| ------------------------------------------------------------ | ---------------------------------------------------- | ------- |
| [@kit-helpers/renderer-react-hooks](./renderers/react-hooks) | Codama renderer for generating React hooks from IDLs | 0.2.0   |
| [@kit-helpers/renderer-js-docs](./renderers/js-docs)         | Codama renderer for generating docs from IDLs        | 0.2.0   |

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
