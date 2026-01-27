/**
 * 06 - Clock Manipulation
 *
 * This example demonstrates time manipulation with LiteSVM:
 * - warpToSlot: Jump to a specific slot
 * - getClock: Get current clock values
 * - Useful for testing time-dependent programs
 */

import { createEmptyClient } from '@solana/kit';
import { litesvm } from '@solana/kit-plugins';

async function main() {
    console.log('=== Clock Manipulation Example ===\n');

    const client = createEmptyClient().use(litesvm());

    // Enable sysvars for clock access
    client.svm.withSysvars();

    // Get the initial clock state
    console.log('--- Initial Clock State ---');
    const initialClock = client.svm.getClock();
    console.log('Clock values:');
    console.log('  Slot:', initialClock.slot);
    console.log('  Epoch start timestamp:', initialClock.epochStartTimestamp);
    console.log('  Epoch:', initialClock.epoch);
    console.log('  Leader schedule epoch:', initialClock.leaderScheduleEpoch);
    console.log('  Unix timestamp:', initialClock.unixTimestamp);

    // Warp to a specific slot - this is the primary way to manipulate time
    console.log('\n--- Warp to Slot 1000 ---');
    client.svm.warpToSlot(1000n);

    const clockAfterWarp = client.svm.getClock();
    console.log('After warpToSlot(1000):');
    console.log('  Slot:', clockAfterWarp.slot);
    console.log('  Epoch:', clockAfterWarp.epoch);
    console.log('  Unix timestamp:', clockAfterWarp.unixTimestamp);

    // Warp further forward
    console.log('\n--- Warp to Slot 10000 ---');
    client.svm.warpToSlot(10000n);

    const clockAfterWarp2 = client.svm.getClock();
    console.log('After warpToSlot(10000):');
    console.log('  Slot:', clockAfterWarp2.slot);
    console.log('  Epoch:', clockAfterWarp2.epoch);

    // Example: Testing time-locked functionality
    console.log('\n--- Use Case: Testing Time Locks ---');
    console.log('Use warpToSlot to advance time for testing:');
    console.log('  - Token vesting schedules');
    console.log('  - Time-locked withdrawals');
    console.log('  - Epoch-based reward distribution');
    console.log('  - Slot-based auction endings');
    console.log('');
    console.log('Example flow:');
    console.log('  1. Set up a time-locked account');
    console.log('  2. Try to withdraw (should fail - too early)');
    console.log('  3. client.svm.warpToSlot(unlockSlot)');
    console.log('  4. Try to withdraw again (should succeed)');

    // Get last restart slot
    console.log('\n--- Last Restart Slot ---');
    const lastRestartSlot = client.svm.getLastRestartSlot();
    console.log('Last restart slot:', lastRestartSlot);

    // Set last restart slot
    client.svm.setLastRestartSlot(500n);
    const newRestartSlot = client.svm.getLastRestartSlot();
    console.log('After setLastRestartSlot(500):', newRestartSlot);
}

main().catch(console.error);
