import { localValidatorPlugin } from '@kit-helpers/local-validator';
import { transactionBuilderPlugin } from '@kit-helpers/transaction-builder';
import { getAddMemoInstruction } from '@solana-program/memo';
import { createClient, lamports, type Signature } from '@solana/kit';
import { airdrop } from '@solana/kit-plugin-airdrop';
import { generatedPayerWithSol } from '@solana/kit-plugin-payer';
import { localhostRpc } from '@solana/kit-plugin-rpc';

const validatorClient = createClient().use(localValidatorPlugin());

async function main() {
    await validatorClient.startValidator({ stopIfRunning: true, reset: true });

    const client = await createClient()
        .use(localhostRpc())
        .use(airdrop())
        .use(generatedPayerWithSol(lamports(10_000_000_000n)))
        .use(transactionBuilderPlugin({ estimateMargin: 0 }));

    const signature = (await client
        .createTransaction()
        .add(getAddMemoInstruction({ memo: 'Hello from transaction builder plugin!' }))
        .setPriorityFeeLamports(5_000n)
        .execute()) as Signature;
    console.log('Transaction confirmed:', signature);

    const fetched = await client.rpc
        .getTransaction(signature, {
            commitment: 'confirmed',
            encoding: 'json',
            maxSupportedTransactionVersion: 1,
        })
        .send();

    console.log('Reported version:', fetched?.version);
    console.log('Declared compute budget:', fetched?.transaction.message.transactionConfig);

    const v0Client = await createClient()
        .use(localhostRpc())
        .use(airdrop())
        .use(generatedPayerWithSol(lamports(10_000_000_000n)))
        .use(transactionBuilderPlugin({ estimateMargin: 0, minPriorityFee: lamports(10n), version: 0 }));

    const v0Signature = await v0Client
        .createTransaction()
        .add(getAddMemoInstruction({ memo: 'Hello from a version 0 transaction!' }))
        .execute();
    console.log('Version 0 transaction confirmed:', v0Signature);
}

main()
    .catch(console.error)
    .finally(() => {
        validatorClient.stopValidator();
    });
