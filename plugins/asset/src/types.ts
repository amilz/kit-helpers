import type { Address } from '@solana/kit';

import type { MAINNET_ASSETS, MAINNET_TOKEN_MINTS, PROGRAM_IDS } from './assets';

export type TokenMintMap = typeof MAINNET_TOKEN_MINTS;
export type ProgramIdMap = typeof PROGRAM_IDS;
export type BuiltInAssetMap = typeof MAINNET_ASSETS;

export type AssetNamespace<TCustom extends Record<string, Address> = Record<string, never>> = BuiltInAssetMap &
    TCustom & {
        resolve(name: string): Address;
    };
