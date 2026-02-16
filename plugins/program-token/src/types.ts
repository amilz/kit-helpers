import type { WalletApi } from '@kit-helpers/wallet';
import type { Address, Instruction, OptionOrNullable, TransactionSigner } from '@solana/kit';

/** Client requirements for the token program plugin. */
export type TokenProgramClientRequirements = {
    payer?: TransactionSigner;
    wallet?: WalletApi;
};

/** The token program namespace added by the plugin. */
export type TokenProgramNamespace = {
    burn(input: {
        account: Address;
        amount: bigint | number;
        authority: Address | TransactionSigner;
        mint: Address;
    }): Instruction;

    createAta(input: { ata: Address; mint: Address; owner: Address; payer: TransactionSigner }): Instruction;

    createAtaAsync(input: { mint: Address; owner: Address; payer?: TransactionSigner }): Promise<Instruction>;

    initializeMint(input: {
        decimals: number;
        freezeAuthority?: OptionOrNullable<Address>;
        mint: Address;
        mintAuthority: Address;
    }): Instruction;

    mintTo(input: {
        amount: bigint | number;
        mint: Address;
        mintAuthority: Address | TransactionSigner;
        token: Address;
    }): Instruction;

    transfer(input: {
        amount: bigint | number;
        authority: Address | TransactionSigner;
        destination: Address;
        source: Address;
    }): Instruction;

    transferChecked(input: {
        amount: bigint | number;
        authority: Address | TransactionSigner;
        decimals: number;
        destination: Address;
        mint: Address;
        source: Address;
    }): Instruction;
};
