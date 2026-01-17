import { createEmptyClient, generateKeyPairSigner, lamports } from '@solana/kit';
import { localValidatorPlugin } from '@kit-helpers/local-validator';
import { airdropToken } from '@kit-helpers/airdrop-token';
import { transactionBuilderPlugin } from '@kit-helpers/transaction-builder';
import { airdrop, generatedPayerWithSol, localhostRpc } from '@solana/kit-plugins';
import {
    findAssociatedTokenPda,
    getCreateAssociatedTokenIdempotentInstruction,
    getTransferInstruction,
    TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token';

// Validator lifecycle client (separate from main client)
const validatorClient = createEmptyClient().use(localValidatorPlugin());

async function main() {
    // Start local validator
    await validatorClient.startValidator({ stopIfRunning: true, reset: true });

    // Create main client with all plugins
    // airdropToken() creates a token during .use() - similar to airdrop() but for tokens
    const client = await createEmptyClient()
        .use(localhostRpc())
        .use(airdrop())
        .use(generatedPayerWithSol(lamports(10_000_000_000n)))
        .use(airdropToken({ decimals: 6, amount: 1_000_000_000_000n }))
        .use(transactionBuilderPlugin({ estimateMargin: 0, minPriorityFee: lamports(10n) }));

    // Token is already created and accessible on the client!
    console.log('\nToken created during .use():');
    console.log('  Mint:', client.mint);
    console.log('  ATA:', client.ata);
    console.log('  Mint Authority:', client.mintAuthority);

    // Generate a recipient wallet
    const recipient = await generateKeyPairSigner();
    console.log('\nRecipient wallet:', recipient.address);

    // Derive recipient's ATA
    const [recipientAta] = await findAssociatedTokenPda({
        mint: client.mint,
        owner: recipient.address,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    console.log('Recipient ATA:', recipientAta);

    // Transfer tokens using transaction builder
    console.log('\nTransferring 100 tokens to recipient...');
    const transferAmount = 100_000_000n; // 100 tokens (6 decimals)

    const transferSignature = await client
        .createTransaction()
        .add(
            getCreateAssociatedTokenIdempotentInstruction({
                ata: recipientAta,
                mint: client.mint,
                owner: recipient.address,
                payer: client.payer,
                tokenProgram: TOKEN_PROGRAM_ADDRESS,
            }),
        )
        .add(
            getTransferInstruction({
                source: client.ata,
                destination: recipientAta,
                authority: client.payer,
                amount: transferAmount,
            }),
        )
        .execute();

    console.log('Transfer confirmed:', transferSignature);

    // Fetch token balances
    console.log('\nFetching token balances...');
    const payerBalance = await client.rpc.getTokenAccountBalance(client.ata).send();
    const recipientBalance = await client.rpc.getTokenAccountBalance(recipientAta).send();

    console.log('Payer token balance:', payerBalance.value.uiAmountString);
    console.log('Recipient token balance:', recipientBalance.value.uiAmountString);
}

main()
    .catch(console.error)
    .finally(() => {
        validatorClient.stopValidator();
    });
