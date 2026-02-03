// Plugin
export { queryPlugin } from './query-plugin';

// Core (for direct use without plugin)
export { createQueryNamespace } from './query';

// Types
export type {
    AccountInfo,
    Decoder,
    ProgramAccount,
    ProgramAccountsOptions,
    QueryClientRequirements,
    QueryDef,
    QueryNamespace,
    QueryRpc,
    SignatureStatus,
    TokenBalance,
} from './types';
