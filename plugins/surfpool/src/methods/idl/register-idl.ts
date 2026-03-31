import type { Address } from '@solana/kit';

export type IdlMetadata = Readonly<{
    description?: string;
    name: string;
    spec: string;
    version: string;
}>;

export type AnchorIdl = Readonly<{
    accounts?: readonly unknown[];
    address: Address;
    constants?: readonly unknown[];
    errors?: readonly unknown[];
    events?: readonly unknown[];
    instructions: readonly unknown[];
    metadata: IdlMetadata;
    state?: unknown;
    types?: readonly unknown[];
}>;

export type SurfnetRegisterIdlApi = {
    registerIdl(idl: AnchorIdl, slot?: number): null;
};
