import { resolveSigner as walletResolveSigner } from '@kit-helpers/wallet';
import type { TransactionSigner } from '@solana/kit';

import type { ActionClientRequirements } from './types';

export function resolveSigner(client: ActionClientRequirements, override?: TransactionSigner): TransactionSigner {
    return walletResolveSigner(client, override);
}
