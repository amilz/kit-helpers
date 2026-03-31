import { describe, expect, test } from 'vitest';

import { testClient } from './helpers/client';

const { surfnet } = testClient;

describe('Local queries', () => {
    describe('surfnet_getLocalSignatures', () => {
        test('returns an array', async () => {
            const sigs = await surfnet.getLocalSignatures().send();
            expect(Array.isArray(sigs)).toBe(true);
        });

        test('each entry has signature, logs, and err fields', async () => {
            const sigs = await surfnet.getLocalSignatures(5).send();
            for (const sig of sigs) {
                expect(typeof sig.signature).toBe('string');
                expect(Array.isArray(sig.logs)).toBe(true);
                expect(sig.err === null || typeof sig.err === 'object').toBe(true);
            }
        });

        test('limit parameter caps results', async () => {
            const limit = 3;
            const sigs = await surfnet.getLocalSignatures(limit).send();
            expect(sigs.length).toBeLessThanOrEqual(limit);
        });
    });
});
