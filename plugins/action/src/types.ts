import type {
    AccountNotificationsApi,
    Commitment,
    FullySignedTransaction,
    GetEpochInfoApi,
    GetLatestBlockhashApi,
    GetSignatureStatusesApi,
    Instruction,
    Rpc,
    RpcSubscriptions,
    SendableTransaction,
    SendTransactionApi,
    Signature,
    SignatureBytes,
    SignatureNotificationsApi,
    SimulateTransactionApi,
    SlotNotificationsApi,
    Transaction,
    TransactionSigner,
    TransactionWithLifetime,
} from '@solana/kit';

/** RPC methods required by the action plugin. */
export type ActionRpc = Rpc<
    GetEpochInfoApi & GetLatestBlockhashApi & GetSignatureStatusesApi & SendTransactionApi & SimulateTransactionApi
>;

/** RPC subscriptions used for send confirmation (optional). */
export type ActionRpcSubscriptions = RpcSubscriptions<
    AccountNotificationsApi & SignatureNotificationsApi & SlotNotificationsApi
>;

/** A signed transaction ready to send. */
export type SignedTransaction = FullySignedTransaction & SendableTransaction & Transaction & TransactionWithLifetime;

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

/**
 * Structural type for wallet-like objects.
 * Uses structural typing to avoid importing from @kit-helpers/wallet.
 */
export type WalletLike = {
    connected: boolean;
    session?: {
        signMessage?: (message: Uint8Array) => Promise<SignatureBytes>;
        signer: TransactionSigner;
    };
};

/** Client with RPC and a payer signer. */
export type PayerClient = {
    payer: TransactionSigner;
    rpc: ActionRpc;
    rpcSubscriptions?: ActionRpcSubscriptions;
};

/** Client with RPC and a wallet. */
export type WalletClient = {
    rpc: ActionRpc;
    rpcSubscriptions?: ActionRpcSubscriptions;
    wallet: WalletLike;
};

/** Client requirements for the action plugin. Either payer or wallet (or both) must be present. */
export type ActionClientRequirements = PayerClient | WalletClient;

/** Options for action.send(). */
export type ActionSendOptions = {
    /** Abort signal to cancel the operation. */
    abortSignal?: AbortSignal;
    /** Commitment level for confirmation. Default: 'confirmed'. */
    commitment?: Commitment;
    /** Override the default signer for this call. */
    signer?: TransactionSigner;
    /** Skip preflight transaction checks. */
    skipPreflight?: boolean;
};

/** Options for action.simulate(). */
export type ActionSimulateOptions = {
    /** Abort signal to cancel the operation. */
    abortSignal?: AbortSignal;
    /** Override the default signer for this call. */
    signer?: TransactionSigner;
};

/** Options for action.sign(). */
export type ActionSignOptions = {
    /** Abort signal to cancel the operation. */
    abortSignal?: AbortSignal;
    /** Override the default signer for this call. */
    signer?: TransactionSigner;
};

/** Options for action.sendSigned(). */
export type ActionSendSignedOptions = {
    /** Abort signal to cancel the operation. */
    abortSignal?: AbortSignal;
    /** Commitment level for confirmation. Default: 'confirmed'. */
    commitment?: Commitment;
    /** Skip preflight transaction checks. */
    skipPreflight?: boolean;
};

/** Plugin-level options for actionPlugin(). */
export type ActionPluginOptions = {
    /** Default commitment for send confirmations. Default: 'confirmed'. */
    commitment?: Commitment;
};

/** The action namespace added to the client. */
export type ActionNamespace = {
    /**
     * Sign, send, and optionally confirm a transaction.
     *
     * If `rpcSubscriptions` is present on the client, the transaction is confirmed
     * via subscription before returning. Otherwise, the signature is returned
     * immediately after sending (fire-and-forget).
     *
     * @param instructions - Instructions to include in the transaction.
     * @param options - Optional configuration.
     * @returns The transaction signature.
     */
    send(instructions: Instruction[], options?: ActionSendOptions): Promise<Signature>;

    /**
     * Send a pre-signed transaction.
     *
     * If `rpcSubscriptions` is present on the client, the transaction is confirmed
     * via subscription before returning. Otherwise, the signature is returned
     * immediately after sending.
     *
     * @param transaction - A signed transaction (from action.sign()).
     * @param options - Optional configuration.
     * @returns The transaction signature.
     */
    sendSigned(transaction: SignedTransaction, options?: ActionSendSignedOptions): Promise<Signature>;

    /**
     * Sign a transaction without sending.
     *
     * @param instructions - Instructions to include in the transaction.
     * @param options - Optional configuration.
     * @returns The signed transaction, ready to pass to sendSigned().
     */
    sign(instructions: Instruction[], options?: ActionSignOptions): Promise<SignedTransaction>;

    /**
     * Sign an arbitrary message.
     *
     * Requires a connected wallet with signMessage support, or a KeyPairSigner.
     *
     * @param message - The message bytes to sign.
     * @returns The signature bytes.
     */
    signMessage(message: Uint8Array): Promise<SignatureBytes>;

    /**
     * Simulate a transaction without sending.
     *
     * @param instructions - Instructions to simulate.
     * @param options - Optional configuration.
     * @returns Simulation result with logs, error, and units consumed.
     */
    simulate(instructions: Instruction[], options?: ActionSimulateOptions): Promise<SimulateResult>;
};
