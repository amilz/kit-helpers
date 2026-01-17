import {
    Address,
    appendTransactionMessageInstructions,
    assertIsTransactionWithBlockhashLifetime,
    Blockhash,
    createTransactionMessage,
    generateKeyPairSigner,
    getSignatureFromTransaction,
    Instruction,
    KeyPairSigner,
    pipe,
    Rpc,
    RpcSubscriptions,
    sendAndConfirmTransactionFactory,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    Signature,
    signTransactionMessageWithSigners,
    SolanaRpcApi,
    SolanaRpcSubscriptionsApi,
    TransactionSigner,
} from '@solana/kit';
import { getCreateAccountInstruction } from '@solana-program/system';
import {
    findAssociatedTokenPda,
    getCreateAssociatedTokenIdempotentInstruction,
    getInitializeMintInstruction,
    getMintSize,
    getMintToInstruction,
    TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token';

import type { AirdropTokenClientProperties, CreateTestTokenFunction, TestTokenConfig, TokenProgramId } from './types';

/** Client requirements for RPC-based token creation */
type RpcClient = {
    payer: TransactionSigner;
    rpc: Rpc<SolanaRpcApi>;
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
};

/** Signed transaction type from Kit */
type SignedTransaction = Awaited<ReturnType<typeof signTransactionMessageWithSigners>>;

/** Client requirements for LiteSVM-based token creation */
type LiteSVMClient = {
    payer: TransactionSigner;
    svm: {
        getLatestBlockhash: () => { blockhash: string; lastValidBlockHeight: bigint };
        minimumBalanceForRentExemption: (size: bigint) => bigint;
        sendTransaction: (tx: SignedTransaction) => string;
    };
};

/**
 * A plugin that adds a `createTestToken` method to the client for quickly
 * creating token mints with ATAs for testing purposes.
 *
 * This will use LiteSVM if available, otherwise falls back to RPC.
 *
 * Supports both Token Program and Token-2022 Program. Note that Token-2022
 * support is limited to basic mints without extensions.
 *
 * @example
 * RPC-based token creation.
 * ```ts
 * import { createEmptyClient, lamports } from '@solana/kit';
 * import { localhostRpc, generatedPayerWithSol } from '@solana/kit-plugins';
 * import { testTokenPlugin } from '@kit-helpers/airdrop-token';
 *
 * const client = await createEmptyClient()
 *     .use(localhostRpc())
 *     .use(generatedPayerWithSol(lamports(1_000_000_000n)))
 *     .use(testTokenPlugin());
 *
 * // Create a test token with defaults (9 decimals, 1 token minted)
 * const { mint, ata, signature } = await client.createTestToken();
 *
 * // Create with custom config
 * const result = await client.createTestToken({
 *     decimals: 6,
 *     amount: 1_000_000_000_000n, // 1 million tokens
 *     programId: TOKEN_2022_PROGRAM_ADDRESS,
 * });
 * ```
 *
 * @example
 * LiteSVM-based token creation.
 * ```ts
 * import { createEmptyClient } from '@solana/kit';
 * import { litesvm, generatedPayer } from '@solana/kit-plugins';
 * import { testTokenPlugin } from '@kit-helpers/airdrop-token';
 *
 * const client = createEmptyClient()
 *     .use(litesvm())
 *     .use(generatedPayer())
 *     .use(testTokenPlugin());
 *
 * const { mint, ata } = await client.createTestToken();
 * ```
 */
export function testTokenPlugin() {
    return <T extends LiteSVMClient | RpcClient>(client: T): T & { createTestToken: CreateTestTokenFunction } => {
        const createTestToken: CreateTestTokenFunction = async (config = {}) => {
            const {
                programId = TOKEN_PROGRAM_ADDRESS as TokenProgramId,
                decimals = 9,
                amount = 1_000_000_000n,
                mintAuthority,
                freezeAuthority,
                mintKeypair,
            } = config;

            // Validate config
            if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
                throw new Error(`Invalid decimals: ${decimals}. Must be an integer between 0 and 255.`);
            }
            if (amount < 0n) {
                throw new Error(`Invalid amount: ${amount}. Must be a non-negative bigint.`);
            }

            // Generate or use provided mint keypair
            let mint: KeyPairSigner;
            try {
                mint = mintKeypair ?? (await generateKeyPairSigner());
            } catch (error) {
                throw new Error(`Failed to generate mint keypair: ${String(error)}`);
            }
            const authority = mintAuthority ?? client.payer;

            // Derive ATA for the payer
            let ata: Address;
            try {
                [ata] = await findAssociatedTokenPda({
                    mint: mint.address,
                    owner: client.payer.address,
                    tokenProgram: programId,
                });
            } catch (error) {
                throw new Error(`Failed to derive ATA address: ${String(error)}`);
            }

            // Build instructions
            const instructions = await buildInstructions({
                amount,
                ata,
                authority,
                client,
                decimals,
                freezeAuthority,
                mint,
                programId,
            });

            // Execute transaction
            const signature = await executeTransaction(client, instructions);

            return {
                ata,
                mint: mint.address,
                mintAuthority: authority.address,
                signature,
            };
        };

        return { ...client, createTestToken };
    };
}

