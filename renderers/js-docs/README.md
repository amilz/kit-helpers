# @codama/renderers-js-docs

Generate usage-first markdown documentation from a [Codama](https://github.com/codama-idl/codama) IDL. Produces account fetch/decode examples, instruction build/send flows, PDA derivation, error reference, and type codec docs — all using `@solana/kit` TypeScript.

## Installation

```bash
pnpm add @codama/renderers-js-docs
```

## Usage

```ts
import { createFromJson } from 'codama';
import { renderVisitor } from '@codama/renderers-js-docs';

const codama = createFromJson(idlJson);
codama.accept(
    renderVisitor('./my-project', {
        packageName: 'my-program-client',
        generatedFolder: 'docs',
    }),
);
```

## Generated Output

| File                     | Content                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `index.md`               | Program overview with linked summaries of all accounts, instructions, PDAs, types, and errors |
| `accounts/<name>.md`     | Fields table, size, discriminator, fetch/decode/fetchAll examples                             |
| `instructions/<name>.md` | Accounts table, args table, build instruction + send transaction examples                     |
| `pdas/<name>.md`         | Seeds table, find PDA example                                                                 |
| `types/<name>.md`        | Struct fields or enum variants, encoder/decoder codec examples                                |
| `errors.md`              | All program errors with codes and error-checking example                                      |

## Options

| Option                        | Type                        | Default               | Description                                    |
| ----------------------------- | --------------------------- | --------------------- | ---------------------------------------------- |
| `packageName`                 | `string`                    | `'my-program-client'` | Package name used in import examples           |
| `generatedFolder`             | `string`                    | `'docs'`              | Output subdirectory relative to project folder |
| `deleteFolderBeforeRendering` | `boolean`                   | `true`                | Delete output folder before generating         |
| `nameTransformers`            | `Partial<NameTransformers>` | —                     | Override generated function/type names         |
