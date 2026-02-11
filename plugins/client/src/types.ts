import type { ActionNamespace, ActionPluginOptions } from '@kit-helpers/action';
import type { SystemProgramNamespace } from '@kit-helpers/program-system';
import type { TokenProgramNamespace } from '@kit-helpers/program-token';
import type { QueryNamespace } from '@kit-helpers/query';
import type { WalletApi, WalletConnector } from '@kit-helpers/wallet';
import type { ClusterUrl, TransactionSigner } from '@solana/kit';

/** Shared config fields. */
type SolanaClientConfigBase = {
    /** Action plugin options (commitment, etc.). */
    action?: ActionPluginOptions;
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
    wallet: { connectors: WalletConnector[] };
};

/**
 * Configuration for createSolanaClient().
 * At least one of `payer` or `wallet` must be provided.
 */
export type SolanaClientConfig = PayerClientConfig | WalletClientConfig;

/** The fully composed client type returned by createSolanaClient(). */
export type SolanaClient = {
    action: ActionNamespace;
    payer?: TransactionSigner;
    program: {
        system: SystemProgramNamespace;
        token: TokenProgramNamespace;
    };
    query: QueryNamespace;
    rpc: ReturnType<typeof import('@solana/kit').createSolanaRpc>;
    rpcSubscriptions: ReturnType<typeof import('@solana/kit').createSolanaRpcSubscriptions>;
    wallet?: WalletApi;
};

/** Client with a guaranteed payer (server/script usage). */
export type PayerSolanaClient = SolanaClient & { payer: TransactionSigner };

/** Client with a guaranteed wallet (browser usage). */
export type WalletSolanaClient = SolanaClient & { wallet: WalletApi };
