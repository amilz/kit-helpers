// Client factory
export { createSolanaClient } from './client';

// Types
export type { PayerClientConfig, SolanaClient, SolanaClientConfig, WalletClientConfig } from './types';

// Re-export plugin types for convenience
export type { ActionNamespace, ActionPluginOptions } from '@kit-helpers/action';
export type { SystemProgramNamespace } from '@kit-helpers/program-system';
export type { TokenProgramNamespace } from '@kit-helpers/program-token';
export type { QueryDef, QueryNamespace } from '@kit-helpers/query';
export type { WalletApi, WalletConnector } from '@kit-helpers/wallet';
