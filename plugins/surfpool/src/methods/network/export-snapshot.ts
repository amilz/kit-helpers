export type ExportSnapshotConfig = Readonly<{
    filter?: Readonly<{
        excludeAccounts?: readonly string[];
        includeAccounts?: readonly string[];
        includeProgramAccounts?: boolean;
    }>;
    includeParsedAccounts?: boolean;
    scope?: 'network' | 'preTransaction';
}>;

export type SurfnetExportSnapshotApi = {
    exportSnapshot(config?: ExportSnapshotConfig): Record<string, unknown>;
};
