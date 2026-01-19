import { createEmptyClient } from '@solana/kit';
import { localValidatorPlugin } from '@kit-helpers/local-validator';
import { localhostRpc } from '@solana/kit-plugins';

const TARGET_SLOT = 2026;

const client = createEmptyClient().use(localValidatorPlugin({})).use(localhostRpc());

async function main() {
    console.log('='.repeat(50));
    console.log('Slot Warp Demo');
    console.log('='.repeat(50));

    // Start local validator
    await client.startValidator({ stopIfRunning: true, reset: true });

    // Step 1: Get initial slot
    const initialSlot = await client.rpc.getSlot().send();
    console.log('\n[1] Initial State');
    console.log(`    Current Slot: ${initialSlot.toString()}`);

    // Step 2: Warp to a future slot
    console.log(`\n[2] Warping to Slot ${TARGET_SLOT}...`);
    await client.warpToSlot(TARGET_SLOT);

    // Step 3: Get slot after warp
    const slotAfterWarp = await client.rpc.getSlot().send();
    console.log(`\n[3] After Warp`);
    console.log(`    Current Slot: ${slotAfterWarp.toString()}`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Summary');
    console.log('='.repeat(50));
    console.log(`    Initial Slot:  ${initialSlot.toString()}`);
    console.log(`    Target Slot:   ${TARGET_SLOT}`);
    console.log(`    Final Slot:    ${slotAfterWarp.toString()}`);
    console.log(`    Slots Warped:  ${Number(slotAfterWarp) - Number(initialSlot)}`);
    console.log('='.repeat(50));
}

main()
    .catch(console.error)
    .finally(() => {
        client.stopValidator();
    });
