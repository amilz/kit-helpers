import { resolveSigner as walletResolveSigner } from '@kit-helpers/wallet';
import type { TransactionSigner } from '@solana/kit';

import type { TokenProgramClientRequirements } from './types';

export function resolveSigner(client: TokenProgramClientRequirements, override?: TransactionSigner): TransactionSigner {
    return walletResolveSigner(client, override);
}
