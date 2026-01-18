// Plugin
export { localValidatorPlugin } from './local-validator-plugin.js';
export type { LocalValidatorMethods } from './local-validator-plugin.js';

// Manager (for direct use without plugin)
export { ValidatorManager } from './validator-manager.js';

// Types
export type {
    LocalValidatorPluginAutoStartConfig,
    LocalValidatorPluginBaseConfig,
    LocalValidatorPluginConfig,
    LocalValidatorPluginSyncConfig,
    RestartValidatorOptions,
    StartValidatorOptions,
    StartValidatorResult,
    ValidatorHealthResult,
} from './types.js';

// Errors
export {
    ValidatorAlreadyRunningError,
    ValidatorBinaryNotFoundError,
    ValidatorStartError,
    ValidatorStopError,
} from './types.js';
