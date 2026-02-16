import type { WalletApi } from '@kit-helpers/wallet';
import type { Address, Instruction, TransactionSigner } from '@solana/kit';

/** Client requirements for the system program plugin. */
export type SystemProgramClientRequirements = {
    payer?: TransactionSigner;
    wallet?: WalletApi;
};

/** The system program namespace added by the plugin. */
export type SystemProgramNamespace = {
    allocate(input: { newAccount: TransactionSigner; space: bigint | number }): Instruction;
    assign(input: { account: TransactionSigner; programAddress: Address }): Instruction;
    createAccount(input: {
        lamports: bigint | number;
        newAccount: TransactionSigner;
        programAddress: Address;
        space: bigint | number;
    }): Instruction;
    transfer(input: { amount: bigint | number; destination: Address }): Instruction;
};
