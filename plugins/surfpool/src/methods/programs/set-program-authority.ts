import type { Address } from '@solana/kit';

export type SurfnetSetProgramAuthorityApi = {
    setProgramAuthority(programId: Address, newAuthority?: Address): null;
};
