// Plugin
export { actionPlugin } from './action-plugin';

// Core (for direct use without plugin)
export { createActionNamespace } from './action';

// Signer resolution
export { resolveSigner } from './resolve-signer';

// Types
export type {
    ActionClientRequirements,
    ActionNamespace,
    ActionPluginOptions,
    ActionRpc,
    ActionRpcSubscriptions,
    ActionSendOptions,
    ActionSendSignedOptions,
    ActionSignOptions,
    ActionSimulateOptions,
    PayerClient,
    SignedTransaction,
    SimulateResult,
    WalletClient,
} from './types';
