import type { Address } from '@solana/kit';

export type StreamedAccountEntry = Readonly<{
    includeOwnedAccounts: boolean;
    pubkey: Address;
}>;

export type StreamedAccountsResult = Readonly<{
    accounts: readonly StreamedAccountEntry[];
}>;

export type SurfnetGetStreamedAccountsApi = {
    getStreamedAccounts(): StreamedAccountsResult;
};