/**
 * A plugin that creates a test token during `.use()` and adds the token
 * properties directly to the client. Similar to `airdrop()` but for tokens.
 *
 * Use this when you want a token ready immediately without calling a method.
 *
 * @param config - Optional configuration for the token (decimals, amount, etc.)
 *
 * @example
 * ```ts
 * import { createEmptyClient, lamports } from '@solana/kit';
 * import { localhostRpc, generatedPayerWithSol } from '@solana/kit-plugins';
 * import { airdropToken } from '@kit-helpers/airdrop-token';
 *
 * const client = await createEmptyClient()
 *     .use(localhostRpc())
 *     .use(generatedPayerWithSol(lamports(1_000_000_000n)))
 *     .use(airdropToken({ decimals: 6, amount: 1_000_000_000_000n }));
 *
 * // Token is already created and accessible on the client
 * console.log(client.mint);           // Address
 * console.log(client.ata);            // Address
 * console.log(client.mintAuthority);  // Address
 * ```
 */
export function airdropToken(config: TestTokenConfig = {}) {
    return async <T extends LiteSVMClient | RpcClient>(client: T): Promise<AirdropTokenClientProperties & T> => {
        const {
            programId = TOKEN_PROGRAM_ADDRESS as TokenProgramId,
            decimals = 9,
            amount = 1_000_000_000n,
            mintAuthority,
            freezeAuthority,
            mintKeypair,
        } = config;

        // Validate config
        if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
            throw new Error(`Invalid decimals: ${decimals}. Must be an integer between 0 and 255.`);
        }
        if (amount < 0n) {
            throw new Error(`Invalid amount: ${amount}. Must be a non-negative bigint.`);
        }

        // Generate or use provided mint keypair
        let mint: KeyPairSigner;
        try {
            mint = mintKeypair ?? (await generateKeyPairSigner());
        } catch (error) {
            throw new Error(`Failed to generate mint keypair: ${String(error)}`);
        }
        const authority = mintAuthority ?? client.payer;

        // Derive ATA for the payer
        let ata: Address;
        try {
            [ata] = await findAssociatedTokenPda({
                mint: mint.address,
                owner: client.payer.address,
                tokenProgram: programId,
            });
        } catch (error) {
            throw new Error(`Failed to derive ATA address: ${String(error)}`);
        }

        // Build instructions
        const instructions = await buildInstructions({
            amount,
            ata,
            authority,
            client,
            decimals,
            freezeAuthority,
            mint,
            programId,
        });

        // Execute transaction
        await executeTransaction(client, instructions);

        // Return client with token properties
        return {
            ...client,
            ata,
            mint: mint.address,
            mintAuthority: authority.address,
        };
    };
}

