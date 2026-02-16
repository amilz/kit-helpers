import { systemProgramPlugin } from '@kit-helpers/program-system';
import { tokenProgramPlugin } from '@kit-helpers/program-token';
import { queryPlugin } from '@kit-helpers/query';
import { walletPlugin } from '@kit-helpers/wallet';
import type {
    Instruction,
    InstructionPlan,
    TransactionMessage,
    TransactionMessageWithFeePayer,
    TransactionPlanExecutor,
    TransactionPlanner,
    TransactionSigner,
} from '@solana/kit';
import {
    assertIsSingleTransactionPlan,
    assertIsSuccessfulSingleTransactionPlanResult,
    createEmptyClient,
    sequentialInstructionPlan,
    sequentialTransactionPlan,
    setTransactionMessageFeePayerSigner,
    singleInstructionPlan,
    singleTransactionPlan,
} from '@solana/kit';
import { defaultTransactionPlannerAndExecutorFromRpc, sendTransactions } from '@solana/kit-plugin-instruction-plan';
import { payer } from '@solana/kit-plugin-payer';
import { rpc } from '@solana/kit-plugin-rpc';

import type {
    PayerClientConfig,
    PayerSolanaClient,
    SendConfig,
    SendInput,
    SolanaClientConfig,
    WalletClientConfig,
    WalletSolanaClient,
} from './types';

/**
 * Create a fully composed Solana client with all kit-helpers plugins.
 *
 * Provide `payer` for server/script usage or `wallet` for browser usage.
 *
 * @example
 * ```ts
 * // Server/script usage
 * const client = createSolanaClient({
 *   url: 'https://api.devnet.solana.com',
 *   payer: myKeypair,
 * });
 *
 * // Browser usage
 * const client = createSolanaClient({
 *   url: 'https://api.devnet.solana.com',
 *   wallet: { wallets: autoDiscover() },
 * });
 *
 * // Use the client
 * const balance = await client.query.balance(address).fn();
 * const ix = client.program.system.transfer({ destination, amount: 1_000_000n });
 * await client.sendTransaction([ix]);
 * ```
 */
