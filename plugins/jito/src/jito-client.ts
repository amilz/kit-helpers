import { type Address, address, type Signature, signature } from '@solana/kit';

import { createBundleBuilder, getRandomTipAccount as selectRandomTipAccount, validateBundle } from './helpers';
import { createJitoTransport, type JitoTransport } from './jito-transport';
import type {
    Bundle,
    BundleBuilder,
    BundleStatus,
    InflightBundleStatus,
    JitoApi,
    JitoPluginConfig,
    SendTransactionOptions,
    SimulateBundleOptions,
    SimulateBundleResult,
} from './types';

/** Raw response from getBundleStatuses RPC. */
type RawBundleStatusResponse = {
    context: { slot: number };
    value: Array<{
        bundle_id: string;
        confirmation_status: 'confirmed' | 'finalized' | 'processed';
        err: { Err: unknown } | { Ok: null };
        slot: number;
        transactions: string[];
    }>;
};

/** Raw response from getInflightBundleStatuses RPC. */
type RawInflightBundleStatusResponse = {
    context: { slot: number };
    value: Array<{
        bundle_id: string;
        landed_slot?: number;
        status: 'Failed' | 'Invalid' | 'Landed' | 'Pending';
    }>;
};

/** Raw response from simulateBundle RPC. */
type RawSimulateBundleResponse = {
    context: { slot: number };
    value: {
        summary: 'failed' | 'succeeded';
        transactionResults: Array<{
            err: string | null;
            logs: string[] | null;
            postExecutionAccounts: Array<{
                data: string[];
                executable: boolean;
                lamports: number;
                owner: string;
                rentEpoch: number;
            }> | null;
            returnData: { data: string[]; programId: string } | null;
            unitsConsumed: number | null;
        }>;
    };
};

/**
 * Create the Jito API client.
 * @param config - Plugin configuration.
 * @returns The JitoApi implementation.
 */
export function createJitoClient(config: JitoPluginConfig): JitoApi {
    const transport: JitoTransport = createJitoTransport(config);

    // Promise-based cache for tip accounts to handle concurrent requests
    let cachedTipAccountsPromise: Promise<Address[]> | null = null;

    const api: JitoApi = {
        createBundle(): BundleBuilder {
            return createBundleBuilder(api);
        },

        async getBundleStatuses(bundleIds: readonly string[]): Promise<readonly BundleStatus[]> {
            if (bundleIds.length === 0) {
                return [];
            }
            if (bundleIds.length > 5) {
                throw new Error('Cannot check more than 5 bundle statuses at once');
            }
            const response = await transport.call<RawBundleStatusResponse>('getBundleStatuses', [[...bundleIds]]);
            return response.value.map(status => ({
                bundle_id: status.bundle_id,
                confirmation_status: status.confirmation_status,
                err: status.err,
                slot: BigInt(status.slot),
                transactions: status.transactions.map(sig => signature(sig)),
            }));
        },

        async getInflightBundleStatuses(bundleIds: readonly string[]): Promise<readonly InflightBundleStatus[]> {
            if (bundleIds.length === 0) {
                return [];
            }
            if (bundleIds.length > 5) {
                throw new Error('Cannot check more than 5 in-flight bundle statuses at once');
            }
            const response = await transport.call<RawInflightBundleStatusResponse>('getInflightBundleStatuses', [
                [...bundleIds],
            ]);
            return response.value.map(status => ({
                bundle_id: status.bundle_id,
                landed_slot: status.landed_slot !== undefined ? BigInt(status.landed_slot) : undefined,
                status: status.status,
            }));
        },

        async getRandomTipAccount(): Promise<Address> {
            const accounts = await this.getTipAccounts();
            return selectRandomTipAccount(accounts);
        },

        async getTipAccounts(): Promise<Address[]> {
            if (cachedTipAccountsPromise) {
                return await cachedTipAccountsPromise;
            }
            cachedTipAccountsPromise = (async () => {
                const accounts = await transport.call<string[]>('getTipAccounts', []);
                return accounts.map(a => address(a));
            })();
            return await cachedTipAccountsPromise;
        },

        async sendBundle(bundle: Bundle): Promise<string> {
            validateBundle(bundle);
            return await transport.call<string>('sendBundle', [[...bundle]]);
        },

        async sendTransaction(transaction: string, options?: SendTransactionOptions): Promise<Signature> {
            const params: [string, { encoding: string; skipPreflight?: boolean }] = [
                transaction,
                {
                    encoding: options?.encoding ?? 'base64',
                    ...(options?.skipPreflight !== undefined && { skipPreflight: options.skipPreflight }),
                },
            ];
            const result = await transport.call<string>('sendTransaction', params);
            return signature(result);
        },

        async simulateBundle(bundle: Bundle, options?: SimulateBundleOptions): Promise<SimulateBundleResult> {
            if (bundle.length === 0) {
                throw new Error('Bundle is empty');
            }

            const params: unknown[] = [
                {
                    encodedTransactions: [...bundle],
                },
            ];

            if (options) {
                const simulationConfig: Record<string, unknown> = {};
                if (options.simulationBank) {
                    simulationConfig.simulationBank = options.simulationBank;
                }
                if (options.skipSigVerify !== undefined) {
                    simulationConfig.skipSigVerify = options.skipSigVerify;
                }
                if (options.replaceRecentBlockhash !== undefined) {
                    simulationConfig.replaceRecentBlockhash = options.replaceRecentBlockhash;
                }
                if (Object.keys(simulationConfig).length > 0) {
                    params.push(simulationConfig);
                }
            }

            const response = await transport.call<RawSimulateBundleResponse>('simulateBundle', params);

            return {
                summary: response.value.summary,
                transactionResults: response.value.transactionResults.map(result => ({
                    err: result.err,
                    logs: result.logs,
                    postExecutionAccounts:
                        result.postExecutionAccounts?.map(account => ({
                            data: account.data,
                            executable: account.executable,
                            lamports: BigInt(account.lamports),
                            owner: account.owner,
                            rentEpoch: BigInt(account.rentEpoch),
                        })) ?? null,
                    returnData: result.returnData,
                    unitsConsumed: result.unitsConsumed !== null ? BigInt(result.unitsConsumed) : null,
                })),
            };
        },
    };

    return api;
}
