// Client factory
export { createSolanaClient } from './client';

// Types
export type {
    PayerClientConfig,
    PayerSolanaClient,
    SendConfig,
    SendInput,
    SolanaClient,
    SolanaClientConfig,
    WalletClientConfig,
    WalletSolanaClient,
} from './types';

// Re-export plugin types for convenience
export type { ActionNamespace } from '@kit-helpers/action';
export type { SystemProgramNamespace } from '@kit-helpers/program-system';
export type { TokenProgramNamespace } from '@kit-helpers/program-token';
export type { QueryDef, QueryNamespace } from '@kit-helpers/query';
export type { UiWallet, UiWalletAccount, WalletApi } from '@kit-helpers/wallet';
