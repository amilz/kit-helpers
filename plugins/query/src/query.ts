import { type Address, type Decoder, getBase64Encoder, type Lamports, type Signature } from '@solana/kit';
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';

import type {
    AccountInfo,
    ProgramAccount,
    ProgramAccountsFilter,
    ProgramAccountsOptions,
    QueryClientRequirements,
    QueryDef,
    QueryNamespace,
    SignatureStatus,
    TokenBalance,
    TokenBalanceQuery,
} from './types';

/** Default stale times in milliseconds. */
const STALE_TIMES = {
    account: 30_000, // 30s - general account data
    balance: 10_000, // 10s - balances change frequently
    programAccounts: 60_000, // 60s - GPA is expensive
    signatureStatus: 2_000, // 2s - confirmation changes quickly
    tokenBalance: 10_000, // 10s - balances change frequently
} as const;

/**
 * Serialize filters to a stable string for cache key.
 * Sorts by type and offset to ensure consistent ordering.
 */
function serializeFiltersForKey(filters: readonly ProgramAccountsFilter[]): string {
    const sorted = [...filters].sort((a, b) => {
        // dataSize filters come first
        if ('dataSize' in a && !('dataSize' in b)) return -1;
        if (!('dataSize' in a) && 'dataSize' in b) return 1;
        // Sort memcmp by offset
        if ('memcmp' in a && 'memcmp' in b) {
            return Number(a.memcmp.offset - b.memcmp.offset);
        }
        return 0;
    });

    return JSON.stringify(
        sorted.map(f => {
            if ('dataSize' in f) return { d: f.dataSize.toString() };
            return { m: [f.memcmp.offset.toString(), f.memcmp.bytes, f.memcmp.encoding] };
        }),
    );
}

/**
 * Creates the query namespace with all query definitions.
 * @internal
 */
export function createQueryNamespace(client: QueryClientRequirements): QueryNamespace {
    const { rpc } = client;

    return {
        account<TData = Uint8Array>(address: Address, decoder?: Decoder<TData>): QueryDef<AccountInfo<TData> | null> {
            return {
                fn: async () => {
                    const { value } = await rpc.getAccountInfo(address, { encoding: 'base64' }).send();

                    if (!value) return null;

                    // Decode base64 data to Uint8Array
                    const dataBytes = getBase64Encoder().encode(value.data[0]);

                    // If decoder provided, decode the data
                    const data = decoder ? decoder.decode(dataBytes) : (dataBytes as unknown as TData);

                    return {
                        data,
                        executable: value.executable,
                        lamports: value.lamports,
                        owner: value.owner,
                        space: value.space,
                    };
                },
                key: ['account', address, decoder ? 'decoded' : 'raw'] as const,
                staleTime: STALE_TIMES.account,
            };
        },

        balance(address: Address): QueryDef<Lamports> {
            return {
                fn: async () => {
                    const { value } = await rpc.getBalance(address).send();
                    return value;
                },
                key: ['balance', address] as const,
                staleTime: STALE_TIMES.balance,
            };
        },

        programAccounts<TData = Uint8Array>(
            programId: Address,
            options?: ProgramAccountsOptions<TData>,
        ): QueryDef<ProgramAccount<TData>[]> {
            const { decoder, filters } = options ?? {};

            // Build a stable cache key from filters
            const filtersKey = filters ? serializeFiltersForKey(filters) : null;

            return {
                fn: async () => {
                    const accounts = await rpc
                        .getProgramAccounts(programId, {
                            encoding: 'base64',
                            filters,
                        })
                        .send();

                    return accounts.map(({ pubkey, account }) => {
                        const dataBytes = getBase64Encoder().encode(account.data[0]);
                        const data = decoder ? decoder.decode(dataBytes) : (dataBytes as unknown as TData);

                        return {
                            account: {
                                data,
                                executable: account.executable,
                                lamports: account.lamports,
                                owner: account.owner,
                                space: account.space,
                            },
                            pubkey,
                        };
                    });
                },
                key: ['programAccounts', programId, filtersKey, decoder ? 'decoded' : 'raw'] as const,
                staleTime: STALE_TIMES.programAccounts,
            };
        },

        signatureStatus(signature: Signature): QueryDef<SignatureStatus | null> {
            return {
                fn: async () => {
                    const { value } = await rpc.getSignatureStatuses([signature]).send();
                    const status = value[0];
                    if (!status) return null;
                    return {
                        confirmationStatus: status.confirmationStatus,
                        confirmations: status.confirmations,
                        err: status.err,
                        slot: status.slot,
                    };
                },
                key: ['signatureStatus', signature] as const,
                staleTime: STALE_TIMES.signatureStatus,
            };
        },

        tokenBalance(query: TokenBalanceQuery): QueryDef<TokenBalance> {
            return {
                fn: async () => {
                    const tokenAccount =
                        'ata' in query
                            ? query.ata
                            : (
                                  await findAssociatedTokenPda({
                                      mint: query.mint,
                                      owner: query.owner,
                                      tokenProgram: TOKEN_PROGRAM_ADDRESS,
                                  })
                              )[0];

                    const { value } = await rpc.getTokenAccountBalance(tokenAccount).send();
                    return {
                        amount: BigInt(value.amount),
                        decimals: value.decimals,
                        uiAmount: value.uiAmount,
                        uiAmountString: value.uiAmountString,
                    };
                },
                key: 'ata' in query ? ['tokenBalance', query.ata] : ['tokenBalance', query.mint, query.owner],
                staleTime: STALE_TIMES.tokenBalance,
            };
        },
    };
}
