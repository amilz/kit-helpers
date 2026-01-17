import { type ChildProcess, spawn } from 'node:child_process';
import { createWriteStream, readFileSync, unlinkSync, writeFileSync, type WriteStream } from 'node:fs';
import { join } from 'node:path';

import type {
    LocalValidatorPluginConfig,
    StartValidatorOptions,
    StartValidatorResult,
    ValidatorHealthResult,
} from './types.js';
import {
    ValidatorAlreadyRunningError,
    ValidatorBinaryNotFoundError,
    ValidatorStartError,
    ValidatorStopError,
} from './types.js';

const DEFAULT_RPC_URL = 'http://127.0.0.1:8899';
const DEFAULT_LEDGER_PATH = '.test-ledger';
const DEFAULT_READY_TIMEOUT_MS = 30_000;
const DEFAULT_HEALTH_CHECK_INTERVAL_MS = 500;
const DEFAULT_BINARY_NAME = 'solana-test-validator';
const DEFAULT_PID_FILE = '.solana-test-validator.pid';

type ResolvedConfig = Required<LocalValidatorPluginConfig>;

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

        const child = this.spawnValidator(this.config.binaryName, args, opts.logFile);

        const spawnResult = await this.waitForSpawnResult(child, 300);

        if (spawnResult.error) {
            if (spawnResult.error instanceof ValidatorBinaryNotFoundError) {
                throw spawnResult.error;
            }
            throw new ValidatorStartError(`Failed to spawn validator: ${spawnResult.error.message}`, {
                cause: spawnResult.error,
            });
        }

        if (spawnResult.exitCode !== undefined) {
            throw new ValidatorStartError(
                `Validator exited immediately with code ${spawnResult.exitCode}. Check if port 8899 is already in use.`,
            );
        }

        if (!child.pid) {
            throw new ValidatorStartError('Failed to start validator: no PID assigned');
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
            const result = await this.waitForValidatorReady(opts.readyTimeoutMs);

            if (earlyExit) {
                throw new ValidatorStartError(
                    `Validator crashed during startup (exit code: ${earlyExit.code}, signal: ${earlyExit.signal})`,
                );
            }

            if (!result.ready) {
                throw new ValidatorStartError(
                    `Validator failed to become ready within ${opts.readyTimeoutMs}ms: ${result.error ?? 'timeout'}`,
                );
            }

            this.log(`Validator ready! (PID: ${pid}, RPC: ${this.config.rpcUrl})`);

            return { pid, rpcUrl: this.config.rpcUrl };
        } catch (err) {
            child.removeListener('exit', exitHandler);
            this.cleanupFailedStart();
            throw err;
        } finally {
            child.removeListener('exit', exitHandler);
        }
    }

    /**
     * Stop the validator.
     */
    stopValidator(): void {
        this.stopValidatorSync();
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
        } catch {
            return null;
        }
    }

    private writePidFile(pid: number): void {
        writeFileSync(this.pidFilePath, String(pid), 'utf-8');
    }

    private removePidFile(): void {
        try {
            unlinkSync(this.pidFilePath);
        } catch {
            // File doesn't exist
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

    private stopValidatorSync(): void {
        if (!this.config.manageExternal && !this.startedByThisInstance) {
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
