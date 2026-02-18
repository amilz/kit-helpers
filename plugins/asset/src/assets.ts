import { address } from '@solana/kit';

// ─── Well-Known Token Mints ─────────────────────────────────────────────────

export const MAINNET_TOKEN_MINTS = {
    bonk: address('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'),
    jitosol: address('J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn'),
    jupSOL: address('jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v'),
    msol: address('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'),
    pyusd: address('2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo'),
    usdc: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    usdt: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
    wsol: address('So11111111111111111111111111111111111111112'),
} as const;

// ─── Well-Known Program IDs ─────────────────────────────────────────────────

export const PROGRAM_IDS = {
    associatedTokenProgram: address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
    memoProgram: address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
    metadataProgram: address('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    systemProgram: address('11111111111111111111111111111111'),
    tokenProgram: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    tokenProgram2022: address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
} as const;

export const MAINNET_ASSETS = {
    ...MAINNET_TOKEN_MINTS,
    ...PROGRAM_IDS,
} as const;
