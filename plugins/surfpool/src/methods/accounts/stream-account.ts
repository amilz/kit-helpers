import type { Address } from '@solana/kit';

export type StreamAccountConfig = Readonly<{
    includeOwnedAccounts?: boolean;
}>;

export type SurfnetStreamAccountApi = {
    streamAccount(pubkey: Address, config?: StreamAccountConfig): null;
};
