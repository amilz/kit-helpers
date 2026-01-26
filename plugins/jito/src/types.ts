import type {
    Address,
    Base64EncodedWireTransaction,
    Commitment,
    Signature,
    Slot,
    TransactionSigner,
} from '@solana/kit';

/** Configuration for the Jito plugin. */
export type JitoPluginConfig = {
    /** Jito Block Engine endpoint URL (required). */
    endpoint: string;
    /** Optional UUID for authentication (increases rate limits). */
    uuid?: string;
};

/** Client requirements for the Jito plugin. */
export type JitoClientRequirements = {
    payer: TransactionSigner;
};

/** A bundle of transactions to submit to Jito. */
export type Bundle = readonly Base64EncodedWireTransaction[];

/** Status of a landed bundle from getBundleStatuses. */
export type BundleStatus = {
    /** The bundle ID. */
    bundle_id: string;
    /** Confirmation status. */
    confirmation_status: Commitment;
    /** Error if any. */
    err: { Err: unknown } | { Ok: null };
    /** Slot where the bundle landed. */
    slot: Slot;
    /** Transaction signatures in the bundle. */
    transactions: readonly Signature[];
};

/** Status of an in-flight bundle from getInflightBundleStatuses. */
export type InflightBundleStatus = {
    /** The bundle ID. */
    bundle_id: string;
    /** Slot where landed (if status is Landed). */
    landed_slot?: Slot;
    /** Current status. */
    status: 'Failed' | 'Invalid' | 'Landed' | 'Pending';
};

/** Result from simulating a bundle. */
export type SimulateBundleResult = {
    /** Summary status. */
    summary: 'failed' | 'succeeded';
    /** Per-transaction results. */
    transactionResults: readonly SimulateTransactionResult[];
};

/** Result for a single transaction in bundle simulation. */
export type SimulateTransactionResult = {
    /** Error message if failed. */
    err: string | null;
    /** Execution logs. */
    logs: readonly string[] | null;
    /** Post-simulation balances. */
    postExecutionAccounts:
        | readonly {
              data: readonly string[];
              executable: boolean;
              lamports: bigint;
              owner: string;
              rentEpoch: bigint;
          }[]
        | null;
    /** Return data. */
    returnData: { data: readonly string[]; programId: string } | null;
    /** Compute units consumed. */
    unitsConsumed: bigint | null;
};

/** Options for sending a transaction via Jito. */
export type SendTransactionOptions = {
    /** Transaction encoding (default: base64). */
    encoding?: 'base58' | 'base64';
    /** Skip preflight checks. */
    skipPreflight?: boolean;
};

/** Options for simulating a bundle. */
export type SimulateBundleOptions = {
    /** Whether to replace recent blockhash. */
    replaceRecentBlockhash?: boolean;
    /** Simulation bank commitment level. */
    simulationBank?: Commitment;
    /** Whether to skip sig verification. */
    skipSigVerify?: boolean;
};

/** The Jito namespace exposed on the client. */
export type JitoApi = {
    /**
     * Create a new bundle builder for fluent bundle construction.
     * @returns A new BundleBuilder instance.
     */
    createBundle(): BundleBuilder;

    /**
     * Get the status of landed bundles.
     * @param bundleIds - Array of bundle IDs to check (max 5).
     * @returns Array of bundle statuses.
     */
    getBundleStatuses(bundleIds: readonly string[]): Promise<readonly BundleStatus[]>;

    /**
     * Get the status of in-flight bundles (submitted in last 5 minutes).
     * @param bundleIds - Array of bundle IDs to check (max 5).
     * @returns Array of in-flight bundle statuses.
     */
    getInflightBundleStatuses(bundleIds: readonly string[]): Promise<readonly InflightBundleStatus[]>;

    /**
     * Get a random tip account from the available accounts.
     * @returns A randomly selected tip account address.
     */
    getRandomTipAccount(): Promise<Address>;

    /**
     * Get the list of Jito tip accounts.
     * @returns Array of 8 tip account addresses.
     */
    getTipAccounts(): Promise<Address[]>;

    /**
     * Send a bundle of transactions to Jito.
     * @param bundle - Array of base64 encoded transactions (max 5).
     * @returns The bundle ID.
     */
    sendBundle(bundle: Bundle): Promise<string>;

    /**
     * Send a single transaction via Jito for MEV protection.
     * @param transaction - Base58 or base64 encoded transaction.
     * @param options - Optional send options.
     * @returns The transaction signature.
     */
    sendTransaction(transaction: string, options?: SendTransactionOptions): Promise<Signature>;

    /**
     * Simulate a bundle without submitting.
     * @param bundle - Array of base64 encoded transactions.
     * @param options - Optional simulation options.
     * @returns Simulation results for each transaction.
     */
    simulateBundle(bundle: Bundle, options?: SimulateBundleOptions): Promise<SimulateBundleResult>;
};

/** Fluent builder for constructing Jito bundles. */
export type BundleBuilder = {
    /**
     * Add a base64 encoded transaction to the bundle.
     * @param transaction - Base64 encoded wire transaction.
     */
    add(transaction: Base64EncodedWireTransaction): BundleBuilder;

    /**
     * Add multiple transactions to the bundle.
     * @param transactions - Array of base64 encoded wire transactions.
     */
    addMany(transactions: readonly Base64EncodedWireTransaction[]): BundleBuilder;

    /**
     * Get the current bundle as an array of transactions.
     */
    getBundle(): Bundle;

    /**
     * Send the bundle to Jito.
     * @returns The bundle ID.
     * @throws If bundle is empty or exceeds 5 transactions.
     */
    send(): Promise<string>;

    /**
     * Simulate the bundle without submitting.
     * @param options - Optional simulation options.
     * @returns Simulation results.
     * @throws If bundle is empty.
     */
    simulate(options?: SimulateBundleOptions): Promise<SimulateBundleResult>;
};
