import type { Address } from '@solana/kit';

export type SetTokenAccountUpdate = Readonly<{
    amount?: number;
    closeAuthority?: Address;
    delegate?: Address;
    delegatedAmount?: number;
    state?: 'frozen' | 'initialized';
}>;

export type SurfnetSetTokenAccountApi = {
    setTokenAccount(owner: Address, mint: Address, update: SetTokenAccountUpdate, tokenProgram?: Address): null;
};
