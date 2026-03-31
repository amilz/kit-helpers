import type { ProfileTransactionConfig, TransactionProfileResult } from './profile-transaction';

export type SurfnetGetProfileResultsByTagApi = {
    getProfileResultsByTag(tag: string, config?: ProfileTransactionConfig): readonly TransactionProfileResult[];
};
