import { env } from 'node:process';

import { defineConfig } from 'vitest/config';

export default defineConfig({
    define: {
        __NODEJS__: 'true',
        __TEST__: 'true',
        __VERSION__: `"${env.npm_package_version}"`,
    },
    resolve: {
        conditions: ['node', 'import', 'require', 'default'],
    },
    test: {
        name: 'node',
        environment: 'node',
    },
});
