import { resolveSigner as walletResolveSigner } from '@kit-helpers/wallet';
import type { TransactionSigner } from '@solana/kit';

import type { SystemProgramClientRequirements } from './types';

export function resolveSigner(
    client: SystemProgramClientRequirements,
    override?: TransactionSigner,
): TransactionSigner {
    return walletResolveSigner(client, override);
}
