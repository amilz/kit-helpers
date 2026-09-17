import type {
    AccountNotificationsApi,
    Address,
    Commitment,
    FullySignedTransaction,
    GetAccountInfoApi,
    GetEpochInfoApi,
    GetLatestBlockhashApi,
    GetSignatureStatusesApi,
    Instruction,
    InstructionPlan,
    Nonce,
    Rpc,
    RpcSubscriptions,
    SendableTransaction,
    SendTransactionApi,
    SignatureNotificationsApi,
    SimulateTransactionApi,
    SlotNotificationsApi,
    Transaction,
    TransactionMessage,
    TransactionMessageWithBlockhashLifetime,
    TransactionMessageWithDurableNonceLifetime,
    TransactionMessageWithFeePayerSigner,
    TransactionMessageWithSigners,
    TransactionSigner,
    TransactionVersion,
    TransactionWithLifetime,
} from '@solana/kit';

/** Configuration for using a durable nonce in a transaction. */
export type NonceConfig = {
    /** The current nonce value from the nonce account. */
    nonce: Nonce;
    /** The address of the nonce account. */
    nonceAccountAddress: Address;
    /** The address authorized to advance the nonce (must be fee payer for v1). */
    nonceAuthorityAddress: Address;
};

/** The type of a transaction message that can be signed and sent. */
export type SignableTransactionMessage = TransactionMessage &
    TransactionMessageWithFeePayerSigner &
    TransactionMessageWithSigners &
    (TransactionMessageWithBlockhashLifetime | TransactionMessageWithDurableNonceLifetime);

/** The type of a signed transaction ready to be sent. */
export type SignedTransaction = SendableTransaction & Transaction & TransactionWithLifetime;

/** The RPC methods required for the transaction builder. */
export type TransactionBuilderRpc = Rpc<
    GetAccountInfoApi &
        GetEpochInfoApi &
        GetLatestBlockhashApi &
        GetSignatureStatusesApi &
        SendTransactionApi &
        SimulateTransactionApi
>;

/** The RPC subscriptions required for sendAndConfirm. */
export type TransactionBuilderRpcSubscriptions = RpcSubscriptions<
    AccountNotificationsApi & SignatureNotificationsApi & SlotNotificationsApi
>;

/**
 * The transaction versions the builder can produce. Default: 1.
 *
 * Version 1 carries its resource limits and priority fee in the message config
 * and allows up to 4096 bytes, but requires the `txv1` feature gate and cannot
 * use address lookup tables.
 */
export type BuilderTransactionVersion = Extract<TransactionVersion, 0 | 1>;

/** Options for customizing transaction builder defaults. */
export type TransactionBuilderOptions = {
    /**
     * Enable or disable auto-estimation of compute units.
     * When enabled, CUs are estimated via simulation during prepare().
     * Default: true (enabled).
     */
    autoEstimateCus?: boolean;
    /**
     * Safety margin for CU estimation.
     * The estimated CUs are multiplied by (1 + margin).
     * Default: 0.1 (10% buffer).
     */
    estimateMargin?: number;
    /**
     * Minimum priority fee in microLamports per compute unit.
     * Applied when no explicit setPriorityFee() is called.
     * Default: 0n (no priority fee).
     * Version 0 only.
     */
    minPriorityFee?: bigint;
    /**
     * Minimum total priority fee in lamports.
     * Applied when no explicit setPriorityFeeLamports() is called.
     * Default: 0n (no priority fee).
     * Version 1 only.
     */
    minPriorityFeeLamports?: bigint;
    /**
     * The transaction version to build.
     * Default: 1.
     */
    version?: BuilderTransactionVersion;
};

/** Client requirements for the transaction builder. */
export type TransactionBuilderClientRequirements = {
    payer: TransactionSigner;
    rpc: TransactionBuilderRpc;
    rpcSubscriptions?: TransactionBuilderRpcSubscriptions;
};

/** Options for sending a transaction. */
export type SendOptions = {
    /** Abort signal to cancel the operation. */
    abortSignal?: AbortSignal;
    /** Commitment level for confirmation. */
    commitment?: Commitment;
    /** Skip preflight transaction checks. */
    skipPreflight?: boolean;
};

/** Result from simulating a transaction. */
export type SimulateResult = {
    /** Error message if simulation failed. */
    error: string | null;
    /** Logs from the simulation. */
    logs: readonly string[] | null;
    /** Return data from the simulation. */
    returnData: {
        data: string;
        programId: string;
    } | null;
    /** Number of compute units consumed. */
    unitsConsumed: bigint | null;
};

