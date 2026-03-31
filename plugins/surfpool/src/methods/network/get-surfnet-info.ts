export type RunbookExecution = Readonly<{
    completedAt: number | string;
    errors: readonly unknown[];
    runbookId: string;
    startedAt: number | string;
}>;

export type SurfnetInfo = Readonly<{
    runbookExecutions: readonly RunbookExecution[];
}>;

export type SurfnetGetSurfnetInfoApi = {
    getSurfnetInfo(): SurfnetInfo;
};
