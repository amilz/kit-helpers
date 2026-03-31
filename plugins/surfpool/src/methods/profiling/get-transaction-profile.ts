import type { ProfileTransactionConfig } from './profile-transaction';

export type TransactionProfileKey = Readonly<{ signature: string }> | Readonly<{ uuid: string }>;

export type DetailedTransactionProfile = Readonly<{
    instructionProfiles: readonly unknown[];
    key: TransactionProfileKey;
    readonlyAccountStates: Readonly<{ slot: number }>;
    transactionProfile: Readonly<{
        accountStates: unknown;
        computeUnitsConsumed: number;
        errorMessage: string | null;
        logMessages: readonly string[];
    }>;
}>;

export type SurfnetGetTransactionProfileApi = {
    getTransactionProfile(
        signatureOrUuid: TransactionProfileKey,
        config?: ProfileTransactionConfig,
    ): DetailedTransactionProfile;
};
