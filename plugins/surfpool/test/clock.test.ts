import { afterAll, describe, expect, test } from 'vitest';

import { testClient } from './helpers/client';
import { assertClockState } from './helpers/assertions';

const { rpc, surfnet } = testClient;

async function currentEpoch(): Promise<number> {
    const info = await rpc.getEpochInfo().send();
    return Number(info.epoch);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Clock control', () => {
    afterAll(async () => {
        try {
            await surfnet.resumeClock().send();
        } catch {
            // ignore if already running
        }
    });

    describe('surfnet_timeTravel', () => {
        test('travels forward to a future epoch', async () => {
            const targetEpoch = (await currentEpoch()) + 100;
            const result = await surfnet.timeTravel({ absoluteEpoch: targetEpoch }).send();

            assertClockState(result);
            expect(result.epoch).toBe(targetEpoch);
        });

        test('travels to an absolute slot', async () => {
            const info = await rpc.getEpochInfo().send();
            const targetSlot = Number(info.absoluteSlot) + 100_000;
            const result = await surfnet.timeTravel({ absoluteSlot: targetSlot }).send();

            assertClockState(result);
            expect(result.absoluteSlot).toBe(targetSlot);
        });

        test('clock state is reflected by getEpochInfo', async () => {
            const target = (await currentEpoch()) + 50;
            await surfnet.timeTravel({ absoluteEpoch: target }).send();

            const epochInfo = await rpc.getEpochInfo().send();
            expect(Number(epochInfo.epoch)).toBe(target);
        });

        test('throws when traveling to a past epoch', async () => {
            await expect(surfnet.timeTravel({ absoluteEpoch: 0 }).send()).rejects.toThrow();
        });
    });

    describe('surfnet_pauseClock', () => {
        test('returns clock state on pause', async () => {
            const result = await surfnet.pauseClock().send();
            assertClockState(result);
        });

        test('clock does not advance while paused', async () => {
            await surfnet.pauseClock().send();
            const before = await rpc.getSlot().send();
            await sleep(500);
            const after = await rpc.getSlot().send();
            expect(after).toBe(before);
            await surfnet.resumeClock().send();
        });
    });

    describe('surfnet_resumeClock', () => {
        test('returns clock state on resume', async () => {
            await surfnet.pauseClock().send();
            const result = await surfnet.resumeClock().send();
            assertClockState(result);
        });
    });
});
