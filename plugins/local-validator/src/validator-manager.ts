import { type ChildProcess, spawn } from 'node:child_process';
import { createWriteStream, readFileSync, unlinkSync, writeFileSync, type WriteStream } from 'node:fs';
import { join } from 'node:path';

import { createSolanaRpc } from '@solana/kit';

import type {
    LocalValidatorPluginConfig,
    StartValidatorOptions,
    StartValidatorResult,
    ValidatorHealthResult,
    WarpToSlotOptions,
    WarpToSlotResult,
} from './types.js';
import {
    ValidatorAlreadyRunningError,
    ValidatorBinaryNotFoundError,
    ValidatorStartError,
    ValidatorStopError,
    ValidatorWarpError,
} from './types.js';

const DEFAULT_RPC_URL = 'http://127.0.0.1:8899';
const DEFAULT_LEDGER_PATH = '.test-ledger';
const DEFAULT_READY_TIMEOUT_MS = 30_000;
const DEFAULT_HEALTH_CHECK_INTERVAL_MS = 500;
const DEFAULT_BINARY_NAME = 'solana-test-validator';
const DEFAULT_PID_FILE = '.solana-test-validator.pid';

// Exclude startValidator from manager config - it's only used by the plugin wrapper
type ResolvedConfig = Required<Omit<LocalValidatorPluginConfig, 'startValidator'>>;

/**
 * Manages local validator lifecycle.
 */
export class ValidatorManager {
    private readonly config: ResolvedConfig;
    private readonly pidFilePath: string;
    private startedByThisInstance = false;

    constructor(options: LocalValidatorPluginConfig = {}) {
        this.pidFilePath = options.pidFile ?? join(process.cwd(), DEFAULT_PID_FILE);
        this.config = {
            binaryName: options.binaryName ?? DEFAULT_BINARY_NAME,
            healthCheckIntervalMs: options.healthCheckIntervalMs ?? DEFAULT_HEALTH_CHECK_INTERVAL_MS,
            ledgerPath: options.ledgerPath ?? join(process.cwd(), DEFAULT_LEDGER_PATH),
            manageExternal: options.manageExternal ?? false,
            pidFile: this.pidFilePath,
            readyTimeoutMs: options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS,
            rpcUrl: options.rpcUrl ?? DEFAULT_RPC_URL,
            silent: options.silent ?? false,
        };
    }

    /**
     * Check if a validator is running.
     */
    isValidatorRunning(): boolean {
        const pid = this.readPidFile();
        if (pid === null) {
            return false;
        }

        const running = this.isProcessRunning(pid);

        if (!this.config.manageExternal && !this.startedByThisInstance) {
            return false;
        }

        return running;
    }

    /**
     * Start the validator and wait until healthy.
     */
    async startValidator(options: StartValidatorOptions = {}): Promise<StartValidatorResult> {
        const opts = {
            extraArgs: options.extraArgs ?? [],
            logFile: options.logFile,
            readyTimeoutMs: options.readyTimeoutMs ?? this.config.readyTimeoutMs,
            reset: options.reset ?? true,
            stopIfRunning: options.stopIfRunning ?? false,
        };

        const existingPid = this.readPidFile();
        const isRunning = existingPid !== null && this.isProcessRunning(existingPid);

        if (isRunning) {
            if (!opts.stopIfRunning) {
                throw new ValidatorAlreadyRunningError();
            }
            this.stopValidatorSync();
            await this.sleep(500);
        }

        const args = ['-q', '-l', this.config.ledgerPath];
        if (opts.reset) args.push('-r');
        args.push(...opts.extraArgs);

        this.log('Starting local validator...');

        const { pid } = await this.spawnAndWaitForReady(args, opts.readyTimeoutMs, opts.logFile, 'start');

        this.log(`Validator ready! (PID: ${pid}, RPC: ${this.config.rpcUrl})`);

        return { pid, rpcUrl: this.config.rpcUrl };
    }

    /**
     * Stop the validator.
     */
    stopValidator(): void {
        this.stopValidatorSync();
    }

