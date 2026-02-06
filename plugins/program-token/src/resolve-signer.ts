import type { TransactionSigner } from '@solana/kit';

import type { TokenProgramClientRequirements } from './types';

/**
 * Resolve the transaction signer from the client or an override.
 *
 * Priority:
 * 1. Explicit override (per-call signer option)
 * 2. Connected wallet signer (client.wallet.session.signer)
 * 3. Client payer (client.payer)
 *
 * @param client - The client with wallet and/or payer.
 * @param override - Optional per-call signer override.
 * @returns The resolved TransactionSigner.
 * @throws If no signer can be resolved.
 */
export function resolveSigner(client: TokenProgramClientRequirements, override?: TransactionSigner): TransactionSigner {
    // 1. Explicit override
    if (override) {
        return override;
    }

    // 2. Connected wallet
    if ('wallet' in client && client.wallet?.connected && client.wallet.session?.signer) {
        return client.wallet.session.signer;
    }

    // 3. Client payer
    if ('payer' in client && client.payer) {
        return client.payer;
    }

    throw new Error(
        'No signer available. Either connect a wallet, provide a payer on the client, ' +
            'or pass a signer in the options.',
    );
}