/** Build the instructions for creating a test token */
async function buildInstructions(params: {
    amount: bigint;
    ata: Address;
    authority: TransactionSigner;
    client: LiteSVMClient | RpcClient;
    decimals: number;
    freezeAuthority?: Address;
    mint: TransactionSigner;
    programId: TokenProgramId;
}): Promise<Instruction[]> {
    const { client, mint, authority, ata, programId, decimals, amount, freezeAuthority } = params;

    // Get rent-exempt balance for mint account
    const mintSize = getMintSize();
    const rentLamports = await getRentExemptBalance(client, BigInt(mintSize));

    const instructions: Instruction[] = [
        // 1. Create mint account
        getCreateAccountInstruction({
            lamports: rentLamports,
            newAccount: mint,
            payer: client.payer,
            programAddress: programId,
            space: mintSize,
        }),

        // 2. Initialize mint
        getInitializeMintInstruction(
            {
                decimals,
                freezeAuthority: freezeAuthority ?? null,
                mint: mint.address,
                mintAuthority: authority.address,
            },
            { programAddress: programId },
        ),

        // 3. Create ATA (idempotent - safe if exists)
        getCreateAssociatedTokenIdempotentInstruction({
            ata,
            mint: mint.address,
            owner: client.payer.address,
            payer: client.payer,
            tokenProgram: programId,
        }),

        // 4. Mint tokens to ATA
        getMintToInstruction(
            {
                amount,
                mint: mint.address,
                mintAuthority: authority,
                token: ata,
            },
            { programAddress: programId },
        ),
    ];

    return instructions;
}

/** Get rent-exempt balance - handles both LiteSVM and RPC */
async function getRentExemptBalance(client: LiteSVMClient | RpcClient, size: bigint): Promise<bigint> {
    try {
        if ('svm' in client) {
            return client.svm.minimumBalanceForRentExemption(size);
        }
        return await client.rpc.getMinimumBalanceForRentExemption(size).send();
    } catch (error) {
        throw new Error(`Failed to get rent-exempt balance for mint account: ${String(error)}`);
    }
}

/** Execute transaction - handles both LiteSVM and RPC */
async function executeTransaction(client: LiteSVMClient | RpcClient, instructions: Instruction[]): Promise<Signature> {
    if ('svm' in client) {
        return await executeLiteSVMTransaction(client, instructions);
    }
    return await executeRpcTransaction(client, instructions);
}

/** Execute transaction via LiteSVM */
async function executeLiteSVMTransaction(client: LiteSVMClient, instructions: Instruction[]): Promise<Signature> {
    const latestBlockhash = client.svm.getLatestBlockhash();

    const message = pipe(
        createTransactionMessage({ version: 0 }),
        m => setTransactionMessageFeePayerSigner(client.payer, m),
        m =>
            setTransactionMessageLifetimeUsingBlockhash(
                {
                    blockhash: latestBlockhash.blockhash as Blockhash,
                    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                },
                m,
            ),
        m => appendTransactionMessageInstructions(instructions, m),
    );

    let signedTx: Awaited<ReturnType<typeof signTransactionMessageWithSigners>>;
    try {
        signedTx = await signTransactionMessageWithSigners(message);
    } catch (error) {
        throw new Error(`Failed to sign test token transaction: ${String(error)}`);
    }

    const signature = getSignatureFromTransaction(signedTx);

    try {
        const result = client.svm.sendTransaction(signedTx);
        if (!result) {
            throw new Error('No signature returned');
        }
    } catch (error) {
        throw new Error(`Failed to send test token transaction via LiteSVM: ${String(error)}`);
    }

    return signature;
}

/** Execute transaction via RPC */
async function executeRpcTransaction(client: RpcClient, instructions: Instruction[]): Promise<Signature> {
    let latestBlockhash: { blockhash: Blockhash; lastValidBlockHeight: bigint };
    try {
        const response = await client.rpc.getLatestBlockhash().send();
        latestBlockhash = response.value;
    } catch (error) {
        throw new Error(`Failed to get latest blockhash for test token transaction: ${String(error)}`);
    }

    const message = pipe(
        createTransactionMessage({ version: 0 }),
        m => setTransactionMessageFeePayerSigner(client.payer, m),
        m => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        m => appendTransactionMessageInstructions(instructions, m),
    );

    let signedTx: Awaited<ReturnType<typeof signTransactionMessageWithSigners>>;
    try {
        signedTx = await signTransactionMessageWithSigners(message);
    } catch (error) {
        throw new Error(`Failed to sign test token transaction: ${String(error)}`);
    }

    const sendAndConfirm = sendAndConfirmTransactionFactory({
        rpc: client.rpc,
        rpcSubscriptions: client.rpcSubscriptions,
    });

    assertIsTransactionWithBlockhashLifetime(signedTx);

    try {
        await sendAndConfirm(signedTx, { commitment: 'confirmed' });
    } catch (error) {
        throw new Error(`Failed to send and confirm test token transaction: ${String(error)}`);
    }

    return getSignatureFromTransaction(signedTx);
}

// Re-export program addresses for convenience
export { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
export { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';
