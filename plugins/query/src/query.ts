import type { Address, Lamports, Signature } from '@solana/kit';
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';

import type {
    AccountInfo,
    Decoder,
    ProgramAccount,
    ProgramAccountsOptions,
    QueryClientRequirements,
    QueryDef,
    QueryNamespace,
    SignatureStatus,
    TokenBalance,
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
                    const dataBytes = base64ToBytes(value.data[0]);

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
                key: ['account', address, decoder ? (decoder.name ?? 'decoded') : 'raw'] as const,
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
            const { dataSize, decoder } = options ?? {};
            return {
                fn: async () => {
                    const filters = dataSize ? [{ dataSize }] : undefined;
                    const accounts = await rpc
                        .getProgramAccounts(programId, {
                            encoding: 'base64',
                            filters,
                        })
                        .send();

                    // Type assertion for the response - getProgramAccounts returns array directly
                    type GpaAccount = {
                        account: {
                            data: [string, string];
                            executable: boolean;
                            lamports: Lamports;
                            owner: Address;
                            space: bigint;
                        };
                        pubkey: Address;
                    };

                    return (accounts as unknown as GpaAccount[]).map(({ pubkey, account }) => {
                        const dataBytes = base64ToBytes(account.data[0]);
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
                key: [
                    'programAccounts',
                    programId,
                    dataSize ?? null,
                    decoder ? (decoder.name ?? 'decoded') : 'raw',
                ] as const,
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

        tokenBalance(mintOrAta: Address, owner?: Address): QueryDef<TokenBalance> {
            return {
                fn: async () => {
                    // If owner provided, derive ATA from mint + owner
                    const ata = owner
                        ? (
                              await findAssociatedTokenPda({
                                  mint: mintOrAta,
                                  owner,
                                  tokenProgram: TOKEN_PROGRAM_ADDRESS,
                              })
                          )[0]
                        : mintOrAta;

                    const { value } = await rpc.getTokenAccountBalance(ata).send();
                    return {
                        amount: BigInt(value.amount),
                        decimals: value.decimals,
                        uiAmount: value.uiAmount,
                        uiAmountString: value.uiAmountString,
                    };
                },
                // Use mint+owner or ata directly in cache key
                key: owner ? ['tokenBalance', mintOrAta, owner] : ['tokenBalance', mintOrAta],
                staleTime: STALE_TIMES.tokenBalance,
            };
        },
    };
}

/**
 * Decode base64 string to Uint8Array.
 * Works in both browser and Node.js environments.
 */
function base64ToBytes(base64: string): Uint8Array {
    if (typeof atob === 'function') {
        // Browser
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    } else {
        // Node.js
        return new Uint8Array(Buffer.from(base64, 'base64'));
    }
}
