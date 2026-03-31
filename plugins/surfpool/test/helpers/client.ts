import { createSolanaRpc } from '@solana/kit';

import { createSurfnetCheatcodesRpc } from '../../src/index';

const URL = process.env.SURFPOOL_URL ?? 'http://127.0.0.1:8899';

export const testClient = {
    rpc: createSolanaRpc(URL),
    surfnet: createSurfnetCheatcodesRpc(URL),
};
