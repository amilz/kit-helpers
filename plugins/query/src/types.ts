import type {
    Address,
    Commitment,
    GetAccountInfoApi,
    GetBalanceApi,
    GetProgramAccountsApi,
    GetSignatureStatusesApi,
    GetTokenAccountBalanceApi,
    Lamports,
    Rpc,
    Signature,
} from '@solana/kit';

/**
 * A decoder that transforms raw account bytes into a typed structure.
 * Simpler than @solana/kit's full Codec type - just needs a decode function.
 */
export type Decoder<T> = {
    decode: (data: Uint8Array) => T;
    /** Optional name for cache key differentiation between decoders. */
    name?: string;
};

/**
 * A framework-agnostic query definition.
 *
 * This is the core primitive that framework adapters (TanStack, SWR, etc.) consume.
 * The definition contains everything needed to execute and cache the query.
 *
 * @example
 * ```ts
 * // Direct execution (vanilla JS)
 * const balanceQuery = client.query.balance(address);
 * const balance = await balanceQuery.fn();
 *
 * // TanStack Query adapter
 * const { data } = useQuery({
 *   queryKey: balanceQuery.key,
 *   queryFn: balanceQuery.fn,
 *   staleTime: balanceQuery.staleTime,
 * });
 * ```
 */
export type QueryDef<TData> = {
    /** Async function that fetches the data. */
    fn: () => Promise<TData>;
    /** Cache key for deduplication and invalidation. */
    key: readonly unknown[];
    /** Optional: milliseconds until data is considered stale. */
    staleTime?: number;
};

/** RPC methods required by the query plugin. */
export type QueryRpc = Rpc<
    GetAccountInfoApi & GetBalanceApi & GetProgramAccountsApi & GetSignatureStatusesApi & GetTokenAccountBalanceApi
>;

/** Client requirements for the query plugin. */
export type QueryClientRequirements = {
    rpc: QueryRpc;
};

/** Token balance with amount and decimals. */
export type TokenBalance = {
    amount: bigint;
    decimals: number;
    uiAmount: number | null;
    uiAmountString: string;
};

/** Account info returned from getAccountInfo. */
export type AccountInfo<TData = Uint8Array> = {
    data: TData;
    executable: boolean;
    lamports: Lamports;
    owner: Address;
    space: bigint;
};

/** Program account with pubkey and account info. */
export type ProgramAccount<TData = Uint8Array> = {
    account: AccountInfo<TData>;
    pubkey: Address;
};

/** Signature status result from getSignatureStatuses. */
export type SignatureStatus = {
    /** Confirmation status: processed, confirmed, or finalized. */
    confirmationStatus: Commitment | null;
    /** Number of confirmations, or null if rooted. */
    confirmations: bigint | null;
    /** Error if the transaction failed. */
    err: unknown;
    /** The slot the transaction was processed in. */
    slot: bigint;
};

/** Options for programAccounts query. */
export type ProgramAccountsOptions<TData = Uint8Array> = {
    /** Data size filter - only return accounts with this exact size. */
    dataSize?: bigint;
    /** Decoder to transform raw account bytes into typed data. */
    decoder?: Decoder<TData>;
};

/** The query namespace added by the plugin. */
export type QueryNamespace = {
    /**
     * Query account info, optionally decoding with a decoder.
     * @param address - The account address.
     * @param decoder - Optional decoder to transform raw bytes into typed data.
     */
    account<TData = Uint8Array>(address: Address, decoder?: Decoder<TData>): QueryDef<AccountInfo<TData> | null>;

    /**
     * Query SOL balance for an address.
     * @param address - The address to check balance for.
     */
    balance(address: Address): QueryDef<Lamports>;

    /**
     * Query all accounts owned by a program.
     * @param programId - The program address.
     * @param options - Optional data size filter and decoder.
     */
    programAccounts<TData = Uint8Array>(
        programId: Address,
        options?: ProgramAccountsOptions<TData>,
    ): QueryDef<ProgramAccount<TData>[]>;

    /**
     * Query signature status for a transaction.
     * @param signature - The transaction signature.
     */
    signatureStatus(signature: Signature): QueryDef<SignatureStatus | null>;

    /**
     * Query SPL token balance.
     *
     * @overload Pass an ATA address directly.
     * @param ata - The associated token account address.
     *
     * @overload Pass mint + owner to derive ATA automatically.
     * @param mint - The token mint address.
     * @param owner - The wallet owner address.
     */
    tokenBalance(ata: Address): QueryDef<TokenBalance>;
    tokenBalance(mint: Address, owner: Address): QueryDef<TokenBalance>;
};
