import type { TransactionSigner } from '@solana/kit';

import type { SystemProgramClientRequirements } from './types';

/**
 * Resolve the transaction signer from the client.
 *
 * Priority:
 * 1. Connected wallet signer (client.wallet.session.signer)
 * 2. Client payer (client.payer)
 *
 * @param client - The client with wallet and/or payer.
 * @returns The resolved TransactionSigner.
 * @throws If no signer can be resolved.
 */
export function resolveSigner(client: SystemProgramClientRequirements): TransactionSigner {
    // 1. Connected wallet
    if (client.wallet?.connected && client.wallet.session?.signer) {
        return client.wallet.session.signer;
    }

    // 2. Client payer
    if (client.payer) {
        return client.payer;
    }

    throw new Error('No signer available. Either connect a wallet or provide a payer on the client.');
}
