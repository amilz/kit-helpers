import type { Address } from '@solana/kit';

import type { MAINNET_ASSETS, MAINNET_TOKEN_MINTS, PROGRAM_IDS } from './assets';

export type TokenMintMap = typeof MAINNET_TOKEN_MINTS;
export type ProgramIdMap = typeof PROGRAM_IDS;
export type BuiltInAssetMap = typeof MAINNET_ASSETS;

export type AssetNamespace<TCustom extends Record<string, Address> = Record<string, never>> = Readonly<
    BuiltInAssetMap &
        TCustom & {
            resolve(name: string): Address;
        }
>;

/** Error thrown by `resolve()` when the requested name is not found. */
export class UnknownAssetError extends Error {
    override name = 'UnknownAssetError' as const;

    constructor(assetName: string, availableNames: string[], options?: ErrorOptions) {
        super(`Unknown asset: "${assetName}". Available: ${availableNames.join(', ')}`, options);
    }
}

/** Error thrown when custom asset keys collide with built-in keys. */
export class AssetCollisionError extends Error {
    override name = 'AssetCollisionError' as const;

    constructor(collisions: string[], options?: ErrorOptions) {
        super(
            `Custom asset key(s) collide with built-in assets: ${collisions.join(', ')}. Use a different key name to avoid overriding built-in addresses.`,
            options,
        );
    }
}

/** Error thrown when a custom asset key uses a reserved name. */
export class AssetReservedNameError extends Error {
    override name = 'AssetReservedNameError' as const;

    constructor(reservedName: string, options?: ErrorOptions) {
        super(
            `"${reservedName}" is a reserved asset namespace property and cannot be used as a custom asset key.`,
            options,
        );
    }
}
