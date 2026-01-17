import type {
    LocalValidatorPluginConfig,
    RestartValidatorOptions,
    StartValidatorOptions,
    StartValidatorResult,
    ValidatorHealthResult,
} from './types.js';
import { ValidatorManager } from './validator-manager.js';

/**
 * Plugin that adds local validator lifecycle management to @solana/kit clients.
 *
 * **Node.js only** - uses child_process to spawn solana-test-validator.
 *
 * @param config - Plugin-level defaults for all validator operations.
 * @param config.rpcUrl - URL for validator RPC (default: http://127.0.0.1:8899)
 * @param config.ledgerPath - Path to ledger directory (default: .test-ledger)
 * @param config.manageExternal - Whether to manage validators not started by this instance (default: false)
 * @param config.readyTimeoutMs - Timeout for health checks (default: 30000)
 * @param config.healthCheckIntervalMs - Interval between health checks (default: 500)
 * @param config.binaryName - Custom binary name (default: solana-test-validator)
 * @param config.silent - Suppress console output (default: false)
 *
 * @example Basic usage
 * ```ts
 * import { createEmptyClient } from '@solana/kit';
 * import { localValidatorPlugin } from '@kit-helpers/local-validator';
 *
 * const client = createEmptyClient()
 *   .use(localValidatorPlugin());
 *
 * try {
 *   // Start validator and wait until ready
 *   const { pid, rpcUrl } = await client.startValidator();
 *   console.log(`Validator running on ${rpcUrl} (PID: ${pid})`);
 *
 *   // ... run your tests ...
 *
 * } finally {
 *   // Stop when done
 *   client.stopValidator();
 * }
 * ```
 *
 * @example With configuration
 * ```ts
 * const client = createEmptyClient()
 *   .use(localValidatorPlugin({
 *     ledgerPath: './my-test-ledger',
 *     readyTimeoutMs: 60000,
 *     manageExternal: true,
 *   }));
 *
 * // Override per-call
 * await client.startValidator({
 *   reset: false,
 *   logFile: 'validator.log',
 *   extraArgs: ['--limit-ledger-size', '50000000'],
 * });
 * ```
 *
 * @example Restart pattern
 * ```ts
 * // Restart validator and wait until ready again
 * await client.restartValidator({ reset: true });
 * ```
 */
export function localValidatorPlugin(config?: LocalValidatorPluginConfig) {
    return <T extends object>(client: T) => {
        const manager = new ValidatorManager(config);

        return {
            ...client,

            /**
             * Check if a local validator is running.
             *
             * Behavior depends on manageExternal config:
             * - false (default): only returns true if this instance started the validator
             * - true: returns true if any validator with PID file is running
             */
            isValidatorRunning(): boolean {
                return manager.isValidatorRunning();
            },

            /**
             * Restart the validator (stop → delay → start) and wait until healthy.
             *
             * Respects `manageExternal` the same as `stopValidator()`.
             *
             * @param options - Restart options (start options + optional delay).
             * @returns The PID and RPC URL of the started validator.
             */
            async restartValidator(options?: RestartValidatorOptions): Promise<StartValidatorResult> {
                const { delayMs = 500, ...startOpts } = options ?? {};

                manager.stopValidator();

                if (delayMs > 0) {
                    await new Promise<void>(resolve => setTimeout(resolve, delayMs));
                }

                return await manager.startValidator({ ...startOpts, stopIfRunning: true });
            },

            /**
             * Start the validator and wait until healthy.
             *
             * @param options - Start options that override plugin-level config.
             * @returns The PID and RPC URL of the started validator.
             *
             * @throws {ValidatorBinaryNotFoundError} if solana-test-validator not found
             * @throws {ValidatorAlreadyRunningError} if already running and !stopIfRunning
             * @throws {ValidatorStartError} if fails to start or become ready within timeout
             */
            async startValidator(options?: StartValidatorOptions): Promise<StartValidatorResult> {
                return await manager.startValidator(options);
            },

            /**
             * Stop the validator.
             *
             * Behavior:
             * - If validator not running: no-op (silent success)
             * - If manageExternal=false and validator was started externally: no-op
             *
             * @throws {ValidatorStopError} if stop fails due to permissions
             */
            stopValidator(): void {
                manager.stopValidator();
            },

            /**
             * Wait for the validator to become healthy.
             *
             * Useful when:
             * - Managing externally-started validators
             * - Custom startup flows where you don't use startValidator()
             *
             * @param timeoutMs - Max time to wait (default: plugin config readyTimeoutMs)
             */
            async waitForValidatorReady(timeoutMs?: number): Promise<ValidatorHealthResult> {
                return await manager.waitForValidatorReady(timeoutMs);
            },
        };
    };
}
