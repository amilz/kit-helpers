import type { Address } from '@solana/kit';

import type { AnchorIdl } from './register-idl';

export type SurfnetGetActiveIdlApi = {
    getActiveIdl(programId: Address, slot?: number): AnchorIdl | null;
};
