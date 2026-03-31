import { describe, expect, test } from 'vitest';

import { testClient } from './helpers/client';
import { assertNullResponse } from './helpers/assertions';

const { surfnet } = testClient;

describe('Network control', () => {
    describe('surfnet_getSurfnetInfo', () => {
        test('returns info object', async () => {
            const info = await surfnet.getSurfnetInfo().send();
            expect(info).toBeDefined();
            expect(info).not.toBeNull();
        });
    });

    describe('surfnet_exportSnapshot', () => {
        test('exports a snapshot object', async () => {
            const snapshot = await surfnet.exportSnapshot().send();
            expect(snapshot).toBeDefined();
            expect(snapshot).not.toBeNull();
        });
    });

    describe('surfnet_setSupply', () => {
        test('sets supply without error', async () => {
            const result = await surfnet.setSupply({ total: 500_000_000_000_000 }).send();
            assertNullResponse(result);
        });
    });

    // resetNetwork runs last — it wipes all state
    describe('surfnet_resetNetwork', () => {
        test('returns null on success', async () => {
            const result = await surfnet.resetNetwork().send();
            assertNullResponse(result);
        });
    });
});
