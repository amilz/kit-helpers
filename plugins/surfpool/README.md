# @kit-helpers/surfpool

[Surfpool](https://www.surfpool.run/) cheatcodes plugin for `@solana/kit` — clock control, account manipulation, program management, profiling, and more.

## Installation

```bash
pnpm add @kit-helpers/surfpool
```

## Usage

### With Plugin

```ts
import { createSolanaClient } from '@solana/kit';
import { surfpool } from '@kit-helpers/surfpool';

const client = createSolanaClient({ ... })
  .use(surfpool());

// Time travel to a future epoch
await client.surfnet.timeTravel({ absoluteEpoch: 1000 }).send();

// Set account lamports
await client.surfnet.setAccount(address, { lamports: 5_000_000_000 }).send();

// Pause the clock
await client.surfnet.pauseClock().send();
```

### Without Plugin

```ts
import { createSurfnetCheatcodesRpc } from '@kit-helpers/surfpool';

const surfnet = createSurfnetCheatcodesRpc('http://127.0.0.1:8899');

const clock = await surfnet.timeTravel({ absoluteSlot: 50_000 }).send();
```

## API

### Clock

| Method          | Description                                |
| --------------- | ------------------------------------------ |
| `timeTravel()`  | Jump to a future epoch, slot, or timestamp |
| `pauseClock()`  | Freeze the clock — slots stop advancing    |
| `resumeClock()` | Resume the clock after pausing             |

### Accounts

| Method                  | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `setAccount()`          | Set lamports, data, owner, or executable on account |
| `setTokenAccount()`     | Set token account balance, delegate, state          |
| `resetAccount()`        | Reset account to its original state                 |
| `streamAccount()`       | Register an account for streaming                   |
| `getStreamedAccounts()` | List accounts registered for streaming              |

### Programs

| Method                  | Description                              |
| ----------------------- | ---------------------------------------- |
| `cloneProgramAccount()` | Clone a program to a new address         |
| `setProgramAuthority()` | Set or remove upgrade authority          |
| `writeProgram()`        | Write data to a program at a byte offset |

### Profiling

| Method                     | Description                                |
| -------------------------- | ------------------------------------------ |
| `profileTransaction()`     | Profile a transaction's compute unit usage |
| `getTransactionProfile()`  | Get detailed profile by signature or UUID  |
| `getProfileResultsByTag()` | Get all profile results matching a tag     |

### IDL

| Method           | Description                           |
| ---------------- | ------------------------------------- |
| `registerIdl()`  | Register an Anchor IDL for a program  |
| `getActiveIdl()` | Retrieve the active IDL for a program |

### Network

| Method             | Description                              |
| ------------------ | ---------------------------------------- |
| `getSurfnetInfo()` | Get Surfnet runtime info and runbook log |
| `exportSnapshot()` | Export the current network state         |
| `setSupply()`      | Override circulating/total supply        |
| `resetNetwork()`   | Wipe all state and start fresh           |

### Scenario

| Method               | Description                                |
| -------------------- | ------------------------------------------ |
| `registerScenario()` | Register a scenario with account overrides |

### Local

| Method                 | Description                                |
| ---------------------- | ------------------------------------------ |
| `getLocalSignatures()` | Get recent transaction signatures and logs |

## Configuration

```ts
surfpool({
    url: 'http://127.0.0.1:8899', // default
});
```

## License

MIT
