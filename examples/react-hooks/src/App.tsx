import { address } from '@solana/kit';

import { useCounter, useCounterFromSeeds, useCounters } from './generated/hooks/counter';
import { useIncrement } from './generated/hooks/instructions/increment';
import { useCounterAddress } from './generated/hooks/pdas/counter';
import { useProgramCounter } from './generated/hooks/programs/counter';

const PLACEHOLDER_ADDRESS = address('11111111111111111111111111111111');

// Stub RPC / signer objects — hooks will fail at runtime (no validator),
// but we can verify they mount, initialize state, and expose the right API.
const rpc = {} as Parameters<typeof useCounter>[1]['rpc'];
const rpcSubscriptions = {} as Parameters<typeof useCounter>[1]['rpcSubscriptions'];
const signer = {} as Parameters<typeof useIncrement>[0]['signer'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #333', borderRadius: 8 }}>
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            {children}
        </section>
    );
}

function ProgramDemo() {
    const { programAddress, decodeError } = useProgramCounter();
    return (
        <Section title="useProgramCounter">
            <p>
                <strong>Program address:</strong> <code>{programAddress}</code>
            </p>
            <p>
                <strong>decodeError(0):</strong> <code>{decodeError(0) ?? 'undefined'}</code>
            </p>
            <p>
                <strong>decodeError(999):</strong> <code>{decodeError(999) ?? 'undefined'}</code>
            </p>
        </Section>
    );
}

function PdaAddressDemo() {
    const { address: pda, status, error } = useCounterAddress({ authority: PLACEHOLDER_ADDRESS });
    return (
        <Section title="useCounterAddress (PDA)">
            <p>
                <strong>Status:</strong> <code>{status}</code>
            </p>
            <p>
                <strong>Address:</strong> <code>{pda ?? 'null'}</code>
            </p>
            {error && (
                <p>
                    <strong>Error:</strong> <code>{error.message}</code>
                </p>
            )}
        </Section>
    );
}

function AccountDemo() {
    const { data, status, error } = useCounter(PLACEHOLDER_ADDRESS, { rpc, rpcSubscriptions });
    return (
        <Section title="useCounter (single account subscription)">
            <p>
                <strong>Status:</strong> <code>{status}</code>
            </p>
            <p>
                <strong>Data:</strong> <code>{data ? JSON.stringify(data) : 'null'}</code>
            </p>
            {error && (
                <p>
                    <strong>Error:</strong> <code>{error.message}</code>
                </p>
            )}
        </Section>
    );
}

function AccountFromSeedsDemo() {
    const {
        address: derived,
        data,
        status,
        error,
    } = useCounterFromSeeds({ authority: PLACEHOLDER_ADDRESS }, { rpc, rpcSubscriptions });
    return (
        <Section title="useCounterFromSeeds">
            <p>
                <strong>Status:</strong> <code>{status}</code>
            </p>
            <p>
                <strong>Derived address:</strong> <code>{derived ?? 'null'}</code>
            </p>
            <p>
                <strong>Data:</strong> <code>{data ? JSON.stringify(data) : 'null'}</code>
            </p>
            {error && (
                <p>
                    <strong>Error:</strong> <code>{error.message}</code>
                </p>
            )}
        </Section>
    );
}

function BatchDemo() {
    const { data, status, error } = useCounters([], { rpc });
    return (
        <Section title="useCounters (batch fetch, empty list)">
            <p>
                <strong>Status:</strong> <code>{status}</code>
            </p>
            <p>
                <strong>Data length:</strong> <code>{data.length}</code>
            </p>
            {error && (
                <p>
                    <strong>Error:</strong> <code>{error.message}</code>
                </p>
            )}
        </Section>
    );
}

function IncrementDemo() {
    const { send, status, error, signature } = useIncrement({ rpc, rpcSubscriptions, signer });
    return (
        <Section title="useIncrement (instruction hook)">
            <p>
                <strong>Status:</strong> <code>{status}</code>
            </p>
            <p>
                <strong>send available:</strong> <code>{typeof send === 'function' ? 'yes' : 'no'}</code>
            </p>
            <p>
                <strong>Signature:</strong> <code>{signature ?? 'null'}</code>
            </p>
            {error && (
                <p>
                    <strong>Error:</strong> <code>{error.message}</code>
                </p>
            )}
        </Section>
    );
}

export function App() {
    return (
        <div style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
            <h1>React Hooks Demo</h1>
            <p style={{ color: '#888' }}>
                Generated hooks from the <strong>counter</strong> Codama IDL. No validator is running — hooks that
                require RPC will show <code>loading</code> or <code>error</code> status, which demonstrates the state
                machine works correctly.
            </p>
            <ProgramDemo />
            <PdaAddressDemo />
            <AccountDemo />
            <AccountFromSeedsDemo />
            <BatchDemo />
            <IncrementDemo />
        </div>
    );
}
