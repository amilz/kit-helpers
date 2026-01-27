/**
 * 07 - Sysvars
 *
 * This example demonstrates sysvar access with LiteSVM:
 * - Rent sysvar
 * - Epoch schedule sysvar
 * - Epoch rewards
 * - Slot hashes
 */

import { createEmptyClient } from '@solana/kit';
import { litesvm } from '@solana/kit-plugins';

async function main() {
    console.log('=== Sysvars Example ===\n');

    const client = createEmptyClient().use(litesvm());

    // Enable sysvars
    client.svm.withSysvars();

    // 1. Rent Sysvar
    console.log('--- Rent Sysvar ---');
    const rent = client.svm.getRent();
    console.log('Rent values:');
    console.log('  Lamports per byte-year:', rent.lamportsPerByteYear);
    console.log('  Exemption threshold:', rent.exemptionThreshold);
    console.log('  Burn percent:', rent.burnPercent);

    // Calculate rent-exempt minimum for different data sizes
    console.log('\nRent-exempt minimums:');
    for (const size of [0n, 100n, 1000n, 10000n]) {
        const min = client.svm.minimumBalanceForRentExemption(size);
        console.log(`  ${size} bytes: ${min} lamports (${Number(min) / 1e9} SOL)`);
    }

    // 2. Epoch Schedule
    console.log('\n--- Epoch Schedule ---');
    const epochSchedule = client.svm.getEpochSchedule();
    console.log('Epoch schedule:');
    console.log('  Slots per epoch:', epochSchedule.slotsPerEpoch);
    console.log('  Leader schedule slot offset:', epochSchedule.leaderScheduleSlotOffset);
    console.log('  Warmup:', epochSchedule.warmup);
    console.log('  First normal epoch:', epochSchedule.firstNormalEpoch);
    console.log('  First normal slot:', epochSchedule.firstNormalSlot);

    // 3. Epoch Rewards
    console.log('\n--- Epoch Rewards ---');
    const epochRewards = client.svm.getEpochRewards();
    console.log('Epoch rewards:');
    console.log('  Distribution starting block height:', epochRewards.distributionStartingBlockHeight);
    console.log('  Num partitions:', epochRewards.numPartitions);
    console.log('  Total points:', epochRewards.totalPoints);
    console.log('  Total rewards:', epochRewards.totalRewards);
    console.log('  Distributed rewards:', epochRewards.distributedRewards);
    console.log('  Active:', epochRewards.active);

    // 4. Slot Hashes
    console.log('\n--- Slot Hashes ---');
    const slotHashes = client.svm.getSlotHashes();
    console.log('Slot hashes count:', slotHashes.length);
    if (slotHashes.length > 0) {
        console.log('First slot hash:');
        console.log('  Slot:', slotHashes[0].slot);
        console.log('  Hash:', slotHashes[0].hash);
    }

    // 5. Slot History
    console.log('\n--- Slot History ---');
    const slotHistory = client.svm.getSlotHistory();
    console.log('Slot history:');
    console.log('  Next slot:', slotHistory.nextSlot);

    // 6. Stake History
    console.log('\n--- Stake History ---');
    const stakeHistory = client.svm.getStakeHistory();
    console.log('Stake history entries:', stakeHistory.length);

    console.log('\n--- Summary ---');
    console.log('Sysvars provide access to network state:');
    console.log('  - Rent: Calculate rent-exempt balances');
    console.log('  - EpochSchedule: Understand epoch boundaries');
    console.log('  - EpochRewards: Staking reward distribution');
    console.log('  - SlotHashes: Recent slot hashes');
    console.log('  - SlotHistory: Slot history bitmap');
    console.log('  - StakeHistory: Historical stake data');
}

main().catch(console.error);
