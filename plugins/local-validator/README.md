# @kit-helpers/local-validator

Solana test validator lifecycle management for `@solana/kit`. Node.js only.

Requires `solana-test-validator` in PATH. [Install Solana CLI tools](https://solana.com/docs/intro/installation).

## Usage

### With Plugin

```ts
import { createEmptyClient } from '@solana/kit';
import { localValidatorPlugin } from '@kit-helpers/local-validator';

const client = createEmptyClient().use(localValidatorPlugin());

try {
    const { pid, rpcUrl } = await client.startValidator();
    // ... run tests ...
} finally {
    client.stopValidator();
}
```

### Without Plugin

```ts
import { ValidatorManager } from '@kit-helpers/local-validator';

const manager = new ValidatorManager();
await manager.startValidator();
// ...
manager.stopValidator();
```

## API

### Plugin Methods

| Method                              | Description                           |
| ----------------------------------- | ------------------------------------- |
| `startValidator(options?)`          | Start validator, wait until healthy   |
| `stopValidator()`                   | Stop validator (no-op if not running) |
| `restartValidator(options?)`        | Stop, wait, start                     |
| `isValidatorRunning()`              | Check if validator is running         |
| `waitForValidatorReady(timeoutMs?)` | Wait for external validator           |

### Plugin Config

```ts
localValidatorPlugin({
  rpcUrl?: string;              // default: 'http://127.0.0.1:8899'
  ledgerPath?: string;          // default: '.test-ledger'
  pidFile?: string;             // default: '.solana-test-validator.pid'
  readyTimeoutMs?: number;      // default: 30000
  healthCheckIntervalMs?: number; // default: 500
  binaryName?: string;          // default: 'solana-test-validator'
  manageExternal?: boolean;     // default: false
  silent?: boolean;             // default: false
});
```

### Start Options

```ts
await client.startValidator({
  reset?: boolean;              // default: true (--reset flag)
  stopIfRunning?: boolean;      // default: false
  logFile?: string;             // write logs to file
  readyTimeoutMs?: number;      // override timeout
  extraArgs?: string[];         // additional CLI args
});
```

### Errors

| Error                          | Cause                                   |
| ------------------------------ | --------------------------------------- |
| `ValidatorBinaryNotFoundError` | `solana-test-validator` not in PATH     |
| `ValidatorAlreadyRunningError` | Already running, `stopIfRunning: false` |
| `ValidatorStartError`          | Failed to start or reach healthy state  |
| `ValidatorStopError`           | Permission denied stopping process      |

## Examples

### Custom Ledger Path

```ts
const client = createEmptyClient().use(localValidatorPlugin({ ledgerPath: './my-ledger' }));
```

### Load Programs

```ts
await client.startValidator({
    extraArgs: ['--bpf-program', 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'token.so'],
});
```

### Manage External Validator

```ts
const client = createEmptyClient().use(localValidatorPlugin({ manageExternal: true }));

// Wait for validator started outside this process
await client.waitForValidatorReady();
```

## License

MIT