    /**
     * Warp the validator to a specific slot.
     *
     * This stops the current validator and restarts it with the -w (warp) flag,
     * preserving the existing ledger (no reset).
     *
     * @param slot - The slot number to warp to. Must be >= current slot.
     * @param options - Options for the warp operation.
     * @returns The PID, RPC URL, and actual slot of the warped validator.
     *
     * @throws {ValidatorWarpError} if slot is not a valid non-negative integer
     * @throws {ValidatorWarpError} if validator is not running
     * @throws {ValidatorWarpError} if validator cannot be stopped (started externally with manageExternal=false)
     * @throws {ValidatorWarpError} if slot is less than current slot
     * @throws {ValidatorWarpError} if validator restarted but did not reach target slot
     * @throws {ValidatorStartError} if validator fails to restart
     */
    async warpToSlot(slot: number, options: WarpToSlotOptions = {}): Promise<WarpToSlotResult> {
        // Validate slot input
        if (!Number.isInteger(slot) || slot < 0) {
            throw new ValidatorWarpError(`Invalid slot: ${slot}. Slot must be a non-negative integer.`);
        }

        const opts = {
            extraArgs: options.extraArgs ?? [],
            logFile: options.logFile,
            readyTimeoutMs: options.readyTimeoutMs ?? this.config.readyTimeoutMs,
        };

        // Verify validator is running
        if (!this.isValidatorRunning()) {
            throw new ValidatorWarpError('Cannot warp: validator is not running. Start the validator first.');
        }

        // Verify we can actually stop the validator
        if (!this.canStopValidator()) {
            throw new ValidatorWarpError(
                'Cannot warp: validator was not started by this instance and manageExternal is false. ' +
                    'Either set manageExternal: true or stop the external validator manually.',
            );
        }

        // Get current slot and validate
        const currentSlot = await this.getCurrentSlot();
        if (slot < currentSlot) {
            throw new ValidatorWarpError(
                `Cannot warp to slot ${slot}: current slot is ${currentSlot}. Warp slot must be >= current slot.`,
            );
        }

        this.log(`Warping validator to slot ${slot}...`);

        // Stop the current validator
        this.stopValidatorSync();
        await this.sleep(500);

        // Build args: no -r (preserve ledger), add -w (warp)
        const args = ['-q', '-l', this.config.ledgerPath, '-w', String(slot)];
        args.push(...opts.extraArgs);

        let pid: number;
        try {
            const result = await this.spawnAndWaitForReady(args, opts.readyTimeoutMs, opts.logFile, 'warp');
            pid = result.pid;
        } catch (err) {
            // Provide better context when warp fails - validator is now stopped
            if (err instanceof ValidatorStartError) {
                throw new ValidatorWarpError(
                    `Warp to slot ${slot} failed and validator is now stopped. ` +
                        `Error: ${err.message}. You must manually restart the validator using startValidator().`,
                    { cause: err },
                );
            }
            throw err;
        }

        // Verify the warp was successful by checking actual slot
        const actualSlot = await this.getCurrentSlot();
        if (actualSlot < slot) {
            throw new ValidatorWarpError(
                `Warp appeared to succeed but validator is at slot ${actualSlot}, expected >= ${slot}. ` +
                    `The ledger may have been corrupted or the warp flag may not be supported by this validator version.`,
            );
        }

        this.log(`Validator warped to slot ${actualSlot}! (PID: ${pid}, RPC: ${this.config.rpcUrl})`);

        return { pid, rpcUrl: this.config.rpcUrl, slot: actualSlot };
    }

    /**
     * Get the current slot from the validator.
     *
     * @throws {ValidatorWarpError} if validator is not responding or RPC call fails
     */
    async getCurrentSlot(): Promise<number> {
        const rpc = createSolanaRpc(this.config.rpcUrl);
        try {
            const response = await rpc.getSlot().send();
            return Number(response);
        } catch (err) {
            if (err instanceof Error) {
                const code = 'code' in err ? (err as NodeJS.ErrnoException).code : undefined;
                if (code === 'ECONNREFUSED') {
                    throw new ValidatorWarpError(
                        'Cannot get current slot: validator is not responding. Ensure the validator is running.',
                        { cause: err },
                    );
                }
                if (code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
                    throw new ValidatorWarpError(
                        `Cannot get current slot: network error (${code}). Check RPC URL: ${this.config.rpcUrl}`,
                        { cause: err },
                    );
                }
            }
            throw new ValidatorWarpError(
                `Failed to get current slot: ${err instanceof Error ? err.message : String(err)}`,
                { cause: err },
            );
        }
    }

