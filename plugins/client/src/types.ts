import type { ActionNamespace } from '@kit-helpers/action';
import type { QueryNamespace } from '@kit-helpers/query';
import type { WalletApi } from '@kit-helpers/wallet';
import type {
    ClientWithTransactionPlanning,
    ClientWithTransactionSending,
    ClusterUrl,
    MicroLamports,
    TransactionSigner,
} from '@solana/kit';
import type { SystemPlugin } from '@solana-program/system';
import type { TokenPlugin } from '@solana-program/token';
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

/** The fully composed client type returned by createSolanaClient(). */
export type SolanaClient = ClientWithTransactionPlanning &
    ClientWithTransactionSending & {
        payer: TransactionSigner;
        program: { system: SystemPlugin; token: TokenPlugin };
        query: QueryNamespace;
        rpc: ReturnType<typeof import('@solana/kit').createSolanaRpc>;
        rpcSubscriptions: ReturnType<typeof import('@solana/kit').createSolanaRpcSubscriptions>;
        wallet?: WalletApi;
    };

/** Client with a guaranteed payer (server/script usage). */
export type PayerSolanaClient = SolanaClient & { payer: TransactionSigner };

/** Client with a guaranteed wallet (browser usage). Uses the action plugin for send/sign/simulate. */
export type WalletSolanaClient = SolanaClient & {
    action: ActionNamespace;
    wallet: WalletApi;
};
