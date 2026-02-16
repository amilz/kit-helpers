import {
    getAllocateInstruction,
    getAssignInstruction,
    getCreateAccountInstruction,
    getTransferSolInstruction,
} from '@solana-program/system';

import { resolveSigner } from './resolve-signer';
import type { SystemProgramClientRequirements, SystemProgramNamespace } from './types';

export function createSystemProgramNamespace(client: SystemProgramClientRequirements): SystemProgramNamespace {
    return {
        allocate({ newAccount, space }) {
            return getAllocateInstruction({ newAccount, space });
        },
        assign({ account, programAddress }) {
            return getAssignInstruction({ account, programAddress });
        },
        createAccount({ newAccount, lamports, space, programAddress }) {
            const payer = resolveSigner(client);
            return getCreateAccountInstruction({ lamports, newAccount, payer, programAddress, space });
        },
        transfer({ destination, amount }) {
            const source = resolveSigner(client);
            return getTransferSolInstruction({ amount, destination, source });
        },
    };
}
