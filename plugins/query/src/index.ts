// Plugin
export { queryPlugin } from './query-plugin';

// Core (for direct use without plugin)
export { createQueryNamespace } from './query';

// Types
export type {
    AccountInfo,
    ProgramAccount,
    ProgramAccountsFilter,
    ProgramAccountsOptions,
    QueryClientRequirements,
    QueryDef,
    QueryNamespace,
    QueryRpc,
    SignatureStatus,
    TokenBalance,
} from './types';

// Re-export filter types from Kit for convenience
export type { GetProgramAccountsDatasizeFilter, GetProgramAccountsMemcmpFilter } from '@solana/kit';
