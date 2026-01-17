import { env } from 'node:process';

import { defineConfig, Format, Options as TsupConfig } from 'tsup';

function getBuildConfig(format: Format): TsupConfig {
    return {
        define: {
            __NODEJS__: 'true',
            __TEST__: 'false',
            __VERSION__: `"${env.npm_package_version}"`,
        },
        entry: ['./src/index.ts'],
        external: ['node:child_process', 'node:fs', 'node:path'],
        format,
        name: 'node',
        outExtension({ format }) {
            return { js: `.node.${format === 'cjs' ? 'cjs' : 'mjs'}` };
        },
        platform: 'node',
        sourcemap: true,
        treeshake: true,
    };
}

export default defineConfig([getBuildConfig('cjs'), getBuildConfig('esm')]);
