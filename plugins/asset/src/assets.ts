import type { Address } from '@solana/kit';

// ─── Well-Known Token Mints ─────────────────────────────────────────────────

export const MAINNET_TOKEN_MINTS = {
    bonk: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' as Address<'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'>,
    jitosol: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn' as Address<'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn'>,
    jupSOL: 'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v' as Address<'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v'>,
    msol: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So' as Address<'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'>,
    pyusd: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo' as Address<'2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo'>,
    usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address<'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'>,
    usdt: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' as Address<'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'>,
    wsol: 'So11111111111111111111111111111111111111112' as Address<'So11111111111111111111111111111111111111112'>,
} as const;

// ─── Well-Known Program IDs ─────────────────────────────────────────────────

export const PROGRAM_IDS = {
    associatedTokenProgram:
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address<'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'>,
    memoProgram:
        'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' as Address<'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'>,
    metadataProgram:
        'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>,
    systemProgram: '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>,
    tokenProgram:
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address<'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'>,
    tokenProgram2022:
        'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' as Address<'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'>,
} as const;

export const MAINNET_ASSETS = {
    ...MAINNET_TOKEN_MINTS,
    ...PROGRAM_IDS,
} as const;
