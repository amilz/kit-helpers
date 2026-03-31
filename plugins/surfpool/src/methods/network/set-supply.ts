import type { Address } from '@solana/kit';

export type SetSupplyUpdate = Readonly<{
    circulating?: number;
    nonCirculating?: number;
    nonCirculatingAccounts?: readonly Address[];
    total?: number;
}>;

export type SurfnetSetSupplyApi = {
    setSupply(update: SetSupplyUpdate): null;
};
