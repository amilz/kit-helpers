import type { ActionNamespace } from '@kit-helpers/action';
import type { QueryNamespace } from '@kit-helpers/query';
import type { WalletApi } from '@kit-helpers/wallet';
import type { SystemPlugin } from '@solana-program/system';
import type { TokenPlugin } from '@solana-program/token';
import type {
    ClientWithTransactionPlanning,
    ClientWithTransactionSending,
    ClusterUrl,
    Lamports,
    MicroLamports,
    TransactionSigner,
} from '@solana/kit';
import type { UiWallet } from '@wallet-standard/ui';

/** Shared config fields. */
type SolanaClientConfigBase = {
    /** Priority fee in micro-lamports per compute unit. Version 0 only. */
    priorityFees?: MicroLamports;
    /** Total priority fee in lamports. Version 1 only. */
    priorityFeeLamports?: Lamports;
    /** Solana cluster URL. */
    url: ClusterUrl;
    /**
     * The transaction version the client builds. Default: 1.
     * Version 1 requires the `txv1` feature gate and cannot use address lookup tables.
     */
    version?: 0 | 1;
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
