import { createEmptyClient, generateKeyPairSigner, lamports, type Nonce } from '@solana/kit';
import { getAddMemoInstruction } from '@solana-program/memo';
import {
    fetchNonce,
    getCreateAccountInstruction,
    getInitializeNonceAccountInstruction,
    getNonceSize,
    SYSTEM_PROGRAM_ADDRESS,
} from '@solana-program/system';
import { transactionBuilderPlugin } from '@kit-helpers/transaction-builder';
import { localValidatorPlugin } from '@kit-helpers/local-validator';
import { generatedPayerWithSol, airdrop, localhostRpc } from '@solana/kit-plugins';

const NUM_MEMO_TRANSACTIONS = 10;

const validatorClient = createEmptyClient()
    .use(localValidatorPlugin({ manageExternal: true }))
    .use(localhostRpc());

async function main() {
    // Set up validator control separately (sync plugins)
    await validatorClient.startValidator({ stopIfRunning: true, reset: true });
    // Chain async plugins for the full client
    const client = await validatorClient
        .use(airdrop())
        .use(generatedPayerWithSol(lamports(10_000_000_000n)))
        .use(transactionBuilderPlugin({ estimateMargin: 0, minPriorityFee: lamports(10n) }));

    console.log(`Payer: ${client.payer.address}`);

    // ─────────────────────────────────────────────────────────────
    // Step 1: Create a Nonce Account
    // ─────────────────────────────────────────────────────────────
    console.log('\nCreating nonce account...');

    const nonceKeypair = await generateKeyPairSigner();
    console.log(`  Nonce account address: ${nonceKeypair.address}`);

    const space = BigInt(getNonceSize());
    const rentResponse = await client.rpc.getMinimumBalanceForRentExemption(space).send();
    const rent = lamports(rentResponse);

    const createAccountIx = getCreateAccountInstruction({
        payer: client.payer,
        newAccount: nonceKeypair,
        lamports: rent,
        space,
        programAddress: SYSTEM_PROGRAM_ADDRESS,
    });

    const initNonceIx = getInitializeNonceAccountInstruction({
        nonceAccount: nonceKeypair.address,
        nonceAuthority: client.payer.address,
    });

    const createNonceSig = await client.createTransaction().add(createAccountIx).add(initNonceIx).execute();

    console.log(`  Nonce account created: ${createNonceSig}`);

    // ─────────────────────────────────────────────────────────────
    // Step 2: Send multiple memo transactions using durable nonces
    // ─────────────────────────────────────────────────────────────
    console.log(`\nSending ${NUM_MEMO_TRANSACTIONS} memo transactions using durable nonces...`);

    const signatures: string[] = [];
    const runId = Date.now().toString(36);

    for (let i = 1; i <= NUM_MEMO_TRANSACTIONS; i++) {
        // Fetch current nonce value
        const {
            data: { blockhash },
        } = await fetchNonce(client.rpc, nonceKeypair.address, { commitment: 'processed' });
        const nonce = blockhash as string as Nonce;
        console.log(`\n  [${i}/${NUM_MEMO_TRANSACTIONS}] Nonce: ${(nonce as string).slice(0, 16)}...`);

        // Build memo instruction with unique identifier
        const memoId = `durable-nonce-test:${runId}:${i.toString().padStart(2, '0')}`;
        const memoIx = getAddMemoInstruction({ memo: memoId });

        // Build, sign, send and confirm using the transaction builder
        const signature = await client
            .createTransaction()
            .useNonce({
                nonce,
                nonceAccountAddress: nonceKeypair.address,
                nonceAuthorityAddress: client.payer.address,
            })
            .add(memoIx)
            .execute();
        signatures.push(signature);
        console.log(`  Memo "${memoId}" sent: ${signature.slice(0, 32)}...`);
    }

    // ─────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('Done! All transactions confirmed.');
    console.log(`  Run ID: ${runId}`);
    console.log(`  Nonce Account: ${nonceKeypair.address}`);
    console.log(`  Total Transactions: ${signatures.length}`);
    console.log('\nSignatures:');
    signatures.forEach((sig, i) => {
        console.log(`  ${(i + 1).toString().padStart(2, '0')}. ${sig}`);
    });
}

function cleanup() {
    validatorClient.stopValidator();
}

main().catch(console.error).finally(cleanup);