    /**
     * Wait for validator to become healthy.
     */
    async waitForValidatorReady(timeoutMs?: number): Promise<ValidatorHealthResult> {
        const timeout = timeoutMs ?? this.config.readyTimeoutMs;
        const interval = this.config.healthCheckIntervalMs;
        const start = Date.now();
        let lastError: string | undefined;

        while (Date.now() - start < timeout) {
            try {
                const response = await fetch(this.config.rpcUrl, {
                    body: JSON.stringify({
                        id: 1,
                        jsonrpc: '2.0',
                        method: 'getHealth',
                    }),
                    headers: { 'Content-Type': 'application/json' },
                    method: 'POST',
                });

                if (!response.ok) {
                    lastError = `HTTP ${response.status}`;
                } else {
                    const data = (await response.json()) as { error?: unknown; result?: string };
                    if (data.result === 'ok') {
                        return { ready: true };
                    }
                    if (data.error) {
                        lastError = `RPC error: ${JSON.stringify(data.error)}`;
                    }
                }
            } catch (err) {
                if (err instanceof Error) {
                    const code = 'code' in err ? (err as NodeJS.ErrnoException).code : undefined;
                    if (code === 'ECONNREFUSED') {
                        lastError = 'Connection refused (validator starting...)';
                    } else {
                        lastError = err.message;
                    }
                } else {
                    lastError = String(err);
                }
            }

            await this.sleep(interval);
        }

        return { error: lastError, ready: false };
    }

    /**
     * Get current configuration.
     */
    getConfig(): Readonly<ResolvedConfig> {
        return { ...this.config };
    }

    // --- Private: Process management ---

    private spawnValidator(binaryName: string, args: string[], logFile?: string): ChildProcess {
        let logStream: WriteStream | undefined;

        const child = spawn(binaryName, args, {
            detached: true,
            stdio: logFile ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'ignore', 'ignore'],
        });

        if (logFile && child.stdout && child.stderr) {
            logStream = createWriteStream(logFile, { flags: 'a' });
            child.stdout.pipe(logStream);
            child.stderr.pipe(logStream);
        }

        const cleanupLogStream = () => {
            if (logStream) {
                logStream.end();
                logStream = undefined;
            }
        };

        child.on('error', (err: NodeJS.ErrnoException) => {
            cleanupLogStream();
            if (err.code === 'ENOENT') {
                child.emit('spawn-error', new ValidatorBinaryNotFoundError(binaryName, { cause: err }));
            } else {
                child.emit('spawn-error', err);
            }
        });

        child.on('exit', cleanupLogStream);
        child.unref();

