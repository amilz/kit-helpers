import { env } from 'node:process';

import { defineConfig } from 'vitest/config';

type Platform = 'browser' | 'node' | 'react-native';

function getVitestConfig(platform: Platform) {
    return defineConfig({
        define: {
            __BROWSER__: `${platform === 'browser'}`,
            __ESM__: 'true',
            __NODEJS__: `${platform === 'node'}`,
            __REACTNATIVE__: `${platform === 'react-native'}`,
            __TEST__: 'true',
            __VERSION__: `"${env.npm_package_version}"`,
        },
        resolve: {
            conditions:
                platform === 'browser'
                    ? ['browser', 'import', 'module', 'default']
                    : platform === 'react-native'
                      ? ['react-native', 'import', 'module', 'default']
                      : ['node', 'import', 'require', 'default'],
        },
        test: {
            name: platform,
            environment: platform === 'browser' ? 'happy-dom' : 'node',
        },
    });
}

export default defineConfig({
    test: {
        projects: [getVitestConfig('browser'), getVitestConfig('node'), getVitestConfig('react-native')],
    },
});
