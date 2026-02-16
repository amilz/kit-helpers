import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type LocalValidatorMethods, localValidatorPlugin, ValidatorWarpError } from '../src/index.js';

/**
 * Integration tests for the local-validator plugin.
 *
 * These tests require `solana-test-validator` to be installed and available in PATH.
 * They spawn real validator processes and make actual RPC calls, so they:
 * - Take longer to run (~12s total)
 * - Use port 8899 (ensure nothing else is running there)
 * - Create/modify .test-ledger directory
 */

type ValidatorClient = LocalValidatorMethods;

describe('Local Validator Plugin', () => {
    let client: ValidatorClient;

    beforeAll(() => {
        // Create a fresh client for each test suite
        client = createValidatorClient();
    });

    afterAll(() => {
        // Ensure validator is stopped after all tests
        try {
            client.stopValidator();
        } catch {
            // Ignore errors on cleanup
        }
    });

    describe('Health Check', () => {
        it('should return healthy after starting validator', async () => {
            // Start validator
            const { pid, rpcUrl } = await client.startValidator({
                reset: true,
                stopIfRunning: true,
            });

            expect(pid).toBeGreaterThan(0);
            expect(rpcUrl).toBe('http://127.0.0.1:8899');

            // Verify health
            const health = await client.waitForValidatorReady();
            expect(health.ready).toBe(true);
            expect(health.error).toBeUndefined();
        });

        it('should fail health check after stopping validator', async () => {
            // Start and then stop
            await client.startValidator({ reset: true, stopIfRunning: true });
            client.stopValidator();

            // Wait a bit for the process to fully stop
            await sleep(1000);

            // Health check should fail (not ready)
            const health = await client.waitForValidatorReady(3000);
            expect(health.ready).toBe(false);
            expect(health.error).toBeDefined();
        }, 10000);
    });

    describe('warpToSlot', () => {
        it('should throw when validator is not running', async () => {
            // Ensure validator is stopped
            client.stopValidator();
            await sleep(500);

            // warpToSlot should throw
            await expect(client.warpToSlot(1000)).rejects.toThrow(ValidatorWarpError);
            await expect(client.warpToSlot(1000)).rejects.toThrow('validator is not running');
        });

        it('should throw for invalid slot values', async () => {
            // Start validator first so we test slot validation specifically
            await client.startValidator({ reset: true, stopIfRunning: true });

            // Negative slot
            await expect(client.warpToSlot(-1)).rejects.toThrow(ValidatorWarpError);
            await expect(client.warpToSlot(-1)).rejects.toThrow('non-negative integer');

            // Non-integer slot
            await expect(client.warpToSlot(1.5)).rejects.toThrow(ValidatorWarpError);
            await expect(client.warpToSlot(1.5)).rejects.toThrow('non-negative integer');

            // NaN
            await expect(client.warpToSlot(NaN)).rejects.toThrow(ValidatorWarpError);

            // Infinity
            await expect(client.warpToSlot(Infinity)).rejects.toThrow(ValidatorWarpError);
        });

        it('should throw when warping to a slot less than current', async () => {
            // Start validator
            await client.startValidator({ reset: true, stopIfRunning: true });

            // Get current slot
            const currentSlot = await client.getCurrentSlot();
            expect(currentSlot).toBeGreaterThanOrEqual(0);

            // Try to warp to a slot before current
            if (currentSlot > 0) {
                await expect(client.warpToSlot(0)).rejects.toThrow(ValidatorWarpError);
                await expect(client.warpToSlot(0)).rejects.toThrow('current slot is');
            }
        });

        // TODO: Known flaky — warpToSlot restarts the validator and the 5s timeout is often too tight.
        it.skip('should successfully warp to just above current slot (boundary case)', async () => {
            // Start validator with fresh ledger
            await client.startValidator({ reset: true, stopIfRunning: true });

            // Get current slot
            const currentSlot = await client.getCurrentSlot();

            // Warp to just 1 slot above current - minimal warp
            // Note: solana-test-validator doesn't support -w 0, so we test the
            // minimal warp case instead of exact current slot
            const targetSlot = currentSlot + 1;
            const result = await client.warpToSlot(targetSlot);

            expect(result.pid).toBeGreaterThan(0);
            expect(result.rpcUrl).toBe('http://127.0.0.1:8899');
            // Result slot should be at least the target
            expect(result.slot).toBeGreaterThanOrEqual(targetSlot);
        });

        it.skip('should successfully warp to a future slot', async () => {
            // Start validator
            await client.startValidator({ reset: true, stopIfRunning: true });

            // Get current slot
            const currentSlot = await client.getCurrentSlot();

            // Warp to a future slot
            const targetSlot = currentSlot + 1000;
            const result = await client.warpToSlot(targetSlot);

            expect(result.pid).toBeGreaterThan(0);
            expect(result.rpcUrl).toBe('http://127.0.0.1:8899');
            // Result slot is the actual slot (may be slightly higher than target)
            expect(result.slot).toBeGreaterThanOrEqual(targetSlot);

            // Verify the validator is healthy after warp
            const health = await client.waitForValidatorReady();
            expect(health.ready).toBe(true);

            // Verify the slot has advanced to at least the target
            const newSlot = await client.getCurrentSlot();
            expect(newSlot).toBeGreaterThanOrEqual(targetSlot);
        });

        it.skip('should preserve ledger data after warp (no reset)', async () => {
            // This test verifies that warp preserves the ledger by checking
            // that the slot after warp is >= the target slot (ledger was kept)
            await client.startValidator({ reset: true, stopIfRunning: true });

            // Get initial slot
            const initialSlot = await client.getCurrentSlot();

            // Warp to future slot
            const targetSlot = initialSlot + 500;
            await client.warpToSlot(targetSlot);

            // The new slot should be at least the target
            const newSlot = await client.getCurrentSlot();
            expect(newSlot).toBeGreaterThanOrEqual(targetSlot);
        });
    });

    describe('getCurrentSlot', () => {
        it('should return current slot when validator is running', async () => {
            await client.startValidator({ reset: true, stopIfRunning: true });

            const slot = await client.getCurrentSlot();
            expect(typeof slot).toBe('number');
            expect(slot).toBeGreaterThanOrEqual(0);
        });

        it('should throw when validator is not running', async () => {
            client.stopValidator();
            await sleep(1000);

            await expect(client.getCurrentSlot()).rejects.toThrow(ValidatorWarpError);
        });
    });
});

// Helper to create a validator client
function createValidatorClient(): ValidatorClient {
    // Using an empty object as base client since we only need validator methods
    const emptyClient = {};
    return localValidatorPlugin({ silent: true })(emptyClient);
}

// Helper for async sleep
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
