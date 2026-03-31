export type ProfileTransactionConfig = Readonly<{
    depth?: 'instruction' | 'transaction';
    encoding?: 'base58' | 'base64' | 'jsonParsed';
}>;

export type ComputeUnitsProfile = Readonly<{
    computeUnitsConsumed: number;
    errorMessage: string | null;
    logMessages: readonly string[];
    success: boolean;
}>;

export type TransactionProfileResult = Readonly<{
    computeUnits: ComputeUnitsProfile;
    state: Readonly<{
        postExecution: unknown;
        preExecution: unknown;
    }>;
}>;

export type SurfnetProfileTransactionApi = {
    profileTransaction(
        transactionData: string,
        tag?: string,
        config?: ProfileTransactionConfig,
    ): TransactionProfileResult;
};
