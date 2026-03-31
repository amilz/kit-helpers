export type LocalSignatureEntry = Readonly<{
    err: Readonly<{ errorType: string; message: string }> | null;
    logs: readonly string[];
    signature: string;
}>;

export type SurfnetGetLocalSignaturesApi = {
    getLocalSignatures(limit?: number): readonly LocalSignatureEntry[];
};