/** Building state - can add instructions and prepare. */
export type TransactionBuilderBuilding = {
    /** @internal */
    _state(): BuilderState;

    /**
     * Add a single instruction to the transaction.
     * @param instruction - The instruction to add.
     */
    add(instruction: Instruction): TransactionBuilderBuilding;

    /**
     * Add multiple instructions to the transaction.
     * @param instructions - The instructions to add.
     */
    addMany(instructions: Instruction[]): TransactionBuilderBuilding;

    /**
     * Add the instructions from an instruction plan to the transaction.
     * @param plan - The instruction plan to add.
     */
    addPlan(plan: InstructionPlan): TransactionBuilderBuilding;

    /**
     * Enable or disable auto-estimation of compute units.
     * When enabled, CUs are estimated via simulation during prepare().
     * Default: true (enabled).
     * @param enabled - Whether to auto-estimate CUs.
     */
    autoEstimateCus(enabled: boolean): TransactionBuilderBuilding;

    /**
     * Execute the transaction in one call: prepare, sign, send, and confirm.
     * Automatically estimates compute units via simulation.
     * Requires rpcSubscriptions on the client.
     * @param options - Optional send options.
     * @returns The transaction signature.
     */
    execute(options?: SendOptions): Promise<string>;

    /**
     * Prepare the transaction for signing by fetching the latest blockhash unless a durable nonce is used.
     * @param config - Optional configuration.
     */
    prepare(config?: { abortSignal?: AbortSignal }): Promise<TransactionBuilderPrepared>;

    /**
     * Set the compute unit limit for the transaction.
     * @param units - The compute unit limit.
     */
    setComputeLimit(units: number): TransactionBuilderBuilding;

    /**
     * Set the maximum size in bytes of account data the transaction may load.
     * Version 1 only. Estimated via simulation when unset and auto-estimation is on.
     * @param bytes - The loaded accounts data size limit in bytes.
     */
    setLoadedAccountsDataSizeLimit(bytes: number): TransactionBuilderBuilding;

    /**
     * Set the safety margin for CU estimation.
     * The estimated CUs are multiplied by (1 + margin).
     * Default: 0.1 (10% buffer).
     * @param margin - The margin as a decimal (e.g., 0.1 for 10%).
     */
    setEstimateMargin(margin: number): TransactionBuilderBuilding;

    /**
     * Set the priority fee for the transaction in microLamports per compute unit.
     * Version 0 only; use setPriorityFeeLamports() on version 1.
     * @param microLamports - The priority fee in microLamports.
     */
    setPriorityFee(microLamports: bigint): TransactionBuilderBuilding;

    /**
     * Set the total priority fee for the transaction in lamports.
     * Version 1 only; use setPriorityFee() on version 0.
     * @param lamports - The total priority fee in lamports.
     */
    setPriorityFeeLamports(lamports: bigint): TransactionBuilderBuilding;

    /**
     * Use a durable nonce for transaction lifetime instead of a recent blockhash.
     * When set, prepare() will not fetch a blockhash and will use the provided nonce.
     * Note: The nonce authority must be the fee payer in this version.
     * @param config - The nonce configuration.
     */
    useNonce(config: NonceConfig): TransactionBuilderBuilding;
};

/** Prepared state - can simulate or sign. */
export type TransactionBuilderPrepared = {
    /**
     * Get the compiled transaction message.
     */
    getMessage(): SignableTransactionMessage;

    /**
     * Sign the transaction with all signers.
     * @param config - Optional configuration.
     */
    sign(config?: { abortSignal?: AbortSignal }): Promise<TransactionBuilderSigned>;

    /**
     * Simulate the transaction without sending.
     * @param config - Optional configuration.
     * @param config.abortSignal - Signal to abort the operation.
     * @param config.throwOnError - If true, throws an error when simulation fails.
     */
    simulate(config?: { abortSignal?: AbortSignal; throwOnError?: boolean }): Promise<SimulateResult>;
};

/** Signed state - can send or get the transaction. */
export type TransactionBuilderSigned = {
    /**
     * Get the signed transaction.
     */
    getTransaction(): FullySignedTransaction;

    /**
     * Send the transaction without waiting for confirmation.
     * @param options - Optional send options.
     */
    send(options?: SendOptions): Promise<string>;

    /**
     * Send the transaction and wait for confirmation.
     * @param options - Optional send options.
     */
    sendAndConfirm(options?: SendOptions): Promise<string>;
};

/** @internal */
export type BuilderState = {
    autoEstimateCus: boolean;
    client: TransactionBuilderClientRequirements;
    computeUnitLimit?: number;
    computeUnitPrice?: bigint;
    estimateMargin: number;
    instructions: Instruction[];
    loadedAccountsDataSizeLimit?: number;
    nonceConfig?: NonceConfig;
    priorityFeeLamports?: bigint;
    version: BuilderTransactionVersion;
};
