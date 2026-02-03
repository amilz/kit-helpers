import type {
    Address,
    Commitment,
    Decoder,
    GetAccountInfoApi,
    GetBalanceApi,
    GetProgramAccountsApi,
    GetProgramAccountsDatasizeFilter,
    GetProgramAccountsMemcmpFilter,
    GetSignatureStatusesApi,
    GetTokenAccountBalanceApi,
    Lamports,
    Rpc,
    Signature,
} from '@solana/kit';

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

/** Union of all supported getProgramAccounts filters. */
export type ProgramAccountsFilter = GetProgramAccountsDatasizeFilter | GetProgramAccountsMemcmpFilter;

/** Options for programAccounts query. */
export type ProgramAccountsOptions<TData = Uint8Array> = {
    /** Decoder to transform raw account bytes into typed data. */
    decoder?: Decoder<TData>;
    /**
     * Filters to apply. Supports memcmp and dataSize filters.
     * All filters must match (AND logic). Max 4 filters.
     *
     * @example
     * ```ts
     * // Filter by discriminator and data size
     * const options = {
     *   filters: [
     *     { memcmp: { offset: 0n, bytes: 'abc...', encoding: 'base58' } },
     *     { dataSize: 165n },
     *   ],
     * };
     * ```
     */
    filters?: readonly ProgramAccountsFilter[];
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
     *
     * @param programId - The program address.
     * @param options - Optional filters and decoder.
     *
     * @example
     * ```ts
     * // Filter by dataSize
     * client.query.programAccounts(programId, {
     *   filters: [{ dataSize: 165n }],
     * });
     *
     * // Filter by discriminator (memcmp)
     * client.query.programAccounts(programId, {
     *   filters: [
     *     { memcmp: { offset: 0n, bytes: 'abc...', encoding: 'base58' } },
     *   ],
     *   decoder: myDecoder,
     * });
     * ```
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
     * @example
     * ```ts
     * // Pass ATA directly
     * client.query.tokenBalance({ ata: ataAddress });
     *
     * // Or pass mint + owner to derive ATA
     * client.query.tokenBalance({ mint: mintAddress, owner: walletAddress });
     * ```
     */
    tokenBalance(query: TokenBalanceQuery): QueryDef<TokenBalance>;
};

export type TokenBalanceQuery = { ata: Address } | { mint: Address; owner: Address };
