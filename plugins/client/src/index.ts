// Client factory
export { createSolanaClient } from './client';

// Types
export type {
    PayerClientConfig,
    PayerSolanaClient,
    SolanaClient,
    SolanaClientConfig,
    WalletClientConfig,
    WalletSolanaClient,
} from './types';

// Re-export plugin types for convenience
export type { ActionNamespace } from '@kit-helpers/action';
export type { SystemPlugin, SystemPluginInstructions } from '@solana-program/system';
export type { TokenPlugin, TokenPluginInstructions } from '@solana-program/token';
export type { QueryDef, QueryNamespace } from '@kit-helpers/query';
export type { UiWallet, UiWalletAccount, WalletApi } from '@kit-helpers/wallet';
