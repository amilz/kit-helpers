// Plugin
export { localValidatorPlugin } from './local-validator-plugin.js';

// Manager (for direct use without plugin)
export { ValidatorManager } from './validator-manager.js';

// Types
export type {
    LocalValidatorPluginConfig,
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
