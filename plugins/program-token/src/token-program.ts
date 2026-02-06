import {
    getBurnInstruction,
    getCreateAssociatedTokenIdempotentInstruction,
    getCreateAssociatedTokenIdempotentInstructionAsync,
    getInitializeMint2Instruction,
    getMintToInstruction,
    getTransferCheckedInstruction,
    getTransferInstruction,
} from '@solana-program/token';

import { resolveSigner } from './resolve-signer';
import type { TokenProgramClientRequirements, TokenProgramNamespace } from './types';

export function createTokenProgramNamespace(client: TokenProgramClientRequirements): TokenProgramNamespace {
    return {
        burn({ account, mint, authority, amount }) {
            return getBurnInstruction({ account, amount, authority, mint });
        },

        createAta({ payer, ata, owner, mint }) {
            return getCreateAssociatedTokenIdempotentInstruction({ ata, mint, owner, payer });
        },

        async createAtaAsync({ payer, owner, mint }) {
            const resolvedPayer = payer ?? resolveSigner(client);
            return await getCreateAssociatedTokenIdempotentInstructionAsync({ mint, owner, payer: resolvedPayer });
        },

        initializeMint({ mint, decimals, mintAuthority, freezeAuthority }) {
            return getInitializeMint2Instruction({ decimals, freezeAuthority, mint, mintAuthority });
        },

        mintTo({ mint, token, mintAuthority, amount }) {
            return getMintToInstruction({ amount, mint, mintAuthority, token });
        },

        transfer({ source, destination, authority, amount }) {
            return getTransferInstruction({ amount, authority, destination, source });
        },

        transferChecked({ source, mint, destination, authority, amount, decimals }) {
            return getTransferCheckedInstruction({ amount, authority, decimals, destination, mint, source });
        },
    };
}
