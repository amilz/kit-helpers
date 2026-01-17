import { createEmptyClient, lamports } from '@solana/kit';
import { getAddMemoInstruction } from '@solana-program/memo';
import { transactionBuilderPlugin } from '@kit-helpers/transaction-builder';
import { localValidatorPlugin } from '@kit-helpers/local-validator';
import { generatedPayerWithSol, airdrop, localhostRpc } from '@solana/kit-plugins';

const validatorClient = createEmptyClient().use(localValidatorPlugin());

async function main() {
    await validatorClient.startValidator({ stopIfRunning: true, reset: true });

    const client = await createEmptyClient()
        .use(localhostRpc())
        .use(airdrop())
        .use(generatedPayerWithSol(lamports(10_000_000_000n)))
        .use(transactionBuilderPlugin({ estimateMargin: 0, minPriorityFee: lamports(10n) }));

    const signature = await client
        .createTransaction()
        .add(getAddMemoInstruction({ memo: 'Hello from transaction builder plugin!' }))
        .execute();
    console.log('Transaction confirmed:', signature);
}

main()
    .catch(console.error)
    .finally(() => {
        validatorClient.stopValidator();
    });
