import type { Address } from '@solana/kit';

export type SurfnetCloneProgramAccountApi = {
    cloneProgramAccount(sourceProgramId: Address, destinationProgramId: Address): null;
};
