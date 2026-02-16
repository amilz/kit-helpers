import type { SystemProgramNamespace } from '@kit-helpers/program-system';
import type { TokenProgramNamespace } from '@kit-helpers/program-token';
import type { QueryNamespace } from '@kit-helpers/query';
import type { WalletApi } from '@kit-helpers/wallet';
import type {
    ClusterUrl,
    Instruction,
    InstructionPlan,
    MicroLamports,
    SuccessfulSingleTransactionPlanResult,
    TransactionMessage,
    TransactionPlanExecutor,
    TransactionPlanner,
    TransactionPlanResult,
    TransactionSigner,
} from '@solana/kit';
import type { UiWallet } from '@wallet-standard/ui';

/** Shared config fields. */
type SolanaClientConfigBase = {
    /** Priority fees in micro-lamports per compute unit. */
    priorityFees?: MicroLamports;
    /** Solana cluster URL. */
    url: ClusterUrl;
    /** WebSocket URL for RPC subscriptions. Defaults to the HTTP URL with the protocol swapped to `ws(s)`. */
    wsUrl?: ClusterUrl;
};

/** Server/script config — payer required. */
export type PayerClientConfig = SolanaClientConfigBase & {
    /** Transaction signer for scripting/server usage. */
    payer: TransactionSigner;
    wallet?: never;
};

/** Browser config — wallet required. */
export type WalletClientConfig = SolanaClientConfigBase & {
    payer?: never;
    /** Wallet configuration for browser usage. */
    wallet: { wallets: UiWallet[] };
};

/**
 * Configuration for createSolanaClient().
 * At least one of `payer` or `wallet` must be provided.
 */
export type SolanaClientConfig = PayerClientConfig | WalletClientConfig;

/** Config for per-call overrides on sendTransaction / sendTransactions. */
export type SendConfig = {
    abortSignal?: AbortSignal;
    transactionPlanExecutor?: TransactionPlanExecutor;
    transactionPlanner?: TransactionPlanner;
};

/** Input accepted by sendTransaction and sendTransactions. */
export type SendInput = Instruction | Instruction[] | InstructionPlan | TransactionMessage;

/** The fully composed client type returned by createSolanaClient(). */
export type SolanaClient = {
    payer?: TransactionSigner;
    program: {
        system: SystemProgramNamespace;
        token: TokenProgramNamespace;
    };
    query: QueryNamespace;
    rpc: ReturnType<typeof import('@solana/kit').createSolanaRpc>;
    rpcSubscriptions: ReturnType<typeof import('@solana/kit').createSolanaRpcSubscriptions>;
    sendTransaction: (input: SendInput, config?: SendConfig) => Promise<SuccessfulSingleTransactionPlanResult>;
    sendTransactions: (input: SendInput | TransactionMessage[], config?: SendConfig) => Promise<TransactionPlanResult>;
    transactionPlanExecutor: TransactionPlanExecutor;
    transactionPlanner: TransactionPlanner;
    wallet?: WalletApi;
};

/** Client with a guaranteed payer (server/script usage). */
export type PayerSolanaClient = SolanaClient & { payer: TransactionSigner };

/** Client with a guaranteed wallet (browser usage). */
export type WalletSolanaClient = Omit<SolanaClient, 'payer'> & {
    payer: TransactionSigner | null;
    wallet: WalletApi;
};
