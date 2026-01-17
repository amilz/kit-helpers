import type { Address, KeyPairSigner, Signature, TransactionSigner } from '@solana/kit';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022';

/** Program ID type - Token or Token-2022 */
export type TokenProgramId = typeof TOKEN_2022_PROGRAM_ADDRESS | typeof TOKEN_PROGRAM_ADDRESS;

/**
 * Configuration for the testToken plugin.
 */
export interface TestTokenConfig {
    /**
     * Amount of tokens to mint to the payer's ATA.
     * @default 1_000_000_000n (1 token with 9 decimals)
     */
    readonly amount?: bigint;

    /**
     * Number of decimals for the mint.
     * @default 9
     */
    readonly decimals?: number;

    /**
     * Optional freeze authority for the mint.
     * @default undefined (no freeze authority)
     */
    readonly freezeAuthority?: Address;

    /**
     * Custom mint authority. If not provided, uses the client's payer.
     */
    readonly mintAuthority?: TransactionSigner;

    /**
     * Custom keypair for the mint account. If not provided, generates a new one.
     */
    readonly mintKeypair?: KeyPairSigner;

    /**
     * Token program to use.
     *
     * Note: When using TOKEN_2022_PROGRAM_ADDRESS, this plugin only supports
     * basic Token-2022 mints without extensions. For mints with extensions
     * (e.g., transfer fees, interest-bearing), use the @solana-program/token-2022
     * instruction builders directly.
     *
     * @default TOKEN_PROGRAM_ADDRESS (classic Token Program)
     */
    readonly programId?: TokenProgramId;
}

/**
 * Result returned by createTestToken().
 */
export interface TestTokenResult {
    /** The payer's associated token account address */
    readonly ata: Address;

    /** The mint address */
    readonly mint: Address;

    /** The mint authority address */
    readonly mintAuthority: Address;

    /** Transaction signature */
    readonly signature: Signature;
}

/**
 * Function type for the createTestToken method added to the client.
 */
export type CreateTestTokenFunction = (config?: TestTokenConfig) => Promise<TestTokenResult>;

/**
 * Properties added to the client by airdropToken().
 */
export interface AirdropTokenClientProperties {
    /** The payer's associated token account address */
    readonly ata: Address;

    /** The mint address */
    readonly mint: Address;

    /** The mint authority address */
    readonly mintAuthority: Address;
}
