import type { TransactionSigner } from '@solana/kit';

import type { WalletApi } from './types';

/** Source of a transaction signer: payer, wallet, or both. */
export type SignerSource = { payer?: TransactionSigner; wallet?: WalletApi };

/**
 * Resolve the transaction signer from the client or an override.
 *
 * Priority:
 * 1. Explicit override (per-call signer option)
 * 2. Connected wallet signer (wallet.state.session.signer)
 * 3. Client payer
 *
 * @param client - The client with wallet and/or payer.
 * @param override - Optional per-call signer override.
 * @returns The resolved TransactionSigner.
 * @throws If no signer can be resolved.
 */
export function resolveSigner(client: SignerSource, override?: TransactionSigner): TransactionSigner {
    // 1. Explicit override
    if (override) {
        return override;
    }

    // 2. Connected wallet
    if (client.wallet && client.wallet.state.status === 'connected' && client.wallet.state.session?.signer) {
        return client.wallet.state.session.signer;
    }

    // 3. Client payer
    if (client.payer) {
        return client.payer;
    }

    throw new Error(
        'No signer available. Either connect a wallet, provide a payer on the client, ' +
            'or pass a signer in the options.',
    );
}
