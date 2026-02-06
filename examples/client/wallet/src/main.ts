import { createSolanaClient } from '@kit-helpers/client';
import { autoDiscover, onWalletRegistered, type WalletConnector, type WalletStatus } from '@kit-helpers/wallet';
import { generateKeyPair, getAddressFromPublicKey, type ClusterUrl } from '@solana/kit';

// DOM elements
const statusEl = document.getElementById('status')!;
const addressEl = document.getElementById('address')!;
const balanceField = document.getElementById('balance-field')!;
const balanceEl = document.getElementById('balance')!;
const connectorsEl = document.getElementById('connectors')!;
const noWalletsEl = document.getElementById('no-wallets')!;
const disconnectBtn = document.getElementById('disconnect') as HTMLButtonElement;
const sendSection = document.getElementById('send-section')!;
const amountInput = document.getElementById('amount-input') as HTMLInputElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const sendResultEl = document.getElementById('send-result')!;
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

// Create client — wallet config gives us WalletSolanaClient (client.wallet is guaranteed)
const client = createSolanaClient({
    url: 'http://localhost:8899' as ClusterUrl,
    wsUrl: 'ws://localhost:8900',
    wallet: { connectors },
});

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

// Fetch and display SOL balance
async function refreshBalance() {
    if (client.wallet.state.status !== 'connected') return;
    try {
        const balance = await client.query.balance(client.wallet.state.session.account.address).fn();
        balanceEl.textContent = `${(Number(balance) / 1e9).toFixed(4)} SOL`;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        balanceEl.textContent = `Error`;
        log(`balance error: ${msg}`);
    }
}

// Update the UI based on wallet status
function updateUI(walletStatus: WalletStatus) {
    statusEl.textContent = walletStatus.status;

    switch (walletStatus.status) {
        case 'connected': {
            addressEl.textContent = walletStatus.session.account.address;
            disconnectBtn.classList.remove('hidden');
            sendSection.classList.remove('hidden');
            balanceField.classList.remove('hidden');
            connectorsEl.classList.add('hidden');
            noWalletsEl.style.display = 'none';
            sendResultEl.textContent = '';
            refreshBalance();
            break;
        }
        case 'connecting': {
            addressEl.textContent = '\u2026';
            disconnectBtn.classList.add('hidden');
            sendSection.classList.add('hidden');
            balanceField.classList.add('hidden');
            break;
        }
        case 'disconnected': {
            addressEl.textContent = '\u2014';
            balanceEl.textContent = '\u2014';
            disconnectBtn.classList.add('hidden');
            sendSection.classList.add('hidden');
            balanceField.classList.add('hidden');
            sendResultEl.textContent = '';
            connectorsEl.classList.remove('hidden');
            renderConnectors(client.wallet.connectors);
            break;
        }
        case 'error': {
            const errMsg =
                walletStatus.error instanceof Error ? walletStatus.error.message : String(walletStatus.error);
            addressEl.textContent = '\u2014';
            disconnectBtn.classList.add('hidden');
            sendSection.classList.add('hidden');
            balanceField.classList.add('hidden');
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
onWalletRegistered(connector => {
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

// Send SOL handler
sendBtn.addEventListener('click', async () => {
    if (client.wallet.state.status !== 'connected') return;

    try {
        sendBtn.disabled = true;
        sendResultEl.textContent = 'Sending...';

        const kp = await generateKeyPair();
        const destination = await getAddressFromPublicKey(kp.publicKey);
        const amount = BigInt(amountInput.value);

        const ix = client.program.system.transfer({ destination, amount });
        const sig = await client.action.send([ix]);

        sendResultEl.textContent = `Signature: ${sig}\nDestination: ${destination}`;
        log(`sent ${amount} lamports to ${destination}`);

        await refreshBalance();
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        sendResultEl.textContent = `Error: ${msg}`;
        log(`send error: ${msg}`);
    } finally {
        sendBtn.disabled = false;
    }
});