export function createSolanaClient(config: PayerClientConfig): PayerSolanaClient;
export function createSolanaClient(config: WalletClientConfig): WalletSolanaClient;
export function createSolanaClient(config: SolanaClientConfig): PayerSolanaClient | WalletSolanaClient {
    const rpcClient = createEmptyClient().use(rpc(config.url, config.wsUrl ? { url: config.wsUrl } : undefined));

    // Payer flow — payer is available immediately.
    if ('payer' in config && config.payer) {
        return rpcClient
            .use(payer(config.payer))
            .use(defaultTransactionPlannerAndExecutorFromRpc({ priorityFees: config.priorityFees }))
            .use(sendTransactions())
            .use(queryPlugin())
            .use(systemProgramPlugin())
            .use(tokenProgramPlugin());
    }

    // Wallet flow — payer is only available after wallet.connect().
    // We inline sendTransaction/sendTransactions directly to avoid the plugin's
    // eager spread (`{ ...client }`) which would invoke getters before the wallet connects.
    if ('wallet' in config && config.wallet) {
        const base = rpcClient
            .use(walletPlugin(config.wallet))
            .use(queryPlugin())
            .use(systemProgramPlugin())
            .use(tokenProgramPlugin());

        // Lazy planner/executor — recreated when the signer changes (reconnect, account switch).
        let cachedPe: {
            transactionPlanExecutor: TransactionPlanExecutor;
            transactionPlanner: TransactionPlanner;
        } | null = null;
        let lastSigner: unknown = null;
        const getOrCreatePe = () => {
            const currentSigner = base.wallet.signer;
            if (!currentSigner) {
                throw new Error('No payer available. Connect a wallet first.');
            }
            if (!cachedPe || lastSigner !== currentSigner) {
                const result = defaultTransactionPlannerAndExecutorFromRpc({
                    payer: currentSigner,
                    priorityFees: config.priorityFees,
                })(base);
                cachedPe = {
                    transactionPlanExecutor: result.transactionPlanExecutor,
                    transactionPlanner: result.transactionPlanner,
                };
                lastSigner = currentSigner;
            }
            return cachedPe;
        };

        return {
            ...base,
            get payer() {
                return base.wallet.signer;
            },
            get transactionPlanner() {
                return getOrCreatePe().transactionPlanner;
            },
            get transactionPlanExecutor() {
                return getOrCreatePe().transactionPlanExecutor;
            },
            async sendTransaction(input: SendInput, config: SendConfig = {}) {
                const innerConfig = { abortSignal: config.abortSignal };
                let transactionPlan;
                if (isTransactionMessage(input)) {
                    transactionPlan = singleTransactionPlan(
                        getTransactionMessageWithFeePayer(input, base.wallet.signer),
                    );
                } else {
                    const instructionPlan = getInstructionPlan(input);
                    config.abortSignal?.throwIfAborted();
                    const planner = config.transactionPlanner ?? getOrCreatePe().transactionPlanner;
                    transactionPlan = await planner(instructionPlan, innerConfig);
                    assertIsSingleTransactionPlan(transactionPlan);
                }
                config.abortSignal?.throwIfAborted();
                const executor = config.transactionPlanExecutor ?? getOrCreatePe().transactionPlanExecutor;
                const result = await executor(transactionPlan, innerConfig);
                assertIsSuccessfulSingleTransactionPlanResult(result);
                return result;
            },
            async sendTransactions(input: SendInput | TransactionMessage[], config: SendConfig = {}) {
                const innerConfig = { abortSignal: config.abortSignal };
                let transactionPlan;
                if (isTransactionMessage(input)) {
                    transactionPlan = singleTransactionPlan(
                        getTransactionMessageWithFeePayer(input, base.wallet.signer),
                    );
                } else if (isTransactionMessageArray(input)) {
                    transactionPlan = sequentialTransactionPlan(
                        input.map((m) => getTransactionMessageWithFeePayer(m, base.wallet.signer)),
                    );
                } else {
                    const instructionPlan = getInstructionPlan(input);
                    config.abortSignal?.throwIfAborted();
                    const planner = config.transactionPlanner ?? getOrCreatePe().transactionPlanner;
                    transactionPlan = await planner(instructionPlan, innerConfig);
                }
                config.abortSignal?.throwIfAborted();
                const executor = config.transactionPlanExecutor ?? getOrCreatePe().transactionPlanExecutor;
                return await executor(transactionPlan, innerConfig);
            },
        } as WalletSolanaClient;
    }

    throw new Error('createSolanaClient requires either a `payer` or `wallet` config.');
}

// ─── Helpers for inline send methods ─────────────────────────────────────────

function isTransactionMessage(input: unknown): input is TransactionMessage {
    return typeof input === 'object' && input !== null && 'instructions' in input;
}

function isTransactionMessageArray(input: unknown): input is TransactionMessage[] {
    return Array.isArray(input) && (input.length === 0 || isTransactionMessage(input[0]));
}

function getInstructionPlan(input: Instruction | Instruction[] | InstructionPlan): InstructionPlan {
    if ('kind' in input) return input as InstructionPlan;
    if (Array.isArray(input)) return sequentialInstructionPlan(input);
    return singleInstructionPlan(input);
}

function getTransactionMessageWithFeePayer(
    message: TransactionMessage,
    payer: TransactionSigner | null,
): TransactionMessage & TransactionMessageWithFeePayer {
    if ('feePayer' in message) return message as TransactionMessage & TransactionMessageWithFeePayer;
    if (payer) return setTransactionMessageFeePayerSigner(payer, message);
    throw new Error(
        'A fee payer is required for the provided transaction message. Please add one to the transaction message or connect a wallet first.',
    );
}
