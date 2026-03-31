import type { Address } from '@solana/kit';

export type SurfnetWriteProgramApi = {
    writeProgram(programId: Address, data: string, offset: number, authority?: Address): null;
};
