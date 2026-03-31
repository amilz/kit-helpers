import type { Address } from '@solana/kit';

export type ResetAccountConfig = Readonly<{
    includeOwnedAccounts?: boolean;
}>;

export type SurfnetResetAccountApi = {
    resetAccount(pubkey: Address, config?: ResetAccountConfig): null;
};
