import { createEmptyClient } from '@solana/kit';
import {
    autoDiscover,
    onWalletRegistered,
    walletPlugin,
    type WalletConnector,
    type WalletStatus,
} from '@kit-helpers/wallet';

// DOM elements
const statusEl = document.getElementById('status')!;
const addressEl = document.getElementById('address')!;
const connectorsEl = document.getElementById('connectors')!;
const noWalletsEl = document.getElementById('no-wallets')!;
const disconnectBtn = document.getElementById('disconnect') as HTMLButtonElement;
const signSection = document.getElementById('sign-section')!;
const messageInput = document.getElementById('message-input') as HTMLInputElement;
const signBtn = document.getElementById('sign-btn') as HTMLButtonElement;
const signatureEl = document.getElementById('signature')!;
const logEl = document.getElementById('log')!;

// Logging
function log(msg: string) {
    const line = document.createElement('div');
    line.textContent = `> ${msg}`;
    logEl.prepend(line);
}

// Discover wallets
const connectors = autoDiscover();
log(`found ${connectors.length} connector(s)`);

// Create client with wallet plugin
const client = createEmptyClient().use(walletPlugin({ connectors }));

// Render a single connector button
function renderConnectorButton(connector: WalletConnector) {
    const btn = document.createElement('button');
    btn.className = 'connector-btn';
    btn.dataset.connectorId = connector.id;

    if (connector.icon) {
        const img = document.createElement('img');
        img.src = connector.icon;
        img.alt = connector.name;
        btn.appendChild(img);
    }

    btn.appendChild(document.createTextNode(connector.name));

    btn.addEventListener('click', () => handleConnect(connector.id));
    connectorsEl.appendChild(btn);
}

// Render all connector buttons
function renderConnectors(list: readonly WalletConnector[]) {
    connectorsEl.innerHTML = '';
    if (list.length === 0) {
        noWalletsEl.style.display = 'block';
    } else {
        noWalletsEl.style.display = 'none';
        for (const connector of list) {
            renderConnectorButton(connector);
        }
    }
}

// Update the UI based on wallet status
function updateUI(walletStatus: WalletStatus) {
    statusEl.textContent = walletStatus.status;

    switch (walletStatus.status) {
        case 'connected': {
            addressEl.textContent = walletStatus.session.account.address;
            disconnectBtn.classList.remove('hidden');
            signSection.classList.remove('hidden');
            connectorsEl.classList.add('hidden');
            noWalletsEl.style.display = 'none';
            break;
        }
        case 'connecting': {
            addressEl.textContent = '\u2026';
            disconnectBtn.classList.add('hidden');
            signSection.classList.add('hidden');
            break;
        }
        case 'disconnected': {
            addressEl.textContent = '\u2014';
            disconnectBtn.classList.add('hidden');
            signSection.classList.add('hidden');
            signatureEl.textContent = '\u2014';
            connectorsEl.classList.remove('hidden');
            renderConnectors(client.wallet.connectors);
            break;
        }
        case 'error': {
            const errMsg = walletStatus.error instanceof Error ? walletStatus.error.message : String(walletStatus.error);
            addressEl.textContent = '\u2014';
            disconnectBtn.classList.add('hidden');
            signSection.classList.add('hidden');
            connectorsEl.classList.remove('hidden');
            log(`error: ${errMsg}`);
            break;
        }
    }
}

// Subscribe to wallet status changes
client.wallet.subscribe((walletStatus: WalletStatus) => {
    log(`status: ${walletStatus.status}`);
    updateUI(walletStatus);
});

// Initial render
renderConnectors(client.wallet.connectors);

// Listen for late wallet registrations
onWalletRegistered((connector) => {
    log(`new wallet registered: ${connector.name}`);
    renderConnectorButton(connector);
    noWalletsEl.style.display = 'none';
});

// Connect handler
async function handleConnect(connectorId: string) {
    try {
        await client.wallet.connect(connectorId);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log(`connect error: ${msg}`);
    }
}

// Disconnect handler
disconnectBtn.addEventListener('click', async () => {
    await client.wallet.disconnect();
});

// Sign message handler
signBtn.addEventListener('click', async () => {
    if (client.wallet.status.status !== 'connected') return;

    const message = messageInput.value;
    if (!message) return;

    try {
        signBtn.disabled = true;
        const session = client.wallet.status.session;
        const sig = await session.signMessage(new TextEncoder().encode(message));
        // Convert SignatureBytes to hex for display
        const hex = Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
        signatureEl.textContent = hex;
        log(`signed message: "${message}"`);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        signatureEl.textContent = `Error: ${msg}`;
        log(`sign error: ${msg}`);
    } finally {
        signBtn.disabled = false;
    }
});
