import type { Address } from '@solana/kit';

export type SetAccountUpdate = Readonly<{
    data?: string;
    executable?: boolean;
    lamports?: number;
    owner?: Address;
    rentEpoch?: number;
}>;

export type SurfnetSetAccountApi = {
    setAccount(pubkey: Address, update: SetAccountUpdate): null;
};
