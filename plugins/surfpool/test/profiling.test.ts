import { describe, expect, test } from 'vitest';

import { testClient } from './helpers/client';

const { surfnet } = testClient;

describe('Transaction profiling', () => {
    // Profiling tests require a real base64-encoded transaction.
    // These tests validate the RPC contract; full integration requires
    // a signed transaction fixture.

    describe('surfnet_getProfileResultsByTag', () => {
        test('returns null for unknown tag', async () => {
            const results = await surfnet.getProfileResultsByTag('__nonexistent_tag__').send();
            expect(results).toBeNull();
        });
    });

    // TODO: Add surfnet_profileTransaction and surfnet_getTransactionProfile
    // tests once a transaction fixture is available. These need a valid
    // base64-encoded VersionedTransaction to exercise the profiler.
});