        return child;
    }

    private killProcess(pid: number): { error?: string; killed: boolean } {
        // Try killing process group first (preferred for detached processes)
        try {
            process.kill(-pid, 'SIGTERM');
            return { killed: true };
        } catch (err) {
            const code = this.getErrorCode(err);
            if (code === 'EPERM') {
                return { error: `Permission denied killing process group ${pid}`, killed: false };
            }
        }

        // Fall back to killing individual process
        try {
            process.kill(pid, 'SIGTERM');
            return { killed: true };
        } catch (err) {
            const code = this.getErrorCode(err);
            if (code === 'ESRCH') {
                return { killed: true };
            }
            if (code === 'EPERM') {
                return { error: `Permission denied killing process ${pid}`, killed: false };
            }
            return { error: `Failed to kill process: ${code || String(err)}`, killed: false };
        }
    }

    private isProcessRunning(pid: number): boolean {
        try {
            process.kill(pid, 0);
            return true;
        } catch (err) {
            const code = this.getErrorCode(err);
            if (code === 'EPERM') {
                return true;
            }
            return false;
        }
    }

    private getErrorCode(err: unknown): string | undefined {
        if (err instanceof Error && 'code' in err) {
            return (err as NodeJS.ErrnoException).code;
        }
        return undefined;
    }

    // --- Private: PID file management ---

    private readPidFile(): number | null {
        try {
            const content = readFileSync(this.pidFilePath, 'utf-8').trim();
            const pid = parseInt(content, 10);
            return isNaN(pid) ? null : pid;
        } catch (err) {
            const code = this.getErrorCode(err);
            if (code === 'ENOENT') {
                // File doesn't exist - this is expected
                return null;
            }
            // Log unexpected errors - these indicate real problems
            this.log(`Warning: Failed to read PID file: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }

    private writePidFile(pid: number): void {
        writeFileSync(this.pidFilePath, String(pid), 'utf-8');
    }

    private removePidFile(): void {
        try {
            unlinkSync(this.pidFilePath);
        } catch (err) {
            const code = this.getErrorCode(err);
            if (code === 'ENOENT') {
                // File doesn't exist - this is expected
                return;
            }
            // Log unexpected errors - stale PID file may cause issues
            this.log(`Warning: Failed to remove PID file: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    // --- Private: Helpers ---

    private waitForSpawnResult(child: ChildProcess, timeoutMs: number): Promise<{ error?: Error; exitCode?: number }> {
        return new Promise(resolve => {
            let resolved = false;

            const cleanup = () => {
                child.removeListener('spawn-error', onError);
                child.removeListener('exit', onExit);
            };

            const onError = (err: Error) => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve({ error: err });
                }
            };

            const onExit = (code: number | null) => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve({ exitCode: code ?? 1 });
                }
            };

            child.once('spawn-error', onError);
            child.once('exit', onExit);

            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve({});
                }
            }, timeoutMs);
        });
    }

    private cleanupFailedStart(): void {
        this.removePidFile();
        this.startedByThisInstance = false;
    }

    /**
     * Common spawn and wait-for-ready logic shared by startValidator and warpToSlot.
     */
    private async spawnAndWaitForReady(
        args: string[],
        readyTimeoutMs: number,
        logFile?: string,
        operationName: string = 'start',
    ): Promise<{ pid: number }> {
        const child = this.spawnValidator(this.config.binaryName, args, logFile);

        const spawnResult = await this.waitForSpawnResult(child, 300);

        if (spawnResult.error) {
            if (spawnResult.error instanceof ValidatorBinaryNotFoundError) {
                throw spawnResult.error;
            }
            throw new ValidatorStartError(
                `Failed to spawn validator for ${operationName}: ${spawnResult.error.message}`,
                {
                    cause: spawnResult.error,
                },
            );
        }

        if (spawnResult.exitCode !== undefined) {
            throw new ValidatorStartError(
                `Validator exited immediately with code ${spawnResult.exitCode} during ${operationName}. Check if port 8899 is already in use.`,
            );
        }

        if (!child.pid) {
            throw new ValidatorStartError(`Failed to ${operationName} validator: no PID assigned`);
        }

        const pid = child.pid;
        this.writePidFile(pid);
        this.startedByThisInstance = true;

        let earlyExit: { code: number | null; signal: string | null } | undefined;
        const exitHandler = (code: number | null, signal: string | null) => {
            earlyExit = { code, signal };
        };
        child.once('exit', exitHandler);

        try {
            const result = await this.waitForValidatorReady(readyTimeoutMs);

            if (earlyExit) {
                throw new ValidatorStartError(
                    `Validator crashed during ${operationName} (exit code: ${earlyExit.code}, signal: ${earlyExit.signal})`,
                );
            }

            if (!result.ready) {
                throw new ValidatorStartError(
                    `Validator failed to become ready during ${operationName} within ${readyTimeoutMs}ms: ${result.error ?? 'timeout'}`,
                );
            }

            return { pid };
        } catch (err) {
            child.removeListener('exit', exitHandler);
            this.cleanupFailedStart();
            throw err;
        } finally {
            child.removeListener('exit', exitHandler);
        }
    }

    /**
     * Check if we can stop the validator (based on manageExternal and startedByThisInstance).
     */
    private canStopValidator(): boolean {
        return this.config.manageExternal || this.startedByThisInstance;
    }

    private stopValidatorSync(): void {
        if (!this.canStopValidator()) {
            return;
        }

        const pid = this.readPidFile();
        if (pid === null) {
            return;
        }

        if (!this.isProcessRunning(pid)) {
            this.removePidFile();
            this.startedByThisInstance = false;
            return;
        }

        this.log('Stopping validator...');

        const result = this.killProcess(pid);
        if (!result.killed) {
            throw new ValidatorStopError(`Failed to stop validator: ${result.error}`);
        }

        this.removePidFile();
        this.startedByThisInstance = false;

        this.log('Validator stopped.');
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private log(message: string): void {
        if (!this.config.silent) {
            console.log(message);
        }
    }
}
