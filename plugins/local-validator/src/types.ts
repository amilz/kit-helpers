/** Configuration for validator lifecycle management. */
export type LocalValidatorPluginConfig = {
    /**
     * Custom binary name for solana-test-validator.
     * Useful if you have an alias or custom installation.
     * @default 'solana-test-validator'
     */
    binaryName?: string;

    /**
     * Interval in milliseconds between health checks.
     * @default 500
     */
    healthCheckIntervalMs?: number;

    /**
     * Path to ledger directory.
     * @default '.test-ledger' in cwd
     */
    ledgerPath?: string;

    /**
     * Whether to manage externally-started validators.
     * When false (default), plugin only manages validators it starts.
     * When true, isValidatorRunning/stopValidator work on any running validator.
     * @default false
     */
    manageExternal?: boolean;

    /**
     * Path to PID file.
     * @default '.solana-test-validator.pid' in cwd
     */
    pidFile?: string;

    /**
     * Timeout in milliseconds to wait for validator readiness.
     * @default 30000
     */
    readyTimeoutMs?: number;

    /**
     * URL where validator RPC is accessible.
     * @default 'http://127.0.0.1:8899'
     */
    rpcUrl?: string;

    /**
     * Whether to suppress console output.
     * When false (default), logs start/stop messages to console.
     * @default false
     */
    silent?: boolean;
};

/** Options for starting the validator. */
export type StartValidatorOptions = {
    /**
     * Additional CLI arguments to pass to solana-test-validator.
     * @example ['--account', 'path.json', '--bpf-program', '...']
     */
    extraArgs?: string[];

    /**
     * Path to file where validator logs should be written.
     * If not provided, logs are discarded.
     */
    logFile?: string;

    /**
     * Override default ready timeout for this start operation.
     */
    readyTimeoutMs?: number;

    /**
     * Whether to reset the ledger (--reset flag).
     * @default true
     */
    reset?: boolean;

    /**
     * If true, stops any running validator before starting.
     * If false, throws if validator already running.
     * @default false
     */
    stopIfRunning?: boolean;
};

/** Options for restarting the validator. */
export type RestartValidatorOptions = Omit<StartValidatorOptions, 'stopIfRunning'> & {
    /**
     * Delay in milliseconds between stopping and starting.
     * Useful to allow port release and process cleanup.
     * @default 500
     */
    delayMs?: number;
};

/** Result from starting validator. */
export type StartValidatorResult = {
    /** Process ID of started validator. */
    pid: number;
    /** RPC URL the validator is listening on. */
    rpcUrl: string;
};

/** Result from checking validator health. */
export type ValidatorHealthResult = {
    /** Error message if not ready. */
    error?: string;
    /** Whether the validator is healthy and ready. */
    ready: boolean;
};

/** Error thrown when validator binary is missing. */
export class ValidatorBinaryNotFoundError extends Error {
    override name = 'ValidatorBinaryNotFoundError' as const;

    constructor(binaryName: string, options?: ErrorOptions) {
        super(
            `${binaryName} not found. Install Solana CLI tools: https://solana.com/developers/guides/getstarted/setup-local-development`,
            options,
        );
    }
}

/** Error thrown when validator is already running. */
export class ValidatorAlreadyRunningError extends Error {
    override name = 'ValidatorAlreadyRunningError' as const;

    constructor(options?: ErrorOptions) {
        super('Validator is already running. Use stopIfRunning: true to restart.', options);
    }
}

/** Error thrown when validator fails to start or become ready. */
export class ValidatorStartError extends Error {
    override name = 'ValidatorStartError' as const;

    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** Error thrown when validator operations fail. */
export class ValidatorStopError extends Error {
    override name = 'ValidatorStopError' as const;

    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
